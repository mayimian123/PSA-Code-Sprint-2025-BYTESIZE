from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
import re
from typing import List, Sequence

from ..clients import OpenAIClient


@dataclass
class RetrievedChunk:
    content: str
    similarity: float


class RAGService:
    """Simple retrieval augmented generation helper for the PSA knowledge base."""

    def __init__(
        self,
        *,
        client: OpenAIClient,
        source_path: Path,
        chunk_size: int = 700,
        chunk_overlap: int = 150,
        top_k: int = 4,
    ):
        self._client = client
        self._source_path = source_path
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._top_k = top_k
        self._documents: List[str] = []
        self._embeddings: List[List[float]] | None = None

    def _normalise_text(self, text: str) -> str:
        """Collapse whitespace so chunking works on consistent spacing."""
        cleaned = text.replace("\r\n", "\n").strip()
        # Preserve paragraph breaks as markers we can later respect.
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return re.sub(r"[ \t]+", " ", cleaned)

    def _chunk_text(self, text: str) -> List[str]:
        """Split the corpus into overlapping chunks of approximately chunk_size characters."""
        normalised = self._normalise_text(text)
        if not normalised:
            return []

        size = max(200, self._chunk_size)
        overlap = max(0, min(self._chunk_overlap, size - 1))

        chunks: List[str] = []
        start = 0
        length = len(normalised)

        while start < length:
            end = min(length, start + size)
            chunk = normalised[start:end]

            if end < length:
                boundary = max(
                    chunk.rfind(". "),
                    chunk.rfind("? "),
                    chunk.rfind("! "),
                    chunk.rfind("\n"),
                )
                if boundary >= size * 0.6:
                    end = start + boundary + 1
                    chunk = normalised[start:end]

            chunk = chunk.strip()
            if chunk:
                chunks.append(chunk)

            if end >= length:
                break

            next_start = end - overlap
            if next_start <= start:
                next_start = end
            start = next_start

        return chunks

    def _load_documents(self) -> List[str]:
        """Load and chunk the knowledge base source file."""
        if self._documents:
            return self._documents

        text = self._source_path.read_text(encoding="utf-8")
        self._documents = self._chunk_text(text)
        return self._documents

    def _ensure_embeddings(self) -> None:
        """确保所有文档块都有对应的嵌入向量"""
        if self._embeddings is not None:
            return
        
        documents = self._load_documents()
        try:
            # 批量获取嵌入向量
            self._embeddings = self._client.create_embedding(documents)
            print(f"Successfully created embeddings for {len(documents)} chunks")
        except Exception as e:
            print(f"Error creating embeddings: {e}")
            self._embeddings = []

    def _cosine_similarity(self, a: Sequence[float], b: Sequence[float]) -> float:
        """计算两个向量的余弦相似度"""
        dot_product = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)

    def retrieve(self, query: str, top_k: int | None = None) -> List[RetrievedChunk]:
        """检索与查询最相关的文档块"""
        self._ensure_embeddings()
        if not self._embeddings:
            print("No embeddings available")
            return []

        try:
            # 获取查询的嵌入向量
            query_embedding = self._client.create_embedding([query])[0]
            
            # 计算相似度并排序
            rankings: List[RetrievedChunk] = []
            for chunk, embedding in zip(self._load_documents(), self._embeddings):
                score = self._cosine_similarity(query_embedding, embedding)
                rankings.append(RetrievedChunk(content=chunk, similarity=score))

            # 按相似度排序
            rankings.sort(key=lambda item: item.similarity, reverse=True)
            
            # 返回top_k个结果
            limit = top_k or self._top_k
            return rankings[:limit]
            
        except Exception as e:
            print(f"Error during retrieval: {e}")
            return []
