"""LangGraph state definition for the email intelligence pipeline."""

from typing import Any, TypedDict


class EmailState(TypedDict, total=False):
    """Shared state passed between LangGraph nodes."""

    subject: str
    email: str
    customer_name: str
    company: str
    expected_response: str
    intent: str
    priority: str
    customer_type: str
    sentiment: str
    knowledge: dict[str, Any]
    retrieved_documents: list[dict[str, Any]]
    prompt: str
    generated_reply: dict[str, Any]
    validated_reply: dict[str, Any]
    bertscore: dict[str, Any]
    embedding_score: dict[str, Any]
    judge_score: dict[str, Any]
    overall_score: float
    feedback: str
    node_metrics: dict[str, Any]
    errors: list[str]
