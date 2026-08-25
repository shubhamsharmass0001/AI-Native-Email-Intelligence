"""Evaluation pipeline nodes for LangGraph."""

import asyncio
from typing import Any

from ..state import EmailState
from ..utils.helpers import merge_node_metrics
from ..utils.logger import get_logger, log_node_execution

logger = get_logger(__name__)


async def _run_embedding_eval(reply: str, expected: str) -> dict[str, Any]:
    from .embedding_similarity import compute_embedding_similarity

    return await asyncio.to_thread(compute_embedding_similarity, reply, expected)


async def _run_bertscore_eval(reply: str, expected: str) -> dict[str, Any]:
    from .bertscore import compute_bertscore

    return await asyncio.to_thread(compute_bertscore, reply, expected)


async def parallel_evaluation_node(state: EmailState) -> dict:
    """Compute embedding similarity, BERTScore, and LLM Judge concurrently via asyncio.gather."""
    from ..agents.judge_agent import judge_agent

    generated = state.get("generated_reply", {})
    reply = generated.get("reply", "")
    expected = state.get("expected_response", "")

    with log_node_execution(logger, "parallel_evaluation", reply[:100]) as metrics:
        embedding_task = _run_embedding_eval(reply, expected)
        bertscore_task = _run_bertscore_eval(reply, expected)
        judge_task = judge_agent(state)

        embedding_score, bert_score, judge_res = await asyncio.gather(
            embedding_task,
            bertscore_task,
            judge_task,
        )

        metrics["output_summary"] = (
            f"emb={embedding_score.get('cosine_similarity')}, "
            f"f1={bert_score.get('f1')}, "
            f"judge={judge_res.get('judge_score', {}).get('overall', 0.0)}"
        )

        combined_metrics = dict(state.get("node_metrics") or {})
        if "node_metrics" in judge_res:
            combined_metrics.update(judge_res["node_metrics"])
        combined_metrics["embedding_evaluation"] = {
            "output_summary": f"similarity={embedding_score.get('cosine_similarity')}",
            "status": "success",
        }
        combined_metrics["bertscore"] = {
            "output_summary": f"f1={bert_score.get('f1')}",
            "status": "success",
        }
        combined_metrics["parallel_evaluation"] = metrics

        return {
            "embedding_score": embedding_score,
            "bertscore": bert_score,
            "judge_score": judge_res.get("judge_score", {}),
            "feedback": judge_res.get("feedback", ""),
            "node_metrics": combined_metrics,
        }


async def embedding_evaluation_node(state: EmailState) -> dict:
    """Compute embedding cosine similarity."""
    from .embedding_similarity import compute_embedding_similarity

    generated = state.get("generated_reply", {})
    reply = generated.get("reply", "")
    expected = state.get("expected_response", "")

    with log_node_execution(logger, "embedding_evaluation", reply[:100]) as metrics:
        score = compute_embedding_similarity(reply, expected)
        metrics["output_summary"] = f"similarity={score['cosine_similarity']}"
        return {
            "embedding_score": score,
            **merge_node_metrics(state, "embedding_evaluation", metrics),
        }


async def bertscore_node(state: EmailState) -> dict:
    """Compute BERTScore metrics."""
    from .bertscore import compute_bertscore

    generated = state.get("generated_reply", {})
    reply = generated.get("reply", "")
    expected = state.get("expected_response", "")

    with log_node_execution(logger, "bertscore", reply[:100]) as metrics:
        score = compute_bertscore(reply, expected)
        metrics["output_summary"] = f"f1={score['f1']}"
        return {
            "bertscore": score,
            **merge_node_metrics(state, "bertscore", metrics),
        }


async def final_report_node(state: EmailState) -> dict:
    """Compute overall score and aggregate feedback."""
    from .overall_score import aggregate_feedback, compute_overall_score

    with log_node_execution(logger, "final_report", "") as metrics:
        overall = compute_overall_score(
            state.get("bertscore", {}),
            state.get("embedding_score", {}),
            state.get("judge_score", {}),
        )
        validated = state.get("validated_reply", {})
        validation_data = validated.get("validation", {})
        feedback = aggregate_feedback(
            state.get("judge_score", {}),
            validation_data,
        )
        metrics["output_summary"] = f"overall={overall}"
        return {
            "overall_score": overall,
            "feedback": feedback,
            **merge_node_metrics(state, "final_report", metrics),
        }
