"""Groq provider."""

from __future__ import annotations

import time

from groq import APIConnectionError, APITimeoutError, AsyncGroq, RateLimitError as GroqRateLimitError

from ..base import BaseLLMProvider, LLMGenerationResult, ProviderError, ProviderTimeoutError, RateLimitError


class GroqProvider(BaseLLMProvider):
    provider_name = "groq"

    async def generate(
        self,
        prompt: str,
        *,
        system: str = "",
        json_mode: bool = False,
    ) -> LLMGenerationResult:
        if not self.is_configured:
            raise ProviderError("GROQ_API_KEY is not configured")

        client = AsyncGroq(api_key=self.api_key, timeout=self.timeout)
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        user_content = prompt
        if json_mode:
            user_content = f"{prompt}\n\nRespond with valid JSON only."
        messages.append({"role": "user", "content": user_content})

        start = time.perf_counter()
        try:
            response = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
        except GroqRateLimitError as exc:
            raise RateLimitError(str(exc)) from exc
        except APITimeoutError as exc:
            raise ProviderTimeoutError(str(exc)) from exc
        except APIConnectionError as exc:
            raise ProviderTimeoutError(str(exc)) from exc
        except Exception as exc:
            raise ProviderError(str(exc)) from exc

        choice = response.choices[0].message
        content = choice.content or ""
        usage = response.usage
        prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
        completion_tokens = getattr(usage, "completion_tokens", 0) or 0

        return LLMGenerationResult(
            content=content,
            tokens=prompt_tokens + completion_tokens,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_ms=round((time.perf_counter() - start) * 1000, 2),
            provider=self.provider_name,
            model=self.model,
        )
