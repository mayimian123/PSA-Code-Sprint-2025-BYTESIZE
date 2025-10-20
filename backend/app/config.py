from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


# Automatically load environment variables from a .env file if present.
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATA_DIR = BASE_DIR / "data"
DEFAULT_RAG_SOURCE = DEFAULT_DATA_DIR / "content_psa.txt"
DEFAULT_PROMPT_DIR = BASE_DIR / "prompt"


@dataclass
class AzureDeploymentConfig:
    """Configuration for an Azure OpenAI deployment."""

    api_key: str
    endpoint: str
    api_version: str
    deployment: str

    def ensure_valid(self, label: str) -> None:
        missing = []
        if not self.api_key:
            missing.append("api_key")
        if not self.endpoint:
            missing.append("endpoint")
        if not self.api_version:
            missing.append("api_version")
        if not self.deployment:
            missing.append("deployment")

        if missing:
            fields = ", ".join(missing)
            raise RuntimeError(f"Missing Azure {label} configuration: {fields}")


def create_chat_config() -> AzureDeploymentConfig:
    return AzureDeploymentConfig(
        api_key=os.getenv("AZURE_OPENAI_CHAT_KEY", os.getenv("OPENAI_API_KEY", "")),
        endpoint=os.getenv(
            "AZURE_OPENAI_CHAT_ENDPOINT", os.getenv("AZURE_OPENAI_ENDPOINT", "")
        ),
        api_version=os.getenv(
            "AZURE_OPENAI_CHAT_API_VERSION", os.getenv("OPENAI_API_VERSION", "")
        ),
        deployment=os.getenv("OPENAI_CHAT_MODEL", "gpt-4.1-nano"),
    )


def create_embedding_config() -> AzureDeploymentConfig:
    return AzureDeploymentConfig(
        api_key=os.getenv(
            "AZURE_OPENAI_EMBED_KEY", os.getenv("OPENAI_API_KEY", "")
        ),
        endpoint=os.getenv(
            "AZURE_OPENAI_EMBED_ENDPOINT", os.getenv("AZURE_OPENAI_ENDPOINT", "")
        ),
        api_version=os.getenv(
            "AZURE_OPENAI_EMBED_API_VERSION", os.getenv("OPENAI_API_VERSION", "")
        ),
        deployment=os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small"),
    )


@dataclass
class Settings:
    """Configuration values for the PSA AI backend."""

    chat: AzureDeploymentConfig = field(default_factory=create_chat_config)
    embedding: AzureDeploymentConfig = field(default_factory=create_embedding_config)
    rag_source_path: Path = field(
        default_factory=lambda: Path(
            os.getenv(
                "CHATBOT_SOURCE_PATH",
                DEFAULT_RAG_SOURCE,
            )
        )
    )
    data_dir: Path = field(
        default_factory=lambda: Path(
            os.getenv(
                "DATA_DIR",
                DEFAULT_DATA_DIR,
            )
        )
    )
    prompt_dir: Path = field(
        default_factory=lambda: Path(
            os.getenv(
                "PROMPT_DIR",
                DEFAULT_PROMPT_DIR,
            )
        )
    )
    rag_top_k: int = field(
        default_factory=lambda: int(os.getenv("CHATBOT_TOP_K", "3"))
    )
    rag_chunk_size: int = field(
        default_factory=lambda: int(os.getenv("CHATBOT_CHUNK_SIZE", "1000"))
    )
    rag_chunk_overlap: int = field(
        default_factory=lambda: int(os.getenv("CHATBOT_CHUNK_OVERLAP", "200"))
    )


def get_settings() -> Settings:
    """Factory that returns validated settings."""
    settings = Settings()

    settings.chat.ensure_valid("chat deployment")
    settings.embedding.ensure_valid("embedding deployment")

    if not settings.rag_source_path.exists():
        raise RuntimeError(
            f"Expected knowledge base at {settings.rag_source_path!s}."
        )
    if not settings.prompt_dir.exists():
        raise RuntimeError(
            f"Expected prompt directory at {settings.prompt_dir!s}."
        )
    if not settings.data_dir.exists():
        raise RuntimeError(
            f"Expected data directory at {settings.data_dir!s}."
        )
    return settings
