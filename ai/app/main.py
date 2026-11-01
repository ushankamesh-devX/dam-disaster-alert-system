from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import APIRouter, BackgroundTasks, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app import __version__
from app.common.auth import authenticate_service
from app.common.config import Settings
from app.common.minio_client import MinioStorageClient
from app.common.spring_data import SpringDataClient, SpringDataUnavailable
from app.forecasting.inference import predict_forecast
from app.forecasting.jobs import JobManager, execute_retraining_task
from app.forecasting.monitoring import generate_monitoring_report
from app.forecasting.registry import ModelReleaseRegistry
from app.rag.chat import RAGChatEngine
from app.rag.documents import DocumentStore
from app.rag.qdrant_store import QdrantVectorStore
from app.rag.retrieval import RAGRetriever


class ActivateReleaseRequest(BaseModel):
    release_id: str | None = None
    action: str | None = None  # "activate" or "rollback"


class ForecastPredictRequest(BaseModel):
    dam_id: int
    as_of: datetime | None = None
    demo_mode: bool = False


class CreateJobRequest(BaseModel):
    job_type: str  # "train", "evaluate"
    parameters: dict[str, Any] = Field(default_factory=dict)


class IndexDocumentRequest(BaseModel):
    title: str
    category: str
    content: str
    dam_id: int | None = None
    doc_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RAGChatRequest(BaseModel):
    query: str
    dam_id: int | None = None
    user_role: str | None = None


