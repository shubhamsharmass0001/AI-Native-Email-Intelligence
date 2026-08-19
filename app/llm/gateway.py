"""Production LLM gateway with caching, retries, and multi-provider failover."""

from __future__ import annotations

import asyncio
import hashlib
from typing import Any

import httpx

from ..config import Settings, get_settings
from ..prompts import SYSTEM_PROMPT
from ..utils.cache import TTLCache, get_cache
from ..utils.helpers import extract_json_from_text
from ..utils.logger import get_logger
from .base import (
    BaseLLMProvider,
    GatewayStats,
    LLMGenerationResult,
    ProviderTimeoutError,
    RateLimitError,
)
from .factory import LLMFactory

logger = get_logger(__name__)


def _is_retriable(exc: Exception) -> bool:
    if isinstance(exc, (RateLimitError, ProviderTimeoutError, asyncio.TimeoutError)):
        return True
    if isinstance(exc, httpx.TimeoutException):
        return True
    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429:
        return True
    msg = str(exc).lower()
    return "429" in msg or "rate limit" in msg or "timeout" in msg or "timed out" in msg


class LLMGateway:
    """Single entry point for all LLM calls in the application."""

    def __init__(self, settings: Settings | None = None, cache: TTLCache | None = None) -> None:
        self._settings = settings or get_settings()
        self._cache = cache or get_cache()
        self.stats = GatewayStats(
            current_provider=self._settings.llm_provider,
            current_model=self._settings.llm_model,
            fallback_provider=self._settings.fallback_provider,
            providers_configured=self._settings.providers_configured(),
        )

    @property
    def settings(self) -> Settings:
        return self._settings

    def _cache_key(self, prompt: str, system: str, parse_json: bool) -> str:
        digest = hashlib.sha256(
            f"{system}|{prompt}|{parse_json}|{self._settings.temperature}|{self._settings.max_tokens}".encode()
        ).hexdigest()
        return f"llm:{digest}"

    def _provider_chain(self) -> list[tuple[str, str, str]]:
        """Return (role, provider, model) tuples in failover order."""
        chain: list[tuple[str, str, str]] = [
            ("primary", self._settings.llm_provider, self._settings.llm_model),
            ("fallback", self._settings.fallback_provider, self._settings.fallback_model),
            ("secondary", self._settings.secondary_provider, self._settings.secondary_model),
        ]
        seen: set[tuple[str, str]] = set()
        unique: list[tuple[str, str, str]] = []
        for role, provider, model in chain:
            key = (provider.strip().lower(), model.strip())
            if not provider.strip() or key in seen:
                continue
            seen.add(key)
            unique.append((role, provider.strip().lower(), model.strip()))

        # Backward compat: try any other configured provider not already in the chain
        for provider_name, configured in self._settings.providers_configured().items():
            if not configured:
                continue
            model = self._settings.model_for_provider(provider_name)
            key = (provider_name, model.strip())
            if key in seen:
                continue
            seen.add(key)
            unique.append(("configured", provider_name, model.strip()))

        return unique

    async def _call_with_retries(
        self,
        provider: BaseLLMProvider,
        prompt: str,
        *,
        system: str,
        json_mode: bool,
    ) -> tuple[LLMGenerationResult, int]:
        max_retries = self._settings.max_retries
        delay = 1.0
        retries = 0
        last_error: Exception | None = None

        for attempt in range(max_retries):
            try:
                result = await provider.generate(prompt, system=system, json_mode=json_mode)
                return result, retries
            except Exception as exc:
                last_error = exc
                if not _is_retriable(exc) or attempt >= max_retries - 1:
                    raise
                retries += 1
                self.stats.total_retries += 1
                logger.warning(
                    "Retriable LLM error provider=%s model=%s attempt=%d/%d: %s",
                    provider.provider_name,
                    provider.model,
                    attempt + 1,
                    max_retries,
                    exc,
                )
                await asyncio.sleep(delay)
                delay *= 2

        raise last_error  # type: ignore[misc]

    async def generate(
        self,
        prompt: str,
        *,
        system: str = SYSTEM_PROMPT,
        parse_json: bool = True,
    ) -> tuple[Any, dict[str, Any]]:
        """
        Generate LLM output through primary → fallback → secondary providers.

        Returns (parsed_result, metrics). On total failure returns a structured
        error dict instead of raising.
        """
        self.stats.total_requests += 1
        cache_key = self._cache_key(prompt, system, parse_json)
        cached = self._cache.get(cache_key)
        if cached is not None:
            self.stats.cache_hits += 1
            logger.debug("LLM cache hit key=%s", cache_key[:24])
            return cached["result"], {**cached["metrics"], "cache_hit": True}

        chain = self._provider_chain()
        if not chain:
            error_payload = self._error_payload("No LLM providers configured in environment")
            metrics = self._failure_metrics(error_payload["message"])
            return error_payload, metrics

        errors: list[str] = []
        for idx, (role, provider_name, model) in enumerate(chain):
            try:
                provider = LLMFactory.create(provider_name, model, self._settings)
            except ValueError as exc:
                errors.append(str(exc))
                continue

            if not provider.is_configured:
                msg = f"{provider_name} skipped — API key not configured"
                errors.append(msg)
                logger.debug(msg)
                continue

            try:
                gen_result, retries = await self._call_with_retries(
                    provider,
                    prompt,
                    system=system,
                    json_mode=parse_json,
                )
            except Exception as exc:
                reason = f"{provider_name}/{model}: {exc}"
                errors.append(reason)
                logger.warning("LLM provider failed role=%s %s", role, reason)
                continue

            fallback_used = idx > 0
            if fallback_used:
                self.stats.fallback_used = True
                self.stats.last_fallback_reason = errors[-1] if errors else role

            self.stats.current_provider = gen_result.provider
            self.stats.current_model = gen_result.model
            self.stats.last_latency_ms = gen_result.latency_ms
            self.stats.last_tokens = gen_result.tokens
            self.stats.last_error = ""

            metrics: dict[str, Any] = {
                "tokens": gen_result.tokens,
                "latency_ms": gen_result.latency_ms,
                "model": gen_result.model,
                "provider": gen_result.provider,
                "retries": retries,
                "fallback_used": fallback_used,
                "fallback_reason": self.stats.last_fallback_reason if fallback_used else "",
                "role": role,
                "cache_hit": False,
                "success": True,
            }

            logger.info(
                "LLM generate provider=%s model=%s latency=%.2fms tokens=%d retries=%d fallback=%s",
                gen_result.provider,
                gen_result.model,
                gen_result.latency_ms,
                gen_result.tokens,
                retries,
                fallback_used,
            )

            if parse_json:
                try:
                    parsed = extract_json_from_text(gen_result.content)
                except ValueError:
                    parsed = {
                        "error": True,
                        "code": "invalid_json",
                        "message": "LLM response was not valid JSON",
                        "raw": gen_result.content[:500],
                    }
            else:
                parsed = gen_result.content

            self._cache.set(cache_key, {"result": parsed, "metrics": metrics})
            return parsed, metrics

        message = "; ".join(errors) if errors else "All LLM providers failed"
        error_payload = self._error_payload(message, providers_attempted=[p for _, p, _ in chain])
        metrics = self._failure_metrics(message)
        self.stats.last_error = message
        logger.error("LLM gateway exhausted all providers: %s", message)
        return error_payload, metrics

    @staticmethod
    def _error_payload(message: str, providers_attempted: list[str] | None = None) -> dict[str, Any]:
        return {
            "error": True,
            "code": "llm_unavailable",
            "message": message,
            "providers_attempted": providers_attempted or [],
        }

    def _failure_metrics(self, reason: str) -> dict[str, Any]:
        return {
            "tokens": 0,
            "latency_ms": 0.0,
            "model": self.stats.current_model,
            "provider": self.stats.current_provider,
            "retries": self.stats.total_retries,
            "fallback_used": self.stats.fallback_used,
            "fallback_reason": reason,
            "success": False,
            "cache_hit": False,
        }


_gateway: LLMGateway | None = None


def get_llm_gateway() -> LLMGateway:
    """Singleton gateway for dependency injection."""
    global _gateway
    if _gateway is None:
        _gateway = LLMGateway()
    return _gateway
