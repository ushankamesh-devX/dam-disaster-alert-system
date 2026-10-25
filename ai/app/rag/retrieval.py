from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.rag.documents import DocumentStore
from app.rag.qdrant_store import QdrantVectorStore

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    chunk_id: str
    doc_id: str
    title: str
    category: str
    version: int
    dam_id: int | None
    text: str
    score: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RAGRetriever:
    """Retrieves relevant operational passages using Qdrant vector search or TF-IDF fallback."""

    def __init__(
        self,
        doc_store: DocumentStore,
        qdrant_store: QdrantVectorStore | None = None,
    ) -> None:
        self.doc_store = doc_store
        self.qdrant_store = qdrant_store or getattr(doc_store, "qdrant_store", None)

    def search(
        self,
        query: str,
        dam_id: int | None = None,
        top_k: int = 4,
        min_score: float = 0.02,
    ) -> list[SearchResult]:
        """Searches active document passages authorized for the given dam."""
        # 1. Search via Qdrant vector database if available
        if self.qdrant_store is not None:
            q_results = self.qdrant_store.search(
                query=query,
                dam_id=dam_id,
                top_k=top_k,
                min_score=min_score,
            )
            active_doc_ids = {d.doc_id for d in self.doc_store.list_documents(is_active=True)}
            results = [
                SearchResult(
                    chunk_id=r.chunk_id,
                    doc_id=r.doc_id,
                    title=r.title,
                    category=r.category,
                    version=r.version,
                    dam_id=r.dam_id,
                    text=r.text,
                    score=r.score,
                )
                for r in q_results
                if not active_doc_ids or r.doc_id in active_doc_ids
            ]
            if results or not self.doc_store.get_active_chunks(dam_id=dam_id):
                return results

        # 2. In-memory TF-IDF cosine similarity fallback
        chunks = self.doc_store.get_active_chunks(dam_id=dam_id)
        if not chunks:
            return []

        corpus = [c.text for c in chunks]

        # Fit vectorizer on candidate passages
        vectorizer = TfidfVectorizer(
            stop_words="english",
            lowercase=True,
            ngram_range=(1, 2),
        )

        try:
            tfidf_matrix = vectorizer.fit_transform(corpus)
            query_vec = vectorizer.transform([query])
            scores = cosine_similarity(query_vec, tfidf_matrix).flatten()
        except ValueError:
            # e.g., query contains only stop words
            return []

        # Find top matches
        ranked_indices = np.argsort(scores)[::-1]
        results = []

        for idx in ranked_indices[:top_k]:
            score = float(scores[idx])
            if score < min_score:
                break
            chunk = chunks[idx]
            results.append(
                SearchResult(
                    chunk_id=chunk.chunk_id,
                    doc_id=chunk.doc_id,
                    title=chunk.title,
                    category=chunk.category,
                    version=chunk.version,
                    dam_id=chunk.dam_id,
                    text=chunk.text,
                    score=round(score, 4),
                )
            )

        return results
