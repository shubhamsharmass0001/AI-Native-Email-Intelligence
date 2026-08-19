"""Customer type classification agent."""

from .base import get_llm_client
from ..prompts import CUSTOMER_TYPE_PROMPT
from ..state import EmailState
from ..utils.helpers import merge_node_metrics
from ..utils.logger import get_logger, log_node_execution

logger = get_logger(__name__)


async def customer_agent(state: EmailState) -> dict:
    """Infer customer type from email signals."""
    with log_node_execution(logger, "customer_agent", state.get("company", "")) as metrics:
        client = get_llm_client()
        prompt = CUSTOMER_TYPE_PROMPT.format(
            subject=state.get("subject", ""),
            email=state.get("email", ""),
            company=state.get("company", "Unknown"),
        )
        result, llm_metrics = await client.invoke(prompt, parse_json=True)
        metrics["tokens"] = llm_metrics["tokens"]
        metrics["output_summary"] = result.get("customer_type", "")

        return {
            "customer_type": result.get("customer_type", "individual"),
            **merge_node_metrics(state, "customer_agent", {**metrics, **llm_metrics}),
        }
