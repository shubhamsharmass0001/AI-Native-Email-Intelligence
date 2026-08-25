from unittest.mock import AsyncMock, patch
import pytest
from app.agents.classification_agent import classification_agent
from app.graph import build_email_graph, build_predict_graph


def test_build_predict_graph():
    graph = build_predict_graph()
    assert graph is not None


def test_build_full_graph_with_evaluation():
    graph = build_email_graph(include_evaluation=True)
    assert graph is not None


def test_build_generate_graph_without_evaluation():
    graph = build_email_graph(include_evaluation=False)
    assert graph is not None


@pytest.mark.asyncio
async def test_classification_agent():
    mock_llm = AsyncMock()
    mock_llm.invoke = AsyncMock(
        return_value=(
            {
                "intent": "payment_failed",
                "priority": "high",
                "sentiment": "negative",
                "customer_type": "enterprise",
                "language": "English",
            },
            {"tokens": 85, "latency_ms": 120.0, "cached": False},
        )
    )

    with patch("app.agents.classification_agent.get_llm_client", return_value=mock_llm):
        state = {
            "subject": "Urgent: Card declined on Pro renewal",
            "email": "Our team subscription failed to renew today.",
            "company": "Acme Corp",
            "node_metrics": {},
        }
        res = await classification_agent(state)
        assert res["intent"] == "payment_failed"
        assert res["priority"] == "high"
        assert res["sentiment"] == "negative"
        assert res["customer_type"] == "enterprise"
        assert res["language"] == "English"
        assert "classification_agent" in res["node_metrics"]

