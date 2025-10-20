from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
PROMPT_DIR = BASE_DIR / "prompt"


@dataclass(slots=True)
class Settings:
    """Application configuration values."""

    data_dir: Path = DATA_DIR
    rag_source_path: Path = DATA_DIR / "content_psa.txt"
    recommended_questions_path: Path = DATA_DIR / "recommend_query.md"
    prompt_dir: Path = PROMPT_DIR
    rag_top_k: int = 4
    rag_chunk_size: int = 600
    rag_chunk_overlap: int = 120
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_chat_model: str = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
    openai_embedding_model: str = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")


def get_settings() -> Settings:
    settings = Settings()

    if not settings.data_dir.exists():
        raise RuntimeError(f"Data directory missing at {settings.data_dir!s}")
    if not settings.rag_source_path.exists():
        raise RuntimeError(
            "Knowledge base file missing at " f"{settings.rag_source_path!s}"
        )
    if not settings.recommended_questions_path.exists():
        raise RuntimeError(
            "Recommended question file missing at " f"{settings.recommended_questions_path!s}"
        )
    if not settings.prompt_dir.exists():
        raise RuntimeError(
            "Prompt directory missing at " f"{settings.prompt_dir!s}"
        )
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY environment variable is required for AI features"
        )

    return settings
