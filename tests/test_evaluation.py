"""Tests for evaluation metrics."""

import pytest
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


@pytest.mark.asyncio
async def test_parallel_evaluation_node():
    from unittest.mock import AsyncMock, patch
    from app.evaluation.pipeline import parallel_evaluation_node

    mock_judge_res = {
        "judge_score": {
            "correctness": 0.95,
            "completeness": 0.9,
            "empathy": 0.85,
            "overall": 0.9,
            "feedback": "Great reply",
        },
        "feedback": "Great reply",
        "node_metrics": {"judge_agent": {"latency_ms": 150.0}},
    }

    with patch("app.agents.judge_agent.judge_agent", AsyncMock(return_value=mock_judge_res)):
        state = {
            "subject": "Need invoice",
            "email": "Please send my latest receipt.",
            "expected_response": "Here is your invoice for last month.",
            "generated_reply": {"reply": "Here is your invoice for the recent month."},
            "knowledge": {"context": "Billing documents are available in dashboard."},
            "node_metrics": {},
        }
        res = await parallel_evaluation_node(state)
        assert "embedding_score" in res
        assert "bertscore" in res
        assert "judge_score" in res
        assert res["judge_score"]["overall"] == 0.9
        assert "parallel_evaluation" in res["node_metrics"]

