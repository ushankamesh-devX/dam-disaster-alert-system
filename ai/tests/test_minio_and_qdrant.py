from pathlib import Path

from app.common.minio_client import MinioStorageClient
from app.rag.chat import RAGChatEngine
from app.rag.documents import DocumentStore
from app.rag.qdrant_store import DenseTextEmbedder, QdrantVectorStore
from app.rag.retrieval import RAGRetriever

SAMPLE_EAP_TEXT = """
Emergency Action Plan for Victoria Dam Spillway:
In the event of continuous heavy inflow exceeding 300 cubic meters per second,
the resident engineer must initiate controlled radial gate opening in increments of 0.5 meters.
Sound downstream sirens at Mahaweli river stations 15 minutes before opening.
"""

SAMPLE_GLOBAL_SOP = """
General Hydrological Warning Guidelines:
All dam operators must log sensor telemetry hourly and cross-check automated gauges
against physical staff gauges when reservoir elevation approaches warning levels.
"""


def test_minio_storage_client_local_fallback(tmp_path: Path):
    client = MinioStorageClient(
        endpoint=None,
        default_bucket="test-bucket",
        local_fallback_dir=tmp_path,
    )
    assert not client.is_connected()

    # 1. Put and get JSON
    payload = {"version": 1, "status": "active", "parameters": {"horizon": 3}}
    assert client.put_json("test_dir/sample.json", payload)
    retrieved = client.get_json("test_dir/sample.json")
    assert retrieved == payload

    # 2. Put and get File
    src_file = tmp_path / "model.bin"
    src_file.write_bytes(b"dummy-model-binary-data")
    assert client.put_file("models/model.bin", src_file)

    dest_file = tmp_path / "downloaded_model.bin"
    assert client.get_file("models/model.bin", dest_file)
    assert dest_file.read_bytes() == b"dummy-model-binary-data"

    # 3. List objects
    objects = client.list_objects("test_dir")
    assert any("sample.json" in obj for obj in objects)

    # 4. Delete object
    assert client.delete_object("test_dir/sample.json")
    assert client.get_json("test_dir/sample.json") is None


def test_qdrant_vector_store_operations():
    store = QdrantVectorStore(
        collection_name="test_ddas_collection",
        vector_size=4096,
        in_memory=True,
    )

    # 1. Test DenseTextEmbedder
    embedder = DenseTextEmbedder(dimension=4096)
    vec1 = embedder.embed("radial gate opening procedure")
    vec2 = embedder.embed("chocolate cake pastry recipe")
    assert len(vec1) == 4096
    assert len(vec2) == 4096
    assert vec1 != vec2

    # 2. Upsert dam-specific and global chunks
    store.upsert_chunk(
        chunk_id="chk_vic_01",
        doc_id="doc_vic_eap",
        title="Victoria EAP",
        category="eap",
        version=1,
        dam_id=1,
        text=SAMPLE_EAP_TEXT,
    )
    store.upsert_chunk(
        chunk_id="chk_rand_01",
        doc_id="doc_rand_eap",
        title="Randenigala EAP",
        category="eap",
        version=1,
        dam_id=2,
        text="Randenigala gate release guidelines: discharge maximum 150 cumecs.",
    )
    store.upsert_chunk(
        chunk_id="chk_global_01",
        doc_id="doc_global_sop",
        title="General Guidelines",
        category="guidelines",
        version=1,
        dam_id=None,  # Global
        text=SAMPLE_GLOBAL_SOP,
    )

    # 3. Query for Dam 1: should return Victoria EAP and Global Guidelines, but NOT Randenigala
    results_dam1 = store.search("radial gate opening inflow siren", dam_id=1, top_k=5)
    assert len(results_dam1) > 0
    doc_ids_dam1 = [r.doc_id for r in results_dam1]
    assert "doc_vic_eap" in doc_ids_dam1
    assert "doc_rand_eap" not in doc_ids_dam1

    # 4. Irrelevant query returns empty due to score threshold
    results_irrelevant = store.search("how to bake chocolate brownies", dam_id=1, min_score=0.05)
    assert len(results_irrelevant) == 0

    # 5. Delete by doc ID
    store.delete_by_doc_id("doc_vic_eap")
    results_after_del = store.search("radial gate opening inflow siren", dam_id=1)
    doc_ids_after = [r.doc_id for r in results_after_del]
    assert "doc_vic_eap" not in doc_ids_after


def test_document_store_and_rag_integration_with_qdrant_and_minio(tmp_path: Path):
    minio = MinioStorageClient(endpoint=None, local_fallback_dir=tmp_path)
    qdrant = QdrantVectorStore(collection_name="integration_rag", in_memory=True)

    doc_store = DocumentStore(
        artifacts_dir=tmp_path,
        minio_client=minio,
        qdrant_store=qdrant,
    )

    # 1. Index document
    rec = doc_store.index_document(
        title="Victoria Emergency Action Plan",
        category="eap",
        content=SAMPLE_EAP_TEXT,
        dam_id=1,
    )
    assert rec.version == 1

    # Verify JSON written to MinIO local fallback
    assert (tmp_path / "rag" / "documents" / f"{rec.doc_id}.json").exists()

    # 2. Query through RAGRetriever backed by Qdrant
    retriever = RAGRetriever(doc_store, qdrant_store=qdrant)
    search_res = retriever.search("radial gate opening siren", dam_id=1)
    assert len(search_res) >= 1
    assert search_res[0].doc_id == rec.doc_id

    # 3. Grounded chat
    chat_engine = RAGChatEngine(retriever)
    chat_resp = chat_engine.answer_query("When should downstream sirens be sounded?", dam_id=1)
    assert len(chat_resp.sources) >= 1
    assert "15 minutes" in chat_resp.answer
    assert any(s.doc_id == rec.doc_id for s in chat_resp.sources)

    # 4. Soft deletion removes from Qdrant and active retrieval
    assert doc_store.delete_document(rec.doc_id)
    post_del_res = retriever.search("radial gate opening siren", dam_id=1)
    assert len(post_del_res) == 0

