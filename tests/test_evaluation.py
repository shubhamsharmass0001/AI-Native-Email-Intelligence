"""Tests for evaluation metrics."""

from app.evaluation.bertscore import compute_bertscore, _fallback_similarity
from app.evaluation.embedding_similarity import compute_embedding_similarity
from app.evaluation.overall_score import compute_overall_score


def test_fallback_similarity_identical():
    result = _fallback_similarity("hello world", "hello world")
    assert result["f1"] == 1.0


def test_fallback_similarity_different():
    result = _fallback_similarity("hello", "goodbye world")
    assert 0.0 <= result["f1"] < 1.0


def test_compute_bertscore_empty():
    result = compute_bertscore("", "reference text")
    assert result["f1"] == 0.0


def test_compute_overall_score():
    score = compute_overall_score(
        bertscore={"f1": 0.8},
        embedding_score={"cosine_similarity": 0.9},
        judge_score={"overall": 0.85},
    )
    assert 0.0 < score <= 1.0


def test_embedding_similarity_empty():
    result = compute_embedding_similarity("", "some text")
    assert result["cosine_similarity"] == 0.0
