"""Google Gemini provider."""

from __future__ import annotations

import time

import certifi
import httpx

from ..base import BaseLLMProvider, LLMGenerationResult, ProviderError, ProviderTimeoutError, RateLimitError

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiProvider(BaseLLMProvider):
    provider_name = "gemini"

    async def generate(
        self,
        prompt: str,
        *,
        system: str = "",
        json_mode: bool = False,
    ) -> LLMGenerationResult:
        if not self.is_configured:
            raise ProviderError("GEMINI_API_KEY is not configured")

        url = GEMINI_API_URL.format(model=self.model)
        payload: dict = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": self.temperature,
                "maxOutputTokens": self.max_tokens,
            },
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}
        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=certifi.where()) as client:
                resp = await client.post(url, params={"key": self.api_key}, json=payload)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(str(exc)) from exc

        if resp.status_code == 429:
            raise RateLimitError(f"Gemini rate limit: {resp.text[:200]}")
        if resp.status_code >= 400:
            raise ProviderError(f"Gemini HTTP {resp.status_code}: {resp.text[:200]}")

        data = resp.json()
        candidates = data.get("candidates") or []
        if not candidates:
            raise ProviderError(f"Gemini returned no candidates: {data}")

        parts = candidates[0].get("content", {}).get("parts") or []
        content = "".join(p.get("text", "") for p in parts if isinstance(p, dict))
        usage = data.get("usageMetadata") or {}
        tokens = int(usage.get("totalTokenCount", 0))

        return LLMGenerationResult(
            content=content,
            tokens=tokens,
            latency_ms=round((time.perf_counter() - start) * 1000, 2),
            provider=self.provider_name,
            model=self.model,
        )
