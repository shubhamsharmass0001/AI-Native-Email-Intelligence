"""Unified multi-task classification agent combining intent, priority, sentiment, and customer type."""

from .base import get_llm_client
from ..constants import CUSTOMER_TYPES, INTENTS, PRIORITIES, SENTIMENTS
from ..prompts import UNIFIED_CLASSIFICATION_PROMPT
from ..state import EmailState
from ..utils.helpers import merge_node_metrics
from ..utils.logger import get_logger, log_node_execution

logger = get_logger(__name__)


async def classification_agent(state: EmailState) -> dict:
    """Classify intent, priority, sentiment, and customer type in a single structured LLM call."""
    subject = state.get("subject", "")
    email = state.get("email", "")
    company = state.get("company", "")

    with log_node_execution(logger, "classification_agent", subject[:100]) as metrics:
        client = get_llm_client()
        prompt = UNIFIED_CLASSIFICATION_PROMPT.format(
            subject=subject,
            email=email,
            company=company,
            intents="\n".join(f"- {i}" for i in INTENTS),
        )

        result, llm_metrics = await client.invoke(prompt, parse_json=True)

        intent = result.get("intent", "bug_report")
        if intent not in INTENTS:
            # Fallback to closest or default if model returned an unlisted string
            matched = next((i for i in INTENTS if i in str(intent).lower()), "bug_report")
            intent = matched

        priority = result.get("priority", "medium")
        if priority not in PRIORITIES:
            priority = "medium"

        sentiment = result.get("sentiment", "neutral")
        if sentiment not in SENTIMENTS:
            sentiment = "neutral"

        customer_type = result.get("customer_type", "business")
        if customer_type not in CUSTOMER_TYPES:
            customer_type = "business"

        language = result.get("language", "English") or "English"

        metrics["tokens"] = llm_metrics.get("tokens", 0)
        metrics["output_summary"] = (
            f"intent={intent}, priority={priority}, sentiment={sentiment}, customer_type={customer_type}"
        )

        return {
            "intent": intent,
            "priority": priority,
            "sentiment": sentiment,
            "customer_type": customer_type,
            "language": language,
            **merge_node_metrics(state, "classification_agent", {**metrics, **llm_metrics}),
        }
