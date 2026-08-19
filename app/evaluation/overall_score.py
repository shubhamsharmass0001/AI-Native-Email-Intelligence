"""Weighted overall score computation."""

from typing import Any

from ..constants import EVALUATION_WEIGHTS


def compute_overall_score(
    bertscore: dict[str, Any],
    embedding_score: dict[str, Any],
    judge_score: dict[str, Any],
) -> float:
    """Compute weighted overall evaluation score."""
    bert_f1 = bertscore.get("f1", 0.0)
    embedding_sim = embedding_score.get("cosine_similarity", 0.0)
    judge_overall = judge_score.get("overall", 0.0)

    overall = (
        EVALUATION_WEIGHTS["bertscore"] * bert_f1
        + EVALUATION_WEIGHTS["embedding_similarity"] * embedding_sim
        + EVALUATION_WEIGHTS["llm_judge"] * judge_overall
    )
    return round(overall, 4)


def aggregate_feedback(
    judge_score: dict[str, Any],
    validation: dict[str, Any] | None = None,
) -> str:
    """Combine feedback from judge and validation."""
    parts: list[str] = []
    if judge_score.get("feedback"):
        parts.append(judge_score["feedback"])
    if validation and validation.get("issues"):
        parts.append("Validation issues: " + "; ".join(validation["issues"]))
    return " | ".join(parts) if parts else "No feedback available"
