"""TTL-based in-memory cache for expensive operations."""

from __future__ import annotations

import hashlib
import json
import time
from functools import wraps
from typing import Any, Callable, TypeVar

from ..config import get_settings

F = TypeVar("F", bound=Callable[..., Any])


class TTLCache:
    """Thread-safe TTL cache for API responses and embeddings."""

    def __init__(self, ttl_seconds: int | None = None) -> None:
        settings = get_settings()
        self._ttl = ttl_seconds or settings.cache_ttl_seconds
        self._store: dict[str, tuple[Any, float]] = {}

    def _make_key(self, prefix: str, data: Any) -> str:
        serialized = json.dumps(data, sort_keys=True, default=str)
        digest = hashlib.sha256(serialized.encode()).hexdigest()[:16]
        return f"{prefix}:{digest}"

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.time() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (value, time.time() + self._ttl)

    def get_or_set(self, key: str, factory: Callable[[], Any]) -> Any:
        cached = self.get(key)
        if cached is not None:
            return cached
        value = factory()
        self.set(key, value)
        return value

    def clear(self) -> None:
        self._store.clear()

    def cached(self, prefix: str) -> Callable[[F], F]:
        """Decorator to cache function results by arguments."""

        def decorator(func: F) -> F:
            @wraps(func)
            def wrapper(*args: Any, **kwargs: Any) -> Any:
                key_data = {"args": args, "kwargs": kwargs}
                key = self._make_key(prefix, key_data)
                cached = self.get(key)
                if cached is not None:
                    return cached
                result = func(*args, **kwargs)
                self.set(key, result)
                return result

            return wrapper  # type: ignore[return-value]

        return decorator


_cache_instance: TTLCache | None = None


def get_cache() -> TTLCache:
    """Singleton cache instance for dependency injection."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = TTLCache()
    return _cache_instance
