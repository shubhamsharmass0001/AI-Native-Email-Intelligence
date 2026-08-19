"""LLM judge evaluation agent."""

from .base import get_llm_client
from ..prompts import JUDGE_PROMPT
from ..state import EmailState
from ..utils.helpers import merge_node_metrics
from ..utils.logger import get_logger, log_node_execution

logger = get_logger(__name__)


async def judge_agent(state: EmailState) -> dict:
    """Evaluate reply quality using LLM judge."""
    generated = state.get("generated_reply", {})
    reply_text = generated.get("reply", "")
    expected = state.get("expected_response", "")
    knowledge = state.get("knowledge", {})
    knowledge_context = knowledge.get("context", "")

    with log_node_execution(logger, "judge_agent", reply_text[:200]) as metrics:
        if not expected:
            metrics["output_summary"] = "skipped - no expected response"
            return {
                "judge_score": {
                    "overall": 0.0,
                    "feedback": "No expected response provided for comparison",
                },
                **merge_node_metrics(state, "judge_agent", metrics),
            }

        client = get_llm_client()
        prompt = JUDGE_PROMPT.format(
            subject=state.get("subject", ""),
            email=state.get("email", ""),
            expected_response=expected,
            generated_reply=reply_text,
            knowledge_context=knowledge_context,
        )
        result, llm_metrics = await client.invoke(prompt, parse_json=True)
        metrics["tokens"] = llm_metrics["tokens"]
        metrics["output_summary"] = f"overall={result.get('overall', 0.0)}"

        return {
            "judge_score": result,
            "feedback": result.get("feedback", ""),
            **merge_node_metrics(state, "judge_agent", {**metrics, **llm_metrics}),
        }
