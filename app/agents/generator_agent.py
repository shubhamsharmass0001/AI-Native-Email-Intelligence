"""Reply generation agent using Claude / Gemini / Groq."""

import re
import time

from .base import get_llm_client
from ..prompts import GENERATION_PROMPT, PROMPT_BUILDER_TEMPLATE, SYSTEM_PROMPT
from ..state import EmailState
from ..utils.helpers import merge_node_metrics
from ..utils.logger import get_logger, log_node_execution

logger = get_logger(__name__)


def clean_customer_name(raw_name: str) -> str:
    """Extract clean display name from 'Name <email@domain>' or 'email@domain'."""
    if not raw_name:
        return "Customer"
    # If in format "Priya Gupta <noreply@unstop.news>" -> "Priya Gupta"
    cleaned = re.sub(r"<[^>]+>", "", raw_name).strip()
    if "@" in cleaned:
        cleaned = cleaned.split("@")[0].replace(".", " ").replace("_", " ").title()
    cleaned = cleaned.strip()
    return cleaned if cleaned else "Customer"


def enforce_correct_greeting(reply_text: str, customer_name: str) -> str:
    """Ensure the greeting line strictly addresses the customer and not a 3rd party from the email body."""
    if not reply_text:
        return reply_text

    clean_name = clean_customer_name(customer_name)
    if not clean_name or clean_name.lower() == "customer":
        return reply_text

    first_name = clean_name.split()[0]
    lines = reply_text.splitlines()

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        greeting_match = re.match(r"^(Hi|Hello|Dear|Hey)\b\s*([^,\n]*),?", stripped, re.IGNORECASE)
        if greeting_match:
            salutation = greeting_match.group(1).capitalize()
            current_target = greeting_match.group(2).strip()

            # If greeting doesn't contain the clean customer name or first name, replace it
            if clean_name.lower() not in current_target.lower() and first_name.lower() not in current_target.lower():
                lines[idx] = f"{salutation} {clean_name},"
                return "\n".join(lines)
            return reply_text
        else:
            return f"Hi {clean_name},\n\n{reply_text}"

    return reply_text


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
    """Generate customer support reply."""
    knowledge = state.get("knowledge", {})
    knowledge_context = knowledge.get("context", "No knowledge retrieved.")
    raw_customer_name = state.get("customer_name", "Customer")
    clean_name = clean_customer_name(raw_customer_name)

    with log_node_execution(logger, "generator_agent", state.get("subject", "")) as metrics:
        client = get_llm_client()
        prompt = GENERATION_PROMPT.format(
            customer_name=clean_name,
            company=state.get("company", ""),
            subject=state.get("subject", ""),
            email=state.get("email", ""),
            language=state.get("language", "English"),
            persona=state.get("persona", "Tier 1 Support Agent"),
            tone=state.get("tone", "Professional & Formal"),
            intent=state.get("intent", ""),
            priority=state.get("priority", ""),
            sentiment=state.get("sentiment", ""),
            customer_type=state.get("customer_type", ""),
            knowledge_context=knowledge_context,
        )

        start = time.perf_counter()
        result, llm_metrics = await client.invoke(prompt, system=SYSTEM_PROMPT, parse_json=True)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)

        raw_reply = result.get("reply", "")
        guaranteed_reply = enforce_correct_greeting(raw_reply, clean_name)

        generated_reply = {
            "reply": guaranteed_reply,
            "confidence": result.get("confidence", 0.0),
            "reasoning": result.get("reasoning", ""),
            "language": result.get("language", state.get("language", "English")),
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
