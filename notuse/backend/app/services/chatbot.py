from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

from ..llm import LLMClient
from .rag import RAGService, RetrievedChunk


@dataclass(slots=True)
class ChatHistoryMessage:
    role: str
    content: str


class ChatbotService:
    """RAG-powered assistant that answers questions about PSA."""

    SYSTEM_PROMPT = (
        "You are PSA Connect, an assistant for PSA employees. "
        "Answer questions using the provided context extracted from internal knowledge. "
        "Be concise, factual, and mention when information is unavailable."
    )

    def __init__(self, llm: LLMClient, rag_service: RAGService):
        self._llm = llm
        self._rag = rag_service

    @staticmethod
    def _format_history(history: Sequence[ChatHistoryMessage] | None) -> str:
        if not history:
            return ""
        trimmed = history[-5:]
        return "\n".join(f"{item.role}: {item.content}" for item in trimmed)

    def answer(
        self,
        query: str,
        history: Sequence[ChatHistoryMessage] | None = None,
    ) -> tuple[str, List[RetrievedChunk]]:
        retrieved = self._rag.retrieve(query)
        if not retrieved:
            return (
                "I’m sorry, I could not find relevant information in the PSA knowledge base for that question.",
                [],
            )

        context = "\n\n".join(f"Context {idx + 1}: {chunk.content}" for idx, chunk in enumerate(retrieved))
        history_text = self._format_history(history)

        user_sections = [f"Context:\n{context}", f"Employee question: {query}"]
        if history_text:
            user_sections.insert(0, f"Recent conversation history:\n{history_text}")

        user_prompt = "\n\n".join(user_sections)

        answer = self._llm.chat(
            system_prompt=self.SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2,
        )
        return answer.strip(), retrieved
