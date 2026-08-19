"""Anthropic Claude provider."""

from __future__ import annotations

import time

from anthropic import APIConnectionError, APITimeoutError, AsyncAnthropic, RateLimitError as AnthropicRateLimitError

from ..base import BaseLLMProvider, LLMGenerationResult, ProviderError, ProviderTimeoutError, RateLimitError


class AnthropicProvider(BaseLLMProvider):
    provider_name = "anthropic"

    async def generate(
        self,
        prompt: str,
        *,
        system: str = "",
        json_mode: bool = False,
    ) -> LLMGenerationResult:
        if not self.is_configured:
            raise ProviderError("ANTHROPIC_API_KEY is not configured")

        client = AsyncAnthropic(api_key=self.api_key, timeout=self.timeout)
        user_content = prompt
        if json_mode:
            user_content = f"{prompt}\n\nRespond with valid JSON only."

        start = time.perf_counter()
        try:
            response = await client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                system=system or "You are a helpful assistant.",
                messages=[{"role": "user", "content": user_content}],
            )
        except AnthropicRateLimitError as exc:
            raise RateLimitError(str(exc)) from exc
        except APITimeoutError as exc:
            raise ProviderTimeoutError(str(exc)) from exc
        except APIConnectionError as exc:
            raise ProviderTimeoutError(str(exc)) from exc
        except Exception as exc:
            raise ProviderError(str(exc)) from exc

        content = ""
        for block in response.content:
            if hasattr(block, "text"):
                content += block.text

        usage = response.usage
        input_tokens = getattr(usage, "input_tokens", 0) or 0
        output_tokens = getattr(usage, "output_tokens", 0) or 0

        return LLMGenerationResult(
            content=content,
            tokens=input_tokens + output_tokens,
            prompt_tokens=input_tokens,
            completion_tokens=output_tokens,
            latency_ms=round((time.perf_counter() - start) * 1000, 2),
            provider=self.provider_name,
            model=self.model,
        )
