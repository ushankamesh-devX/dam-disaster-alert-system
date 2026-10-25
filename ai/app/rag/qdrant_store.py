from __future__ import annotations

import logging
import re
import uuid
from dataclasses import dataclass
from typing import Any

import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)
from sklearn.feature_extraction.text import HashingVectorizer

logger = logging.getLogger(__name__)


class DenseTextEmbedder:
    """Produces fixed-dimension, normalized dense embeddings for Qdrant vector search."""

    def __init__(
        self,
        dimension: int = 768,
        gemini_api_key: str | None = None,
        embedding_model: str = "text-embedding-004",
    ) -> None:
        self.dimension = dimension
        self.gemini_api_key = gemini_api_key
        self.embedding_model = embedding_model
        self._genai_client = None

        if gemini_api_key:
            try:
                from google import genai

                self._genai_client = genai.Client(api_key=gemini_api_key)
                logger.info("Initialized Google GenAI client for embeddings (%s)", embedding_model)
            except Exception as e:
                logger.warning("Could not initialize google-genai client: %s; using local embedder", e)

        self._vectorizer = HashingVectorizer(
            n_features=dimension,
            norm="l2",
            stop_words="english",
            alternate_sign=False,
            ngram_range=(1, 2),
        )

    def _preprocess(self, text: str) -> str:
        tokens = []
        for word in re.findall(r"\b[a-zA-Z0-9_-]+\b", text.lower()):
            normalized = re.sub(r"^(.*?)(ingly|edly|tions|tion|ing|ed|es|s)$", r"\1", word)
            tokens.append(normalized if len(normalized) >= 2 else word)
        return " ".join(tokens)

    def embed(self, text: str) -> list[float]:
        if self._genai_client:
            try:
                from google.genai import types

                cfg = (
                    types.EmbedContentConfig(output_dimensionality=self.dimension)
                    if self.dimension
                    else None
                )
                response = self._genai_client.models.embed_content(
                    model=self.embedding_model,
                    contents=text,
                    config=cfg,
                )
                if hasattr(response, "embedding") and response.embedding and response.embedding.values:
                    return [float(x) for x in response.embedding.values]
                if hasattr(response, "embeddings") and response.embeddings and len(response.embeddings) > 0:
                    return [float(x) for x in response.embeddings[0].values]
            except Exception as e:
                logger.warning("Gemini embedding failed: %s; falling back to local embedder", e)

        cleaned = self._preprocess(text)
        vec = self._vectorizer.transform([cleaned]).toarray()[0]
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return [float(x) for x in vec]


@dataclass
class QdrantSearchResult:
    chunk_id: str
    doc_id: str
    title: str
    category: str
    version: int
    dam_id: int | None
    text: str
    score: float


class QdrantVectorStore:
    """Manages document vector embeddings in Qdrant with payload filtering."""

    def __init__(
        self,
        url: str | None = None,
        api_key: str | None = None,
        collection_name: str = "ddas_rag_documents",
        vector_size: int = 768,
        gemini_api_key: str | None = None,
        embedding_model: str = "text-embedding-004",
        in_memory: bool = False,
    ) -> None:
        self.collection_name = collection_name
        self.vector_size = vector_size
        self.embedder = DenseTextEmbedder(
            dimension=vector_size,
            gemini_api_key=gemini_api_key,
            embedding_model=embedding_model,
        )

        if in_memory or not url:
            self.client = QdrantClient(":memory:")
            logger.info("Initialized in-memory Qdrant client for collection: %s", collection_name)
        else:
            self.client = QdrantClient(url=url, api_key=api_key, check_compatibility=False)
            logger.info("Connected to remote Qdrant at %s for collection: %s", url, collection_name)

        self._ensure_collection()

    def _ensure_collection(self) -> None:
        try:
            if not self.client.collection_exists(self.collection_name):
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
                )
                logger.info("Created Qdrant collection: %s", self.collection_name)
        except Exception as e:
            logger.error("Failed ensuring Qdrant collection %s: %s", self.collection_name, e)

    def upsert_chunk(
        self,
        chunk_id: str,
        doc_id: str,
        title: str,
        category: str,
        version: int,
        dam_id: int | None,
        text: str,
        chunk_index: int = 0,
    ) -> None:
        """Embeds and upserts a document text chunk into Qdrant."""
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))
        vector = self.embedder.embed(text)
        payload: dict[str, Any] = {
            "chunk_id": chunk_id,
            "doc_id": doc_id,
            "title": title,
            "category": category,
            "version": version,
            "dam_id": dam_id,
            "is_global": dam_id is None,
            "chunk_index": chunk_index,
            "text": text,
        }
        self.client.upsert(
            collection_name=self.collection_name,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )

    def delete_chunk(self, chunk_id: str) -> None:
        """Deletes a specific chunk vector by its chunk ID."""
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))
        self.client.delete(collection_name=self.collection_name, points_selector=[point_id])

    def delete_by_doc_id(self, doc_id: str) -> None:
        """Deletes all chunks belonging to a document ID."""
        flt = Filter(must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))])
        self.client.delete(collection_name=self.collection_name, points_selector=flt)

    def search(
        self,
        query: str,
        dam_id: int | None = None,
        top_k: int = 4,
        min_score: float = 0.02,
    ) -> list[QdrantSearchResult]:
        """Performs vector similarity search in Qdrant with dam access filtering."""
        query_vec = self.embedder.embed(query)

        query_filter: Filter | None = None
        if dam_id is not None:
            query_filter = Filter(
                should=[
                    FieldCondition(key="dam_id", match=MatchValue(value=dam_id)),
                    FieldCondition(key="is_global", match=MatchValue(value=True)),
                ]
            )

        try:
            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vec,
                query_filter=query_filter,
                score_threshold=min_score,
                limit=top_k,
            )
        except Exception as e:
            logger.error("Qdrant query failed: %s", e)
            return []

        search_results = []
        for point in results.points:
            p = point.payload or {}
            search_results.append(
                QdrantSearchResult(
                    chunk_id=p.get("chunk_id", ""),
                    doc_id=p.get("doc_id", ""),
                    title=p.get("title", ""),
                    category=p.get("category", ""),
                    version=p.get("version", 1),
                    dam_id=p.get("dam_id"),
                    text=p.get("text", ""),
                    score=round(float(point.score), 4),
                )
            )
        return search_results
