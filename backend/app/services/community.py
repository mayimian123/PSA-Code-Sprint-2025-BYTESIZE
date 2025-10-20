from __future__ import annotations

import json
from pathlib import Path

from ..clients import OpenAIClient


class CommunityPolishService:
    """Service that polishes community posts using AI."""

    _TONE_OPTIONS = {
        "professional": "Professional",
        "friendly": "Friendly",
        "concise": "Concise",
        "humorous": "Humorous",
    }

    def __init__(self, client: OpenAIClient, prompt_path: Path):
        self._client = client
        self._prompt_path = prompt_path

    def polish(self, content: str, tone: str) -> str:
        """Polish the content according to the specified tone."""
        resolved_tone = self._normalise_tone(tone)
        if not content.strip():
            raise ValueError("Content cannot be empty.")

        system_prompt = self._prompt_path.read_text(encoding="utf-8")
        user_prompt = json.dumps(
            {
                "content": content.strip(),
                "tone_style": resolved_tone,
                "response": {
                    "format": "json",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "polished_content": {
                                "type": "string",
                                "description": "The final polished content ready for posting.",
                            }
                        },
                        "required": ["polished_content"],
                    },
                    "instructions": [
                        "Only return the polished content text in the polished_content property.",
                        "Do not include explanations or the original content.",
                    ],
                },
            },
            ensure_ascii=False,
        )

        response = self._client.structured_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        try:
            result = self._client.to_json(response)
        except ValueError:
            return response.strip()

        polished = ""
        if isinstance(result, dict):
            polished = str(
                result.get("polished_content")
                or result.get("output")
                or ""
            ).strip()
        return polished or response.strip()

    def _normalise_tone(self, tone: str) -> str:
        candidate = (tone or "").strip().lower()
        if not candidate:
            return self._TONE_OPTIONS["professional"]
        return self._TONE_OPTIONS.get(candidate, tone.title())
