"""FastAPI request/response schemas."""

from typing import Any

from pydantic import BaseModel, Field


class EmailInput(BaseModel):
    """Input for email processing endpoints."""

    subject: str = Field(..., min_length=1, max_length=500)
    email: str = Field(..., min_length=10)
    customer_name: str = Field(default="Customer")
    company: str = Field(default="")
    expected_response: str = Field(default="")


class PredictRequest(BaseModel):
    """Request for classification-only prediction."""

    subject: str = Field(..., min_length=1)
    email: str = Field(..., min_length=10)


class PredictResponse(BaseModel):
    """Classification prediction response."""

    intent: str
    priority: str
    sentiment: str
    customer_type: str
    latency_ms: float


class GenerateResponse(BaseModel):
    """Full generation pipeline response."""

    subject: str
    email: str
    intent: str
    priority: str
    sentiment: str
    customer_type: str
    retrieved_documents: list[dict[str, Any]]
    generated_reply: dict[str, Any]
    validated_reply: dict[str, Any]
    overall_latency_ms: float


class EvaluateRequest(BaseModel):
    """Request for evaluation endpoint."""

    subject: str = Field(..., min_length=1)
    email: str = Field(..., min_length=10)
    expected_response: str = Field(..., min_length=10)
    customer_name: str = Field(default="Customer")
    company: str = Field(default="")


class EvaluateResponse(BaseModel):
    """Full evaluation pipeline response."""

    subject: str
    email: str
    generated_reply: dict[str, Any]
    validated_reply: dict[str, Any]
    bertscore: dict[str, Any]
    embedding_score: dict[str, Any]
    judge_score: dict[str, Any]
    overall_score: float
    feedback: str
    node_metrics: dict[str, Any]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    model: str = ""
    chroma_available: bool = False
    llm_provider: str = "none"
    fallback_available: bool = False
    providers: dict[str, bool] = Field(default_factory=dict)


class DashboardResponse(BaseModel):
    """Dashboard metrics response."""

    metrics: dict[str, Any]
