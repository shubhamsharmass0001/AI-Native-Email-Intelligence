"""Provider factory."""

from __future__ import annotations

from ..config import Settings, get_settings
from .base import BaseLLMProvider
from .providers.anthropic import AnthropicProvider
from .providers.gemini import GeminiProvider
from .providers.groq import GroqProvider
from .providers.openai import OpenAIProvider

_PROVIDER_MAP: dict[str, type[BaseLLMProvider]] = {
    "gemini": GeminiProvider,
    "groq": GroqProvider,
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    # Legacy alias
    "claude": AnthropicProvider,
}


class LLMFactory:
    """Create configured LLM provider instances."""

    @staticmethod
    def create(
        provider: str,
        model: str | None = None,
        settings: Settings | None = None,
    ) -> BaseLLMProvider:
        settings = settings or get_settings()
        name = provider.strip().lower()
        cls = _PROVIDER_MAP.get(name)
        if cls is None:
            raise ValueError(f"Unsupported LLM provider: {provider!r}. Supported: {sorted(_PROVIDER_MAP)}")

        resolved_model = model or settings.model_for_provider(name)
        return cls(
            model=resolved_model,
            api_key=settings.api_key_for_provider(name),
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
            timeout=float(settings.request_timeout),
        )

    @staticmethod
    def supported_providers() -> list[str]:
        return sorted(_PROVIDER_MAP)
