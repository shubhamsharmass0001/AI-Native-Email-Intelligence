"""Production startup validation — runs after package imports succeed."""

from __future__ import annotations

import os

from .config import Settings, get_settings
from .utils.logger import get_logger

logger = get_logger(__name__)


def _is_render() -> bool:
    return os.getenv("RENDER", "").lower() in {"true", "1", "yes"}


def log_env_diagnostics(settings: Settings | None = None) -> None:
    """Print readable diagnostics without exposing secrets."""
    settings = settings or get_settings()
    for key, value in env_summary(settings).items():
        logger.info("  %s: %s", key, value)


def validate_production_env(settings: Settings | None = None) -> None:
    """Raise RuntimeError if required production environment variables are missing."""
    if not _is_render():
        return

    settings = settings or get_settings()
    missing: list[str] = []

    if not settings.database_url.strip():
        missing.append("DATABASE_URL")
    if not settings.clerk_secret_key.strip():
        missing.append("CLERK_SECRET_KEY")
    if not settings.has_llm_provider:
        missing.append("LLM API key (GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)")
    if not settings.cors_origin_list():
        missing.append("CORS_ORIGINS")

    if missing:
        raise RuntimeError(
            "Missing required environment variables on Render: "
            + ", ".join(missing)
            + ". Set them in Render Dashboard → Environment."
        )


def env_summary(settings: Settings | None = None) -> dict[str, str]:
    """Return env var presence summary (never prints secret values)."""
    settings = settings or get_settings()
    configured = settings.providers_configured()
    return {
        "DATABASE_URL": "set" if settings.database_url.strip() else "MISSING",
        "CLERK_SECRET_KEY": "set" if settings.clerk_secret_key.strip() else "MISSING",
        "LLM_PROVIDER": settings.llm_provider,
        "LLM_MODEL": settings.llm_model,
        "FALLBACK_PROVIDER": settings.fallback_provider,
        "SECONDARY_PROVIDER": settings.secondary_provider,
        "GEMINI_API_KEY": "set" if configured["gemini"] else "MISSING",
        "GROQ_API_KEY": "set" if configured["groq"] else "MISSING",
        "OPENAI_API_KEY": "set" if configured["openai"] else "MISSING",
        "ANTHROPIC_API_KEY": "set" if configured["anthropic"] else "MISSING",
        "CORS_ORIGINS": "set" if settings.cors_origin_list() else "MISSING",
        "CLERK_JWKS_URL": "set" if settings.clerk_jwks_url.strip() else "MISSING",
        "CLERK_ISSUER": "set" if settings.clerk_issuer.strip() else "MISSING",
    }
