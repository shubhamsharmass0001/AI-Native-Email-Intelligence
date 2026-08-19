"""LLM judge evaluation wrapper."""

from typing import Any

from ..agents.judge_agent import judge_agent
from ..models import JudgeScores
from ..state import EmailState


async def run_llm_judge(state: EmailState) -> dict[str, Any]:
    """Run LLM judge agent and return structured scores."""
    result = await judge_agent(state)
    judge_data = result.get("judge_score", {})

    try:
        scores = JudgeScores(**judge_data)
        judge_data = scores.model_dump()
    except Exception:
        pass

    return {
        "judge_score": judge_data,
        "feedback": result.get("feedback", ""),
        "node_metrics": result.get("node_metrics", {}),
    }
