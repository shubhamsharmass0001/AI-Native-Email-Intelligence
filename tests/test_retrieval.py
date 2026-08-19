"""Tests for knowledge retriever."""

from app.retriever.retrieval import KnowledgeRetriever


def test_intent_to_node_mapping():
    retriever = KnowledgeRetriever()
    nodes = retriever.get_nodes_for_intent("refund_request")
    assert "Refund" in nodes


def test_graph_traversal():
    retriever = KnowledgeRetriever()
    context = retriever.traverse_graph(["Billing"], depth=1)
    assert "Billing" in context["nodes"]
    assert len(context["escalation_rules"]) > 0


def test_retrieve_returns_documents():
    retriever = KnowledgeRetriever()
    docs, graph = retriever.retrieve(
        query="I need a refund for my subscription",
        intent="refund_request",
    )
    assert isinstance(docs, list)
    assert isinstance(graph, dict)
    assert "nodes" in graph


def test_format_context():
    retriever = KnowledgeRetriever()
    docs, graph = retriever.retrieve(
        query="password reset help",
        intent="password_reset",
    )
    context = retriever.format_context(docs, graph)
    assert isinstance(context, str)
    assert len(context) > 0
