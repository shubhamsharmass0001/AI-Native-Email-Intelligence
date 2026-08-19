"""Shared utility functions."""

import asyncio
import json
import re
import time
from pathlib import Path
from typing import Any, Callable, TypeVar

import orjson

T = TypeVar("T")


def load_json(path: Path) -> Any:
    """Load JSON file using orjson."""
    with open(path, "rb") as f:
        return orjson.loads(f.read())


def save_json(path: Path, data: Any, indent: bool = True) -> None:
    """Save data to JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if indent:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    else:
        with open(path, "wb") as f:
            f.write(orjson.dumps(data))


def append_json_array(path: Path, item: dict[str, Any]) -> None:
    """Append item to JSON array file, creating if needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        data = load_json(path)
        if not isinstance(data, list):
            data = []
    else:
        data = []
    data.append(item)
    save_json(path, data)


def extract_json_from_text(text: str) -> dict[str, Any]:
    """Extract JSON object from LLM response text."""
    text = text.strip()
    if text.startswith("{"):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        return json.loads(fence_match.group(1))

    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        return json.loads(brace_match.group(0))

    raise ValueError(f"Could not extract JSON from response: {text[:200]}")


def truncate_text(text: str, max_length: int = 500) -> str:
    """Truncate text with ellipsis."""
    if len(text) <= max_length:
        return text
    return text[: max_length - 3] + "..."


def compute_hash(text: str) -> str:
    """Compute simple hash for deduplication."""
    import hashlib

    return hashlib.md5(text.encode()).hexdigest()


async def retry_async(
    func: Callable[..., Any],
    *args: Any,
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    **kwargs: Any,
) -> Any:
    """Retry async function with exponential backoff."""
    last_error: Exception | None = None
    current_delay = delay
    for attempt in range(max_retries):
        try:
            return await func(*args, **kwargs)
        except Exception as exc:
            last_error = exc
            if attempt < max_retries - 1:
                await asyncio.sleep(current_delay)
                current_delay *= backoff
    raise last_error  # type: ignore[misc]


def retry_sync(
    func: Callable[..., T],
    *args: Any,
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    **kwargs: Any,
) -> T:
    """Retry sync function with exponential backoff."""
    last_error: Exception | None = None
    current_delay = delay
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except Exception as exc:
            last_error = exc
            if attempt < max_retries - 1:
                time.sleep(current_delay)
                current_delay *= backoff
    raise last_error  # type: ignore[misc]


def merge_node_metrics(
    state: dict[str, Any],
    node_name: str,
    metrics: dict[str, Any],
) -> dict[str, Any]:
    """Merge node metrics into state."""
    node_metrics = dict(state.get("node_metrics") or {})
    node_metrics[node_name] = metrics
    return {"node_metrics": node_metrics}
