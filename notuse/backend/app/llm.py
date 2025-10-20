from __future__ import annotations

from typing import Iterable, List

from openai import OpenAI

from .config import Settings


class LLMClient:
    """Wrapper around the OpenAI Python SDK for chat and embeddings."""

    def __init__(self, settings: Settings) -> None:
        self._client = OpenAI(api_key=settings.openai_api_key)
        self._chat_model = settings.openai_chat_model
        self._embed_model = settings.openai_embedding_model

    def chat(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        response = self._client.chat.completions.create(
            model=self._chat_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        message = response.choices[0].message.content or ""
        return message.strip()

    def embed(self, texts: Iterable[str]) -> List[List[float]]:
        payload = list(texts)
        if not payload:
            return []
        response = self._client.embeddings.create(
            model=self._embed_model,
            input=payload,
        )
        return [item.embedding for item in response.data]
