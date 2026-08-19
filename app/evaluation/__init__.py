"""Evaluation package — heavy deps imported only inside compute functions."""

from .bertscore import compute_bertscore
from .embedding_similarity import compute_embedding_similarity
from .overall_score import aggregate_feedback, compute_overall_score

__all__ = [
    "aggregate_feedback",
    "compute_bertscore",
    "compute_embedding_similarity",
    "compute_overall_score",
]
