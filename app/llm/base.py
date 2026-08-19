"""Common LLM provider interface and shared types."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


class RateLimitError(Exception):
    """Raised when a provider returns HTTP 429 or equivalent rate limit."""


class ProviderTimeoutError(Exception):
    """Raised when a provider request times out."""


class ProviderError(Exception):
    """Non-retriable provider failure."""


@dataclass
class LLMGenerationResult:
    """Raw result from a single provider call."""

    content: str
    tokens: int = 0
    latency_ms: float = 0.0
    provider: str = ""
    model: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0


@dataclass
class GatewayStats:
    """Runtime metrics exposed to health/dashboard endpoints."""

    current_provider: str = ""
    current_model: str = ""
    fallback_provider: str = ""
    fallback_used: bool = False
    last_fallback_reason: str = ""
    total_retries: int = 0
    last_latency_ms: float = 0.0
    last_tokens: int = 0
    total_requests: int = 0
    cache_hits: int = 0
    last_error: str = ""
    providers_configured: dict[str, bool] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "current_provider": self.current_provider,
            "current_model": self.current_model,
            "fallback_provider": self.fallback_provider,
            "fallback_used": self.fallback_used,
            "last_fallback_reason": self.last_fallback_reason,
            "retries": self.total_retries,
            "provider_latency_ms": self.last_latency_ms,
            "last_tokens": self.last_tokens,
            "total_requests": self.total_requests,
            "cache_hits": self.cache_hits,
            "last_error": self.last_error,
            "providers_configured": self.providers_configured,
        }


class BaseLLMProvider(ABC):
    """Abstract provider — all LLM calls go through LLMGateway, not providers directly."""

    provider_name: str = "unknown"

    def __init__(self, model: str, api_key: str, *, temperature: float, max_tokens: int, timeout: float) -> None:
        self.model = model
        self.api_key = api_key.strip()
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        *,
        system: str = "",
        json_mode: bool = False,
    ) -> LLMGenerationResult:
        """Generate a completion for the given prompt."""
