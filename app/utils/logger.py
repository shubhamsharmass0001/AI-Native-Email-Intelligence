"""Structured logging for the email intelligence platform."""

import logging
import sys
import time
from contextlib import contextmanager
from functools import wraps
from typing import Any, Callable, Generator, TypeVar

from ..config import get_settings

F = TypeVar("F", bound=Callable[..., Any])

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging() -> None:
    """Configure root logger with structured format."""
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level),
        format=_LOG_FORMAT,
        datefmt=_DATE_FORMAT,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )


def get_logger(name: str) -> logging.Logger:
    """Return a named logger instance."""
    return logging.getLogger(name)


@contextmanager
def log_node_execution(
    logger: logging.Logger,
    node_name: str,
    input_summary: str = "",
) -> Generator[dict[str, Any], None, None]:
    """Context manager for logging LangGraph node execution."""
    metrics: dict[str, Any] = {
        "node": node_name,
        "latency_ms": 0.0,
        "tokens": 0,
        "input_summary": input_summary[:500],
        "output_summary": "",
        "error": None,
    }
    start = time.perf_counter()
    logger.info("Node [%s] started | input: %s", node_name, input_summary[:200])
    try:
        yield metrics
    except Exception as exc:
        metrics["error"] = str(exc)
        logger.error("Node [%s] failed: %s", node_name, exc, exc_info=True)
        raise
    finally:
        metrics["latency_ms"] = round((time.perf_counter() - start) * 1000, 2)
        if metrics.get("error"):
            logger.error(
                "Node [%s] completed with error in %.2fms",
                node_name,
                metrics["latency_ms"],
            )
        else:
            logger.info(
                "Node [%s] completed in %.2fms | tokens=%d | output: %s",
                node_name,
                metrics["latency_ms"],
                metrics.get("tokens", 0),
                metrics.get("output_summary", "")[:200],
            )


def log_async_node(node_name: str) -> Callable[[F], F]:
    """Decorator for async node functions."""

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger = get_logger(f"node.{node_name}")
            input_summary = str(kwargs.get("state", args[0] if args else ""))[:300]
            with log_node_execution(logger, node_name, input_summary) as metrics:
                result = await func(*args, **kwargs)
                if isinstance(result, dict):
                    node_metrics = result.get("node_metrics", {})
                    if node_name in node_metrics:
                        metrics.update(node_metrics[node_name])
                return result

        return wrapper  # type: ignore[return-value]

    return decorator
