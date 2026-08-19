"""Pydantic domain models for the email intelligence platform."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class KnowledgeDocument(BaseModel):
    """A single knowledge base document."""

    id: str
    node: str
    category: str
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RetrievedDocument(BaseModel):
    """Document retrieved from vector store."""

    id: str
    content: str
    score: float
    node: str
    category: str
    title: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class GeneratedReply(BaseModel):
    """Structured reply from Claude generator."""

    reply: str
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    citations: list[str] = Field(default_factory=list)
    knowledge_used: list[str] = Field(default_factory=list)
    tokens: int = 0
    latency_ms: float = 0.0


class ValidationCheck(BaseModel):
    """Individual validation check result."""

    check: str
    passed: bool
    score: float = Field(ge=0.0, le=1.0)
    details: str = ""


class ValidationReport(BaseModel):
    """Full validation report from validator agent."""

    passed: bool
    overall_score: float = Field(ge=0.0, le=1.0)
    checks: list[ValidationCheck] = Field(default_factory=list)
    revised_reply: str | None = None
    issues: list[str] = Field(default_factory=list)


class JudgeScores(BaseModel):
    """LLM judge evaluation scores."""

    correctness: float = Field(ge=0.0, le=1.0)
    completeness: float = Field(ge=0.0, le=1.0)
    empathy: float = Field(ge=0.0, le=1.0)
    professionalism: float = Field(ge=0.0, le=1.0)
    actionability: float = Field(ge=0.0, le=1.0)
    safety: float = Field(ge=0.0, le=1.0)
    hallucination: float = Field(ge=0.0, le=1.0)
    policy_adherence: float = Field(ge=0.0, le=1.0)
    overall: float = Field(ge=0.0, le=1.0)
    feedback: str = ""


class EvaluationMetrics(BaseModel):
    """Combined evaluation metrics for a single reply."""

    bertscore: dict[str, float] = Field(default_factory=dict)
    embedding_similarity: float = 0.0
    judge_scores: JudgeScores | None = None
    overall_score: float = 0.0
    feedback: str = ""


class NodeMetric(BaseModel):
    """Metrics logged per LangGraph node."""

    node: str
    latency_ms: float
    tokens: int = 0
    input_summary: str = ""
    output_summary: str = ""
    error: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DatasetEmail(BaseModel):
    """Single email in the synthetic dataset."""

    id: str
    customer_name: str
    company: str
    subject: str
    email: str
    intent: str
    priority: str
    sentiment: str
    customer_type: str
    language: str = "en"
    knowledge_tags: list[str] = Field(default_factory=list)
    difficulty: str = "medium"
    expected_response: str


class DashboardMetrics(BaseModel):
    """Aggregated dashboard metrics."""

    average_score: float = 0.0
    average_latency_ms: float = 0.0
    average_tokens: float = 0.0
    total_processed: int = 0
    top_intents: list[dict[str, Any]] = Field(default_factory=list)
    worst_intents: list[dict[str, Any]] = Field(default_factory=list)
    hallucination_rate: float = 0.0
    judge_distribution: dict[str, float] = Field(default_factory=dict)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    llm_provider: str = ""
    llm_model: str = ""
    fallback_provider: str = ""
    fallback_used: bool = False
    llm_retries: int = 0
    provider_latency_ms: float = 0.0
    llm_cache_hits: int = 0
