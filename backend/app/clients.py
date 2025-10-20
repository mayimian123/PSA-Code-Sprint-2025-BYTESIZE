from __future__ import annotations

import json
from typing import Iterable, List, Sequence

from openai import APIError, AzureOpenAI
import httpx

from .config import Settings


class OpenAIClient:
    """Thin wrapper around the Azure OpenAI SDK for independent chat and embedding calls."""

    def __init__(self, settings: Settings):
        chat = settings.chat
        embed = settings.embedding

        self.chat_model = chat.deployment
        self.embedding_model = embed.deployment

        # 配置超时时间
        timeout = httpx.Timeout(30.0, connect=10.0)
        
        # Chat client
        self._chat_client = AzureOpenAI(
            api_key=chat.api_key,
            api_version=chat.api_version,
            azure_endpoint=chat.endpoint,
            timeout=timeout,
            max_retries=3,
        )

        # Embedding client
        self._embed_client = AzureOpenAI(
            api_key=embed.api_key,
            api_version=embed.api_version,
            azure_endpoint=embed.endpoint,
            timeout=timeout,
            max_retries=3,
        )

    def create_chat_completion(
        self,
        messages: Sequence[dict],
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        try:
            response = self._chat_client.chat.completions.create(
                model=self.chat_model,
                messages=list(messages),
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except APIError as error:
            print(f"OpenAI chat completion failed: {error}")
            raise RuntimeError(f"OpenAI chat completion failed: {error}") from error
        except Exception as error:
            print(f"Unexpected error in chat completion: {error}")
            raise RuntimeError(f"Unexpected error in chat completion: {error}") from error

        return response.choices[0].message.content or ""

    def create_embedding(self, texts: Iterable[str]) -> List[List[float]]:
        payload = list(texts)
        if not payload:
            return []

        try:
            response = self._embed_client.embeddings.create(
                model=self.embedding_model,
                input=payload,
            )
            print(f"Successfully created embeddings for {len(payload)} texts")
        except APIError as error:
            print(f"OpenAI embedding request failed: {error}")
            raise RuntimeError(f"OpenAI embedding request failed: {error}") from error
        except Exception as error:
            print(f"Unexpected error in embedding request: {error}")
            raise RuntimeError(f"Unexpected error in embedding request: {error}") from error

        # Order is preserved, so align embeddings with the original payload.
        return [item.embedding for item in response.data]

    def structured_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        temperature: float = 0.0,
    ) -> str:
        """Helper that wraps the JSON-style completion pattern."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        return self.create_chat_completion(messages, temperature=temperature)

    @staticmethod
    def to_json(text: str) -> dict:
        try:
            return json.loads(text)
        except json.JSONDecodeError as error:
            raise ValueError("The model returned an invalid JSON payload.") from error