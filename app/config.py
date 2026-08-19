"""Application configuration with dependency injection support."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "dataset"
KNOWLEDGE_DIR = PROJECT_ROOT / "knowledge"
RESULTS_DIR = PROJECT_ROOT / "results"
POLICIES_DIR = KNOWLEDGE_DIR / "policies"
TEMPLATES_DIR = KNOWLEDGE_DIR / "templates"
FAQ_DIR = KNOWLEDGE_DIR / "faq"
EMBEDDINGS_DIR = KNOWLEDGE_DIR / "embeddings"


class Settings(BaseSettings):
    """Central configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM gateway — primary / fallback / secondary
    llm_provider: str = Field(default="gemini", alias="LLM_PROVIDER")
    llm_model: str = Field(default="gemini-2.5-flash-lite", alias="LLM_MODEL")
    fallback_provider: str = Field(default="groq", alias="FALLBACK_PROVIDER")
    fallback_model: str = Field(default="llama-3.3-70b-versatile", alias="FALLBACK_MODEL")
    secondary_provider: str = Field(default="openai", alias="SECONDARY_PROVIDER")
    secondary_model: str = Field(default="gpt-4.1-mini", alias="SECONDARY_MODEL")

    temperature: float = Field(default=0.0, alias="TEMPERATURE")
    max_tokens: int = Field(default=4096, alias="MAX_TOKENS")
    request_timeout: int = Field(default=60, alias="REQUEST_TIMEOUT")

    # Provider API keys
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")

    # Legacy per-provider model overrides (backward compatible)
    anthropic_model: str = Field(default="claude-sonnet-4-6", alias="ANTHROPIC_MODEL")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")

    embedding_model: str = Field(default="all-MiniLM-L6-v2", alias="EMBEDDING_MODEL")
    chroma_persist_dir: Path = Field(
        default=KNOWLEDGE_DIR / "vectorstore",
        alias="CHROMA_PERSIST_DIR",
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        alias="LOG_LEVEL",
    )
    cache_ttl_seconds: int = Field(default=3600, alias="CACHE_TTL_SECONDS")
    max_retries: int = Field(default=5, alias="MAX_RETRIES")
    retrieval_top_k: int = Field(default=3, alias="RETRIEVAL_TOP_K")
    knowledge_graph_path: Path = Field(default=KNOWLEDGE_DIR / "knowledge_graph.json")
    generated_results_path: Path = Field(default=RESULTS_DIR / "generated.json")
    evaluation_results_path: Path = Field(default=RESULTS_DIR / "evaluation.json")
    dashboard_path: Path = Field(default=RESULTS_DIR / "dashboard.json")

    database_url: str = Field(default="", alias="DATABASE_URL")
    clerk_secret_key: str = Field(default="", alias="CLERK_SECRET_KEY")
    clerk_issuer: str = Field(default="", alias="CLERK_ISSUER")
    clerk_jwks_url: str = Field(default="", alias="CLERK_JWKS_URL")

    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,https://ainativeemail.vercel.app",
        alias="CORS_ORIGINS",
    )
    cors_origin_regex: str = Field(
        default=r"https://.*\.vercel\.app",
        alias="CORS_ORIGIN_REGEX",
    )

    @field_validator(
        "database_url",
        "anthropic_api_key",
        "gemini_api_key",
        "google_api_key",
        "groq_api_key",
        "openai_api_key",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v

    @property
    def effective_gemini_key(self) -> str:
        return self.gemini_api_key or self.google_api_key

    def api_key_for_provider(self, provider: str) -> str:
        name = provider.strip().lower()
        if name in {"anthropic", "claude"}:
            return self.anthropic_api_key
        if name == "gemini":
            return self.effective_gemini_key
        if name == "groq":
            return self.groq_api_key
        if name == "openai":
            return self.openai_api_key
        return ""

    def model_for_provider(self, provider: str) -> str:
        name = provider.strip().lower()
        if name in {"anthropic", "claude"}:
            return self.anthropic_model
        if name == "gemini":
            return self.gemini_model
        if name == self.fallback_provider.strip().lower():
            return self.fallback_model
        if name == self.secondary_provider.strip().lower():
            return self.secondary_model
        if name == self.llm_provider.strip().lower():
            return self.llm_model
        return self.llm_model

    def providers_configured(self) -> dict[str, bool]:
        return {
            "gemini": bool(self.effective_gemini_key),
            "groq": bool(self.groq_api_key),
            "openai": bool(self.openai_api_key),
            "anthropic": bool(self.anthropic_api_key),
        }

    @property
    def has_llm_provider(self) -> bool:
        return any(self.providers_configured().values())

    @property
    def fallback_available(self) -> bool:
        fb = self.fallback_provider.strip().lower()
        return bool(self.api_key_for_provider(fb))

    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def project_root(self) -> Path:
        return PROJECT_ROOT


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton for dependency injection."""
    return Settings()
