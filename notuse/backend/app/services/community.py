from __future__ import annotations

from pathlib import Path
from textwrap import dedent

from ..llm import LLMClient


class CommunityPolishService:
    """Uses an LLM prompt to polish community posts."""

    def __init__(self, llm: LLMClient, prompt_path: Path):
        self._llm = llm
        self._prompt_template = prompt_path.read_text(encoding="utf-8")

    def polish(self, content: str, tone: str) -> str:
        user_prompt = dedent(
            self._prompt_template
            .replace("{user_content}", content.strip())
            .replace("{tone_style}", tone.strip())
        )

        response = self._llm.chat(
            system_prompt="You are an expert communication coach for PSA employees.",
            user_prompt=user_prompt,
            temperature=0.4,
        )
        cleaned = response.strip()
        return cleaned or content.strip()
