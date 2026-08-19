"""Reply generation agent using Claude Sonnet."""

import time

from .base import get_llm_client
from ..prompts import GENERATION_PROMPT, PROMPT_BUILDER_TEMPLATE, SYSTEM_PROMPT
from ..state import EmailState
from ..utils.helpers import merge_node_metrics
from ..utils.logger import get_logger, log_node_execution

logger = get_logger(__name__)


async def prompt_builder(state: EmailState) -> dict:
    """Build optimized prompt for reply generation."""
    knowledge = state.get("knowledge", {})
    knowledge_context = knowledge.get("context", "No knowledge retrieved.")

    with log_node_execution(logger, "prompt_builder", state.get("subject", "")) as metrics:
        prompt = PROMPT_BUILDER_TEMPLATE.format(
            subject=state.get("subject", ""),
            email=state.get("email", ""),
            intent=state.get("intent", ""),
            priority=state.get("priority", ""),
            sentiment=state.get("sentiment", ""),
            customer_type=state.get("customer_type", ""),
            knowledge_context=knowledge_context,
        )
        metrics["output_summary"] = "prompt built"
        return {
            "prompt": prompt,
            **merge_node_metrics(state, "prompt_builder", metrics),
        }


async def generator_agent(state: EmailState) -> dict:
    """Generate customer support reply using Claude."""
    knowledge = state.get("knowledge", {})
    knowledge_context = knowledge.get("context", "No knowledge retrieved.")

    with log_node_execution(logger, "generator_agent", state.get("subject", "")) as metrics:
        client = get_llm_client()
        prompt = GENERATION_PROMPT.format(
            customer_name=state.get("customer_name", "Customer"),
            company=state.get("company", ""),
            subject=state.get("subject", ""),
            email=state.get("email", ""),
            intent=state.get("intent", ""),
            priority=state.get("priority", ""),
            sentiment=state.get("sentiment", ""),
            customer_type=state.get("customer_type", ""),
            knowledge_context=knowledge_context,
        )

        start = time.perf_counter()
        result, llm_metrics = await client.invoke(prompt, system=SYSTEM_PROMPT, parse_json=True)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)

        generated_reply = {
            "reply": result.get("reply", ""),
            "confidence": result.get("confidence", 0.0),
            "reasoning": result.get("reasoning", ""),
            "citations": result.get("citations", []),
            "knowledge_used": result.get("knowledge_used", []),
            "tokens": llm_metrics.get("tokens", 0),
            "latency_ms": latency_ms,
        }

        metrics["tokens"] = llm_metrics["tokens"]
        metrics["output_summary"] = generated_reply["reply"][:200]

        return {
            "generated_reply": generated_reply,
            **merge_node_metrics(state, "generator_agent", {**metrics, **llm_metrics}),
        }
