"""Tests for FastAPI endpoints."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "model" not in data


def test_dashboard_endpoint(client):
    response = client.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data


@patch("app.main._get_graph")
def test_predict_endpoint(mock_graph_fn, client):
    mock_graph = AsyncMock()
    mock_graph.ainvoke = AsyncMock(
        return_value={
            "intent": "billing_inquiry",
            "priority": "medium",
            "sentiment": "neutral",
            "customer_type": "business",
        }
    )
    mock_graph_fn.return_value = mock_graph

    response = client.post(
        "/predict",
        json={
            "subject": "Invoice question",
            "email": "Hi, I need my invoice for last month. Thanks.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "billing_inquiry"
    assert "latency_ms" in data
