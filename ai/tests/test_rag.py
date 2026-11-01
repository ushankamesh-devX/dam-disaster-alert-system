from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from app.common.config import Settings
from app.main import create_app
from app.rag.chat import RAGChatEngine
from app.rag.documents import DocumentStore
from app.rag.retrieval import RAGRetriever

INCOMING_TOKEN = "test-only-incoming-service-token-00000001"
OUTGOING_TOKEN = "test-only-spring-service-token-000000002"

SAMPLE_SOP_TEXT = """
Standard Operating Procedure for Dam Spillway Gate Operation:
When reservoir water level exceeds the minor flood threshold of 102.5 meters,
the primary operator must notify the Irrigation Department regional office immediately.
If inflow continues to rise above 250 cubic meters per second, initiate radial gate opening
in increments of 0.5 meters every 30 minutes.
Ensure emergency sirens at downstream monitoring stations are sounded 15 minutes
prior to gate discharge.
"""

SAMPLE_DAM_SPECS = """
Victoria Dam Technical Specifications:
Crest elevation is 438.0 meters above sea level.
Full supply level is 430.0 meters with total gross storage capacity of 722 million cubic meters.
Spillway consists of eight radial gates, each 12.8 meters wide and 9.1 meters high.
"""


def test_document_store_indexing_and_versioning(tmp_path: Path):
    store = DocumentStore(tmp_path)
    assert store.list_documents() == []

    # 1. Index document v1
    doc1 = store.index_document(
        title="Emergency Gate SOP",
        category="sop",
        content=SAMPLE_SOP_TEXT,
        dam_id=1,
    )
    assert doc1.version == 1
    assert doc1.chunk_count >= 1
    assert doc1.is_active

    # 2. Update document -> increments to v2
    updated = store.index_document(
        title="Emergency Gate SOP Revised",
        category="sop",
        content=SAMPLE_SOP_TEXT + "\nRevision Note: siren must sound 20 minutes prior.",
        dam_id=1,
        doc_id=doc1.doc_id,
    )
    assert updated.version == 2
    assert updated.doc_id == doc1.doc_id
    assert "Revision Note" in updated.content

    # 3. Retrieve document
    fetched = store.get_document(doc1.doc_id)
    assert fetched is not None
    assert fetched.version == 2

    # 4. Filter documents
    assert len(store.list_documents(category="sop")) == 1
    assert len(store.list_documents(category="unknown")) == 0
    assert len(store.list_documents(dam_id=1)) == 1

    # 5. Deactivate document
    assert store.delete_document(doc1.doc_id)
    assert len(store.list_documents(is_active=True)) == 0
    assert len(store.get_active_chunks(dam_id=1)) == 0


def test_rag_retriever_and_chat_engine(tmp_path: Path):
    store = DocumentStore(tmp_path)
    store.index_document(
        title="Emergency Gate SOP",
        category="sop",
        content=SAMPLE_SOP_TEXT,
        dam_id=1,
    )
    store.index_document(
        title="Victoria Specifications",
        category="specifications",
        content=SAMPLE_DAM_SPECS,
        dam_id=1,
    )

    retriever = RAGRetriever(store)

    # 1. Relevant search query
    results = retriever.search("spillway gate increment discharge", dam_id=1)
    assert len(results) > 0
    assert results[0].score > 0.05
    assert "radial gate opening" in results[0].text

    # 2. Chat engine with answer grounding
    engine = RAGChatEngine(retriever)
    chat_resp = engine.answer_query("How should spillway gates be operated?", dam_id=1)
    assert chat_resp.query == "How should spillway gates be operated?"
    assert len(chat_resp.sources) >= 1
    source_titles = [s.title for s in chat_resp.sources]
    assert "Emergency Gate SOP" in source_titles
    assert "0.5 meters" in chat_resp.answer

    # 3. Irrelevant query returns ungrounded fallback
    fallback_resp = engine.answer_query("What is the recipe for chocolate cake?", dam_id=1)
    assert len(fallback_resp.sources) == 0
    assert "No verified standard operating procedures" in fallback_resp.answer


def test_rag_api_endpoints(tmp_path: Path):
    config = Settings(
        _env_file=None,
        incoming_service_token=INCOMING_TOKEN,
        spring_service_token=OUTGOING_TOKEN,
        ml_artifacts_dir=tmp_path,
    )

    def mock_handler(req: httpx.Request):
        return httpx.Response(200, json={"data": []})

    transport = httpx.MockTransport(mock_handler)
    app = create_app(config, spring_transport=transport)

    with TestClient(app) as client:
        auth_header = {"Authorization": f"Bearer {INCOMING_TOKEN}"}

        # 1. Unauthenticated index document -> 401
        unauth = client.post(
            "/internal/rag/documents",
            json={"title": "Test SOP", "category": "sop", "content": "Sample content"},
        )
        assert unauth.status_code == 401

        # 2. Authenticated index document -> 201 Created
        resp = client.post(
            "/internal/rag/documents",
            headers=auth_header,
            json={
                "title": "Victoria Dam Action Plan",
                "category": "sop",
                "content": SAMPLE_SOP_TEXT,
                "dam_id": 1,
            },
        )
        assert resp.status_code == 201
        doc_data = resp.json()
        assert doc_data["title"] == "Victoria Dam Action Plan"
        doc_id = doc_data["doc_id"]

        # 3. List documents
        list_resp = client.get("/internal/rag/documents", headers=auth_header)
        assert list_resp.status_code == 200
        assert len(list_resp.json()) == 1

        # 4. Get document by ID
        get_resp = client.get(f"/internal/rag/documents/{doc_id}", headers=auth_header)
        assert get_resp.status_code == 200
        assert get_resp.json()["doc_id"] == doc_id

        # 5. RAG Chat endpoint
        chat_resp = client.post(
            "/internal/rag/chat",
            headers=auth_header,
            json={"query": "What is the minor flood threshold?", "dam_id": 1},
        )
        assert chat_resp.status_code == 200
        chat_data = chat_resp.json()
        assert len(chat_data["sources"]) >= 1
        assert "102.5" in chat_data["answer"]

        # 6. Deactivate document
        del_resp = client.delete(f"/internal/rag/documents/{doc_id}", headers=auth_header)
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "deactivated"
