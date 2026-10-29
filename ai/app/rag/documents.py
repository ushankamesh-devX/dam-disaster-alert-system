from __future__ import annotations

import json
import logging
import re
import uuid
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class DocumentChunk:
    chunk_id: str
    doc_id: str
    title: str
    category: str
    dam_id: int | None
    version: int
    text: str
    chunk_index: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class DocumentRecord:
    doc_id: str
    title: str
    category: str
    version: int
    dam_id: int | None
    chunk_count: int
    content: str
    created_at: str
    updated_at: str
    is_active: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class DocumentStore:
    """Manages versioned emergency documents, manuals, and text chunking for RAG."""

    def __init__(
        self,
        artifacts_dir: Path,
        minio_client: Any | None = None,
        qdrant_store: Any | None = None,
    ) -> None:
        self.artifacts_dir = Path(artifacts_dir)
        self.minio_client = minio_client
        self.qdrant_store = qdrant_store
        self.rag_dir = self.artifacts_dir / "rag"
        self.docs_dir = self.rag_dir / "documents"
        self.chunks_dir = self.rag_dir / "chunks"

        self.docs_dir.mkdir(parents=True, exist_ok=True)
        self.chunks_dir.mkdir(parents=True, exist_ok=True)

        self._documents: dict[str, DocumentRecord] = {}
        self._chunks: dict[str, DocumentChunk] = {}
        self._load_existing()

    def _load_existing(self) -> None:
        # Load documents
        for f in self.docs_dir.glob("*.json"):
            try:
                with f.open("r", encoding="utf-8") as fp:
                    data = json.load(fp)
                rec = DocumentRecord(**data)
                self._documents[rec.doc_id] = rec
            except Exception as e:
                logger.error("Failed loading document %s: %s", f, e)

        # Load chunks
        for f in self.chunks_dir.glob("*.json"):
            try:
                with f.open("r", encoding="utf-8") as fp:
                    data = json.load(fp)
                chunk = DocumentChunk(**data)
                self._chunks[chunk.chunk_id] = chunk
                # Sync into Qdrant if available
                if self.qdrant_store and chunk.doc_id in self._documents:
                    if self._documents[chunk.doc_id].is_active:
                        self.qdrant_store.upsert_chunk(
                            chunk_id=chunk.chunk_id,
                            doc_id=chunk.doc_id,
                            title=chunk.title,
                            category=chunk.category,
                            version=chunk.version,
                            dam_id=chunk.dam_id,
                            text=chunk.text,
                            chunk_index=chunk.chunk_index,
                        )
            except Exception as e:
                logger.error("Failed loading chunk %s: %s", f, e)

    def _split_into_chunks(self, text: str, max_chars: int = 500, overlap: int = 100) -> list[str]:
        """Splits content into coherent text passages with sliding overlap."""
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        chunks = []
        current_chunk = ""

        for p in paragraphs:
            if len(current_chunk) + len(p) <= max_chars:
                current_chunk = f"{current_chunk}\n\n{p}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                # If paragraph itself exceeds max_chars, split by sentences
                if len(p) > max_chars:
                    sentences = re.split(r"(?<=[.!?])\s+", p)
                    sub_chunk = ""
                    for s in sentences:
                        if len(sub_chunk) + len(s) <= max_chars:
                            sub_chunk = f"{sub_chunk} {s}".strip()
                        else:
                            if sub_chunk:
                                chunks.append(sub_chunk)
                            sub_chunk = s
                    if sub_chunk:
                        current_chunk = sub_chunk
                else:
                    current_chunk = p

        if current_chunk:
            chunks.append(current_chunk)

        return chunks if chunks else [text]

    def index_document(
        self,
        title: str,
        category: str,
        content: str,
        dam_id: int | None = None,
        doc_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> DocumentRecord:
        """Indexes or updates an operational document with automatic chunking and versioning."""
        now = datetime.now(UTC).isoformat()
        is_update = False
        version = 1

        if doc_id and doc_id in self._documents:
            existing = self._documents[doc_id]
            version = existing.version + 1
            is_update = True
            # Remove previous chunks for this document
            old_chunk_ids = [cid for cid, ch in self._chunks.items() if ch.doc_id == doc_id]
            for cid in old_chunk_ids:
                del self._chunks[cid]
                chunk_file = self.chunks_dir / f"{cid}.json"
                if chunk_file.exists():
                    chunk_file.unlink()
                if self.minio_client:
                    self.minio_client.delete_object(f"rag/chunks/{cid}.json")
            if self.qdrant_store:
                self.qdrant_store.delete_by_doc_id(doc_id)
        else:
            doc_id = doc_id or f"doc_{uuid.uuid4().hex[:8]}"

        raw_chunks = self._split_into_chunks(content)
        chunk_objects = []

        for idx, chunk_text in enumerate(raw_chunks):
            chunk_id = f"{doc_id}_c{idx}_v{version}"
            chunk = DocumentChunk(
                chunk_id=chunk_id,
                doc_id=doc_id,
                title=title,
                category=category,
                dam_id=dam_id,
                version=version,
                text=chunk_text,
                chunk_index=idx,
            )
            self._chunks[chunk_id] = chunk
            chunk_objects.append(chunk)

            # Save chunk to disk
            with (self.chunks_dir / f"{chunk_id}.json").open("w", encoding="utf-8") as fp:
                json.dump(chunk.to_dict(), fp, indent=2)

            # Sync to MinIO
            if self.minio_client:
                self.minio_client.put_json(f"rag/chunks/{chunk_id}.json", chunk.to_dict())

            # Upsert vector into Qdrant
            if self.qdrant_store:
                self.qdrant_store.upsert_chunk(
                    chunk_id=chunk_id,
                    doc_id=doc_id,
                    title=title,
                    category=category,
                    version=version,
                    dam_id=dam_id,
                    text=chunk_text,
                    chunk_index=idx,
                )

        record = DocumentRecord(
            doc_id=doc_id,
            title=title,
            category=category,
            version=version,
            dam_id=dam_id,
            chunk_count=len(chunk_objects),
            content=content,
            created_at=self._documents[doc_id].created_at if is_update else now,
            updated_at=now,
            is_active=True,
            metadata=metadata or {},
        )
        self._documents[doc_id] = record

        # Save document record to disk and MinIO
        with (self.docs_dir / f"{doc_id}.json").open("w", encoding="utf-8") as fp:
            json.dump(record.to_dict(), fp, indent=2)
        if self.minio_client:
            self.minio_client.put_json(f"rag/documents/{doc_id}.json", record.to_dict())

        logger.info(
            "Indexed document %s ('%s') v%d with %d chunks",
            doc_id,
            title,
            version,
            len(chunk_objects),
        )
        return record

    def get_document(self, doc_id: str) -> DocumentRecord | None:
        return self._documents.get(doc_id)

    def list_documents(
        self,
        category: str | None = None,
        dam_id: int | None = None,
        is_active: bool | None = True,
    ) -> list[DocumentRecord]:
        docs = list(self._documents.values())
        if is_active is not None:
            docs = [d for d in docs if d.is_active == is_active]
        if category:
            docs = [d for d in docs if d.category == category]
        if dam_id is not None:
            docs = [d for d in docs if d.dam_id is None or d.dam_id == dam_id]

        docs.sort(key=lambda d: d.updated_at, reverse=True)
        return docs

    def delete_document(self, doc_id: str) -> bool:
        """Deactivates a document and its chunks from retrieval."""
        doc = self._documents.get(doc_id)
        if doc is None:
            return False

        doc.is_active = False
        doc.updated_at = datetime.now(UTC).isoformat()
        with (self.docs_dir / f"{doc_id}.json").open("w", encoding="utf-8") as fp:
            json.dump(doc.to_dict(), fp, indent=2)
        if self.minio_client:
            self.minio_client.put_json(f"rag/documents/{doc_id}.json", doc.to_dict())

        # Remove points from Qdrant
        if self.qdrant_store:
            self.qdrant_store.delete_by_doc_id(doc_id)

        # Remove chunks from in-memory index
        chunk_ids = [cid for cid, ch in self._chunks.items() if ch.doc_id == doc_id]
        for cid in chunk_ids:
            if cid in self._chunks:
                del self._chunks[cid]
            if self.minio_client:
                self.minio_client.delete_object(f"rag/chunks/{cid}.json")

        logger.info("Deactivated document %s", doc_id)
        return True

    def get_active_chunks(self, dam_id: int | None = None) -> list[DocumentChunk]:
        """Returns all chunks from active documents compatible with dam_id."""
        active_doc_ids = {d.doc_id for d in self._documents.values() if d.is_active}
        chunks = [c for c in self._chunks.values() if c.doc_id in active_doc_ids]

        if dam_id is not None:
            # Include general documents (dam_id is None) and dam-specific documents
            chunks = [c for c in chunks if c.dam_id is None or c.dam_id == dam_id]

        return chunks
