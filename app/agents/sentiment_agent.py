"""Sentiment analysis agent."""

from .base import get_llm_client
from ..prompts import SENTIMENT_ANALYSIS_PROMPT
from ..state import EmailState
from ..utils.helpers import merge_node_metrics
from ..utils.logger import get_logger, log_node_execution

logger = get_logger(__name__)


async def sentiment_agent(state: EmailState) -> dict:
    """Detect customer sentiment from email."""
    with log_node_execution(logger, "sentiment_agent", state.get("subject", "")) as metrics:
        client = get_llm_client()
        prompt = SENTIMENT_ANALYSIS_PROMPT.format(
            subject=state.get("subject", ""),
            email=state.get("email", ""),
        )
        result, llm_metrics = await client.invoke(prompt, parse_json=True)
        metrics["tokens"] = llm_metrics["tokens"]
        metrics["output_summary"] = result.get("sentiment", "")

        return {
            "sentiment": result.get("sentiment", "neutral"),
            **merge_node_metrics(state, "sentiment_agent", {**metrics, **llm_metrics}),
        }
