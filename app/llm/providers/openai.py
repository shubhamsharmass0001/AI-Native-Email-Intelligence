"""OpenAI provider."""

from __future__ import annotations

import time

from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, RateLimitError as OpenAIRateLimitError

from ..base import BaseLLMProvider, LLMGenerationResult, ProviderError, ProviderTimeoutError, RateLimitError


class OpenAIProvider(BaseLLMProvider):
    provider_name = "openai"

    async def generate(
        self,
        prompt: str,
        *,
        system: str = "",
        json_mode: bool = False,
    ) -> LLMGenerationResult:
        if not self.is_configured:
            raise ProviderError("OPENAI_API_KEY is not configured")

        client = AsyncOpenAI(api_key=self.api_key, timeout=self.timeout)
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        kwargs: dict = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        start = time.perf_counter()
        try:
            response = await client.chat.completions.create(**kwargs)
        except OpenAIRateLimitError as exc:
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
