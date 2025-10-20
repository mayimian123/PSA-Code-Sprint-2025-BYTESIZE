from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List

import numpy as np

from ..llm import LLMClient


@dataclass(slots=True)
class RetrievedChunk:
    content: str
    similarity: float


class RAGService:
    """A lightweight retrieval helper backed by TF-IDF cosine similarity."""

    def __init__(
        self,
        *,
        llm: LLMClient,
        source_path: Path,
        chunk_size: int = 600,
        chunk_overlap: int = 120,
        top_k: int = 4,
    ) -> None:
        self._llm = llm
        self._source_path = source_path
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._top_k = top_k

        self._documents = self._load_documents()
        self._embeddings: np.ndarray | None = None

    def _ensure_embeddings(self) -> None:
        if self._embeddings is not None:
            return
        vectors = self._llm.embed(self._documents)
        if not vectors:
            self._embeddings = np.empty((0, 0))
            return
        self._embeddings = np.array(vectors, dtype=float)

    def _load_documents(self) -> List[str]:
        text = self._source_path.read_text(encoding="utf-8")
        paragraphs = [paragraph.strip() for paragraph in text.split("\n\n") if paragraph.strip()]

        chunks: List[str] = []
        current: List[str] = []
        current_length = 0

        for paragraph in paragraphs:
            length = len(paragraph)
            if length >= self._chunk_size:
                if current:
                    chunks.append(" ".join(current))
                    current = []
                    current_length = 0
                chunks.append(paragraph)
                continue

            if current_length + length > self._chunk_size and current:
                chunks.append(" ".join(current))
                current = []
                current_length = 0

            current.append(paragraph)
            current_length += length + 1

        if current:
            chunks.append(" ".join(current))

        return chunks or [text]

    def retrieve(self, query: str, *, top_k: int | None = None) -> List[RetrievedChunk]:
        if not query.strip():
            return []

        self._ensure_embeddings()
        if self._embeddings is None or self._embeddings.size == 0:
            return []

        query_vector = np.array(self._llm.embed([query])[0], dtype=float)
        embeddings = self._embeddings
        query_norm = np.linalg.norm(query_vector)
        doc_norms = np.linalg.norm(embeddings, axis=1)
        denom = doc_norms * query_norm
        denom[denom == 0] = 1e-12
        scores = (embeddings @ query_vector) / denom
        indices = np.argsort(scores)[::-1]
        limit = top_k or self._top_k

        results: List[RetrievedChunk] = []
        for index in indices[:limit]:
            score = float(scores[index])
            if score <= 0:
                continue
            results.append(
                RetrievedChunk(content=self._documents[index], similarity=round(score, 4))
            )
        return results
