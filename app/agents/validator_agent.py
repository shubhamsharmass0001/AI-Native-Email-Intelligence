"""Response validation agent."""

from .base import get_llm_client
from .generator_agent import enforce_correct_greeting
from ..prompts import VALIDATION_PROMPT
from ..state import EmailState
from ..utils.helpers import merge_node_metrics
from ..utils.logger import get_logger, log_node_execution

logger = get_logger(__name__)


async def validator_agent(state: EmailState) -> dict:
    """Validate generated reply for quality and policy compliance."""
    generated = state.get("generated_reply", {})
    reply_text = generated.get("reply", "")
    knowledge = state.get("knowledge", {})
    knowledge_context = knowledge.get("context", "")

    with log_node_execution(logger, "validator_agent", reply_text[:200]) as metrics:
        client = get_llm_client()
        prompt = VALIDATION_PROMPT.format(
            customer_name=state.get("customer_name", "Customer"),
            subject=state.get("subject", ""),
            email=state.get("email", ""),
            reply=reply_text,
            knowledge_context=knowledge_context,
        )
        result, llm_metrics = await client.invoke(prompt, parse_json=True)
        metrics["tokens"] = llm_metrics["tokens"]
        metrics["output_summary"] = f"passed={result.get('passed', False)}"

        revised = result.get("revised_reply")
        if revised:
            revised = enforce_correct_greeting(revised, state.get("customer_name", "Customer"))

        validated_reply = {
            "original_reply": reply_text,
            "final_reply": revised or reply_text,
            "validation": {
                "passed": result.get("passed", False),
                "overall_score": result.get("overall_score", 0.0),
                "checks": result.get("checks", []),
                "issues": result.get("issues", []),
            },
        }

        if revised:
            generated["reply"] = revised

        return {
            "generated_reply": generated,
            "validated_reply": validated_reply,
            **merge_node_metrics(state, "validator_agent", {**metrics, **llm_metrics}),
        }