def create_app(
    settings: Settings | None = None,
    *,
    spring_transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    config = settings if settings is not None else Settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        application.state.minio_client = MinioStorageClient(
            endpoint=config.minio_endpoint,
            access_key=(
                config.minio_access_key.get_secret_value() if config.minio_access_key else None
            ),
            secret_key=(
                config.minio_secret_key.get_secret_value() if config.minio_secret_key else None
            ),
            secure=config.minio_secure,
            default_bucket=config.minio_bucket,
            local_fallback_dir=config.ml_artifacts_dir,
        )
        gemini_key = (
            config.gemini_api_key.get_secret_value() if config.gemini_api_key else None
        )
        application.state.qdrant_store = QdrantVectorStore(
            url=config.qdrant_url,
            api_key=(config.qdrant_api_key.get_secret_value() if config.qdrant_api_key else None),
            collection_name=config.qdrant_collection,
            vector_size=config.embedding_dimension,
            gemini_api_key=gemini_key,
            embedding_model=config.embedding_model,
            in_memory=(config.qdrant_url is None),
        )
        application.state.release_registry = ModelReleaseRegistry(
            config.ml_artifacts_dir, storage_client=application.state.minio_client
        )
        application.state.job_manager = JobManager(config.ml_artifacts_dir)
        application.state.doc_store = DocumentStore(
            config.ml_artifacts_dir,
            minio_client=application.state.minio_client,
            qdrant_store=application.state.qdrant_store,
        )
        application.state.retriever = RAGRetriever(
            application.state.doc_store,
            qdrant_store=application.state.qdrant_store,
        )
        application.state.rag_engine = RAGChatEngine(
            application.state.retriever,
            gemini_api_key=gemini_key,
            chat_model=config.chat_model,
            spring_base_url=str(config.spring_data_base_url),
            spring_service_token=config.spring_service_token.get_secret_value() if config.spring_service_token else None,
        )
        headers = {}
        if config.spring_service_token is not None:
            headers["Authorization"] = f"Bearer {config.spring_service_token.get_secret_value()}"
        async with httpx.AsyncClient(
            base_url=str(config.spring_data_base_url).rstrip("/") + "/",
            headers=headers,
            timeout=config.spring_timeout_seconds,
            follow_redirects=False,
            transport=spring_transport,
        ) as client:
            application.state.spring_data = SpringDataClient(client, config)
            yield

    application = FastAPI(
        title="DDAS AI Backend",
        description="Water-level forecasting, overflow probability, and future RAG.",
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs" if config.enable_docs else None,
        redoc_url=None,
        openapi_url="/openapi.json" if config.enable_docs else None,
    )
    application.state.release_registry = ModelReleaseRegistry(config.ml_artifacts_dir)
    application.state.job_manager = JobManager(config.ml_artifacts_dir)
    application.state.doc_store = DocumentStore(config.ml_artifacts_dir)
    application.state.retriever = RAGRetriever(application.state.doc_store)
    application.state.rag_engine = RAGChatEngine(
        application.state.retriever,
        gemini_api_key=config.gemini_api_key.get_secret_value() if config.gemini_api_key else None,
        chat_model=config.chat_model,
        spring_base_url=str(config.spring_data_base_url),
        spring_service_token=config.spring_service_token.get_secret_value() if config.spring_service_token else None,
    )
    public_paths = {"/health/live", "/health/ready"}
    if config.enable_docs:
        public_paths.update({"/docs", "/docs/oauth2-redirect", "/openapi.json"})

    def is_public_path(path: str) -> bool:
        if path in public_paths:
            return True
        if path.startswith("/v1/dams/") and path.endswith("/forecast-summary"):
            return True
        return False

    @application.middleware("http")
    async def service_authentication(request: Request, call_next):
        if not is_public_path(request.url.path):
            rejection = authenticate_service(request, config)
            if rejection is not None:
                return rejection
        return await call_next(request)

    @application.get("/health/live", tags=["Health"])
    async def liveness():
        return {"status": "up"}

    @application.get("/health/ready", tags=["Health"])
    async def readiness(request: Request):
        if config.incoming_service_token is None:
            return JSONResponse(status_code=503, content={"status": "not_ready"})
        try:
            await request.app.state.spring_data.get_dams()
        except SpringDataUnavailable:
            return JSONResponse(status_code=503, content={"status": "not_ready"})
        return {"status": "ready"}

    @application.get("/v1/dams/{id}/forecast-summary", tags=["Public"])
    async def public_forecast_summary(request: Request, id: int):
        """Published forecast summary for dashboard/public consumption without inference."""
        try:
            return await request.app.state.spring_data.get_forecasts(id, limit=3)
        except SpringDataUnavailable as exc:
            raise HTTPException(status_code=503, detail="Forecast service is unavailable") from exc

    internal = APIRouter(prefix="/internal", tags=["Internal"])

    @internal.get("/service/status")
    async def service_status(request: Request):
        active_rel = None
        if hasattr(request.app.state, "release_registry"):
            active_rel = request.app.state.release_registry.get_active_release()

        forecasting_state = "active" if active_rel is not None else "not_implemented"
        active_id = active_rel.release_id if active_rel is not None else None

        minio_connected = False
        if hasattr(request.app.state, "minio_client"):
            minio_connected = request.app.state.minio_client.is_connected()

        return {
            "service": "ddas-ai",
            "version": __version__,
            "features": {
                "forecasting": forecasting_state,
                "rag": "active",
            },
            "vector_store": "qdrant",
            "object_storage": "minio" if minio_connected else "local_disk",
            "active_release": active_id,
        }

    @internal.get("/ml/releases")
    async def list_releases(request: Request):
        """Lists registered candidate and active model releases."""
        registry: ModelReleaseRegistry = request.app.state.release_registry
        releases = registry.list_releases()
        return [r.to_dict() for r in releases]

    @internal.get("/ml/active-release")
    async def get_active_release(request: Request):
        """Returns the currently active release metadata."""
        registry: ModelReleaseRegistry = request.app.state.release_registry
        active = registry.get_active_release()
        if active is None:
            raise HTTPException(status_code=404, detail="No active release loaded")
        return active.to_dict()

    @internal.put("/ml/active-release")
    async def update_active_release(request: Request, body: ActivateReleaseRequest):
        """Activates a model release or triggers a rollback."""
        registry: ModelReleaseRegistry = request.app.state.release_registry
        try:
            if body.action == "rollback":
                activated = registry.rollback_release()
            elif body.release_id:
                activated = registry.activate_release(body.release_id)
            else:
                raise HTTPException(
                    status_code=422, detail="Provide release_id or action='rollback'"
                )
            return activated.to_dict()
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except ValueError as e:
            raise HTTPException(status_code=409, detail=str(e)) from e

    @internal.post("/forecasts/predict")
    async def predict_forecast_endpoint(request: Request, body: ForecastPredictRequest):
        """Performs 1h, 3h, 6h multi-quantile level and overflow probability prediction."""
        as_of = body.as_of or datetime.now(UTC)
        if as_of.tzinfo is None:
            as_of = as_of.replace(tzinfo=UTC)
        try:
            res = await predict_forecast(
                dam_id=body.dam_id,
                as_of=as_of,
                demo_mode=body.demo_mode,
                registry=request.app.state.release_registry,
                client=request.app.state.spring_data,
            )
            return res.to_dict()
        except SpringDataUnavailable as exc:
            raise HTTPException(status_code=503, detail="Spring data API is unavailable") from exc

    @internal.post("/ml/jobs", status_code=202)
    async def create_job(
        request: Request, body: CreateJobRequest, background_tasks: BackgroundTasks
    ):
        """Queues an asynchronous ML retraining or evaluation job."""
        job_manager: JobManager = request.app.state.job_manager
        try:
            job = job_manager.create_job(body.job_type, body.parameters)
        except ValueError as e:
            raise HTTPException(status_code=409, detail=str(e)) from e

        if body.job_type == "train":
            artifacts_dir = config.ml_artifacts_dir
            params = body.parameters or {}

            async def _run():
                from app.forecasting.training import train_and_evaluate_release
                from tests.test_modeling_and_release import make_synthetic_dataset

                df = make_synthetic_dataset(150)
                feature_cols = [
                    c
                    for c in df.columns
                    if not c.startswith("target_") and c not in ["timestamp", "dam_id"]
                ]
                await execute_retraining_task(
                    job_id=job.job_id,
                    job_manager=job_manager,
                    train_func=train_and_evaluate_release,
                    df=df,
                    feature_cols=feature_cols,
                    artifacts_dir=artifacts_dir,
                    dataset_version=params.get("dataset_version", "1.0.0"),
                    dataset_sha256="retrain_sha",
                    iterations=params.get("iterations", 30),
                    use_mlflow=params.get("use_mlflow", config.enable_mlflow_auto_tracking),
                    mlflow_tracking_uri=config.mlflow_tracking_uri,
                )
                retrain_res = job_manager.get_job(job.job_id)
                if retrain_res and retrain_res.result and "release_id" in retrain_res.result:
                    rel_id = retrain_res.result["release_id"]
                    if hasattr(request.app.state, "release_registry"):
                        request.app.state.release_registry.sync_release_to_storage(rel_id)

            background_tasks.add_task(_run)

        return {
            "job_id": job.job_id,
            "status": job.status,
            "message": job.message,
            "created_at": job.created_at,
        }

    @internal.get("/ml/jobs")
    async def list_jobs(request: Request):
        """Lists recent ML jobs."""
        job_manager: JobManager = request.app.state.job_manager
        return [j.to_dict() for j in job_manager.list_jobs()]

    @internal.get("/ml/jobs/{id}")
    async def get_job(request: Request, id: str):
        """Fetches status and progress of an ML job."""
        job_manager: JobManager = request.app.state.job_manager
        job = job_manager.get_job(id)
        if job is None:
            raise HTTPException(status_code=404, detail=f"Job {id} not found")
        return job.to_dict()

    @internal.get("/ml/monitoring")
    async def get_monitoring(request: Request):
        """Aggregates active release health, data freshness, job status, and accuracy metrics."""
        report = await generate_monitoring_report(
            registry=request.app.state.release_registry,
            client=request.app.state.spring_data,
            job_manager=request.app.state.job_manager,
        )
        return report.to_dict()

    @internal.post("/rag/documents", status_code=201)
    async def index_document_endpoint(request: Request, body: IndexDocumentRequest):
        """Indexes or versions an emergency manual, dam SOP, or engineering specification."""
        store: DocumentStore = request.app.state.doc_store
        rec = store.index_document(
            title=body.title,
            category=body.category,
            content=body.content,
            dam_id=body.dam_id,
            doc_id=body.doc_id,
            metadata=body.metadata,
        )
        return rec.to_dict()

    @internal.post("/rag/documents/upload-pdf", status_code=201)
    async def upload_pdf_endpoint(
        request: Request,
        file: UploadFile = File(...),
        title: str = Form(...),
        category: str = Form("sop"),
        dam_id: int | None = Form(None),
        doc_id: str | None = Form(None),
    ):
        """Extracts text from an uploaded PDF and indexes it into the vector store."""
        import io
        from pypdf import PdfReader

        content_bytes = await file.read()
        try:
            reader = PdfReader(io.BytesIO(content_bytes))
            extracted_pages = []
            for idx, page in enumerate(reader.pages, 1):
                p_text = page.extract_text() or ""
                if p_text.strip():
                    extracted_pages.append(f"--- Page {idx} ---\n{p_text.strip()}")
            text = "\n\n".join(extracted_pages)
            if not text.strip():
                raise HTTPException(status_code=400, detail="No extractable text found in PDF")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed parsing PDF: {e}") from e

        store: DocumentStore = request.app.state.doc_store
        metadata = {
            "fileName": file.filename,
            "pageCount": len(reader.pages),
            "fileSize": len(content_bytes),
        }
        rec = store.index_document(
            title=title,
            category=category,
            content=text,
            dam_id=dam_id,
            doc_id=doc_id,
            metadata=metadata,
        )
        return rec.to_dict()

    @internal.get("/rag/documents")
    async def list_documents_endpoint(
        request: Request,
        category: str | None = None,
        dam_id: int | None = None,
        is_active: bool | None = True,
    ):
        """Lists registered documents with optional category and dam filtering."""
        store: DocumentStore = request.app.state.doc_store
        docs = store.list_documents(category=category, dam_id=dam_id, is_active=is_active)
        return [d.to_dict() for d in docs]

    @internal.get("/rag/documents/{id}")
    async def get_document_endpoint(request: Request, id: str):
        """Fetches document metadata, version history, and full content."""
        store: DocumentStore = request.app.state.doc_store
        doc = store.get_document(id)
        if doc is None:
            raise HTTPException(status_code=404, detail=f"Document {id} not found")
        return doc.to_dict()

    @internal.delete("/rag/documents/{id}")
    async def delete_document_endpoint(request: Request, id: str):
        """Deactivates a document and removes its passages from retrieval."""
        store: DocumentStore = request.app.state.doc_store
        success = store.delete_document(id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Document {id} not found")
        return {"status": "deactivated", "doc_id": id}

    @internal.post("/rag/chat")
    async def rag_chat_endpoint(request: Request, body: RAGChatRequest):
        """Grounded retrieval-augmented chat over verified dam manuals and emergency procedures."""
        engine: RAGChatEngine = request.app.state.rag_engine
        resp = engine.answer_query(
            query=body.query,
            dam_id=body.dam_id,
            user_role=body.user_role,
        )
        return resp.to_dict()

    @internal.get("/data/dams")
    async def data_dams(request: Request):
        """Protected integration check; fetches the stored dam list from Spring Boot."""
        try:
            return await request.app.state.spring_data.get_dams()
        except SpringDataUnavailable as exc:
            raise HTTPException(status_code=503, detail="Spring data API is unavailable") from exc

    application.include_router(internal)

    # Authentication is enforced by middleware and documented for protected operations.
    original_openapi = application.openapi

    def openapi_with_service_auth():
        schema = original_openapi()
        schema.setdefault("components", {}).setdefault("securitySchemes", {})["ServiceBearer"] = {
            "type": "http",
            "scheme": "bearer",
            "description": "Incoming service token configured for the trusted Spring Boot caller.",
        }
        for path, operations in schema["paths"].items():
            if not is_public_path(path):
                for method, operation in operations.items():
                    if method in {"get", "post", "put", "patch", "delete", "options", "head"}:
                        operation["security"] = [{"ServiceBearer": []}]
        return schema

    application.openapi = openapi_with_service_auth
    return application


app = create_app()
