"""Tests for LangGraph workflow structure."""

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
