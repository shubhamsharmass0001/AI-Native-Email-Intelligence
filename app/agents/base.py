"""Shared LLM client — delegates to LLMGateway (no direct provider calls)."""

from typing import Any

from ..llm.gateway import get_llm_gateway
from ..prompts import SYSTEM_PROMPT
from ..utils.logger import get_logger

logger = get_logger(__name__)


class LLMClient:
    """Backward-compatible facade over the provider-agnostic LLM gateway."""

    def __init__(self) -> None:
        self._gateway = get_llm_gateway()
        settings = self._gateway.settings
        self._provider = settings.llm_provider
        self._model = settings.llm_model

    @property
    def model_name(self) -> str:
        stats = self._gateway.stats
        return stats.current_model or self._model

    @property
    def provider(self) -> str:
        stats = self._gateway.stats
        return stats.current_provider or self._provider

    @property
    def fallback_available(self) -> bool:
        return self._gateway.settings.fallback_available

    async def invoke(
        self,
        prompt: str,
        system: str = SYSTEM_PROMPT,
        parse_json: bool = True,
    ) -> tuple[Any, dict[str, Any]]:
        """Invoke LLM through the gateway and optionally parse JSON."""
        result, metrics = await self._gateway.generate(prompt, system=system, parse_json=parse_json)
        self._provider = metrics.get("provider", self._provider)
        self._model = metrics.get("model", self._model)

        if isinstance(result, dict) and result.get("error"):
            logger.error("LLM gateway returned error: %s", result.get("message"))

        return result, metrics


_llm_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    """Singleton LLM client for dependency injection."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
