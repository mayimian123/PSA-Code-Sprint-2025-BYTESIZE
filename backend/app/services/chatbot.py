from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

from ..clients import OpenAIClient
from .rag import RAGService, RetrievedChunk


@dataclass
class ChatHistoryMessage:
    role: str
    content: str


class ChatbotService:
    """Chatbot that combines RAG context with conversational responses."""

    SYSTEM_PROMPT = (
        "You are PSA Connect, an internal assistant for PSA staff. "
        "Answer questions using the provided context from company knowledge. "
        "If the context does not contain the answer, say you do not have that information. "
        "Keep responses concise, factual, and friendly."
    )

    def __init__(self, client: OpenAIClient, rag_service: RAGService):
        self._client = client
        self._rag = rag_service

    def answer(self, query: str, history: Sequence[ChatHistoryMessage] | None = None) -> tuple[str, List[RetrievedChunk]]:
        retrieved = self._rag.retrieve(query)
        context = "\n\n".join(f"- {chunk.content}" for chunk in retrieved if chunk.content.strip())

        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]

        if history:
            messages.extend({"role": item.role, "content": item.content} for item in history)

        if context:
            user_message = (
                "Use the retrieved knowledge to answer the employee's question.\n\n"
                f"Context:\n{context}\n\n"
                f"Question: {query}"
            )
        else:
            user_message = (
                "The knowledge base did not yield a matching passage. "
                "If you can confidently answer based on PSA-wide knowledge, do so. "
                "Otherwise, explain that the information is unavailable.\n\n"
                f"Question: {query}"
            )
        messages.append({"role": "user", "content": user_message})

        answer = self._client.create_chat_completion(messages, temperature=0.1)
        return answer, retrieved
