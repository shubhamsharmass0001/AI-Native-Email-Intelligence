"""FastAPI application entry point."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel

from . import __version__
from .auth.clerk import get_current_user_id
from .config import get_settings
from .db.database import init_db
from .schemas import (
    DashboardResponse,
    EmailInput,
    EvaluateRequest,
    EvaluateResponse,
    GenerateResponse,
    PredictRequest,
    PredictResponse,
)
from .services.dashboard import get_dashboard_service
from .startup_validation import validate_production_env
from .state import EmailState
from .utils.logger import get_logger, setup_logging
from .llm.gateway import get_llm_gateway

logger = get_logger(__name__)


def _get_graph(module_attr: str):
    """Lazy-import LangGraph compiled graphs — avoids evaluation imports at startup."""
    import app.graph as graph_module

    return getattr(graph_module, module_attr)()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lightweight startup: settings, logging, DB, routes only — no Chroma/embeddings."""
    setup_logging()

    try:
        validate_production_env()
    except RuntimeError as exc:
        logger.error("Environment validation failed: %s", exc)

    try:
        if init_db():
            logger.info("✓ Database connected")
        else:
            logger.info("✓ Database skipped (DATABASE_URL not set)")
    except Exception as exc:
        logger.warning("Database init skipped: %s", exc)

    logger.info("✓ FastAPI started")
    logger.info("✓ Routes registered")
    logger.info("✓ Environment OK")

    yield


app = FastAPI(
    title="AI Email Intelligence Platform",
    description="Production-quality AI email reply system powered by LangGraph and a multi-provider LLM gateway",
    version=__version__,
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list(),
    allow_origin_regex=_settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_state(
    subject: str,
    email: str,
    customer_name: str = "Customer",
    company: str = "",
    expected_response: str = "",
    tone: str = "Professional & Formal",
    persona: str = "Tier 1 Support Agent",
) -> EmailState:
    return EmailState(
        subject=subject,
        email=email,
        customer_name=customer_name,
        company=company,
        expected_response=expected_response,
        tone=tone,
        persona=persona,
        language="English",
        node_metrics={},
        errors=[],
    )


def _total_latency(node_metrics: dict[str, Any]) -> float:
    return round(sum(m.get("latency_ms", 0) for m in node_metrics.values()), 2)


@app.get("/")
async def root() -> dict[str, str]:
    """Lightweight root probe — no external services."""
    return {"status": "ok"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Render health probe — <100ms, no Chroma / LLM / evaluation."""
    return {"status": "healthy", "version": __version__}


class ExtractEmailRequest(BaseModel):
    text: str


@app.post("/extract-email")
async def extract_email_endpoint(
    request: ExtractEmailRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, str]:
    """Use LLM to extract customer_name, subject and email_body from raw page text."""
    client = get_llm_client()
    prompt = (
        'Extract the customer email details from this page text. '
        'Return JSON with keys: '
        '{"customer_name": "<sender full name or empty string>", '
        '"subject": "<email subject or topic>", '
        '"email_body": "<clean message body text>"}\n\n'
        f'Page Text:\n{request.text[:4000]}'
    )
    try:
        result, _ = await client.invoke(prompt, parse_json=True)
    except Exception as exc:
        logger.warning("LLM email extraction failed, falling back to raw text: %s", exc)
        return {"customer_name": "", "subject": "", "email_body": ""}

    return {
        "customer_name": result.get("customer_name", ""),
        "subject": result.get("subject", ""),
        "email_body": result.get("email_body", ""),
    }


@app.get("/status")
async def status_check() -> dict[str, Any]:
    """Optional diagnostics for dashboard Sync — lazy-checks vector store only."""
    settings = get_settings()
    from .services.vector_manager import get_vector_manager

    vector = get_vector_manager().status()
    return {
        "status": "healthy",
        "version": __version__,
        "model": settings.llm_model,
        "llm_provider": settings.llm_provider,
        "fallback_provider": settings.fallback_provider,
        "fallback_available": settings.fallback_available,
        "providers": settings.providers_configured(),
        "chroma_available": vector["vector_store_ready"],
        "vector_store": vector,
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(
    request: PredictRequest,
    user_id: str = Depends(get_current_user_id),
) -> PredictResponse:
    """Fast classification endpoint (<1s) — runs intent, priority, sentiment, customer_type in parallel."""
    start = time.perf_counter()
    state = _build_state(request.subject, request.email)
    graph = _get_graph("get_predict_graph")

    try:
        result = await graph.ainvoke(state)
    except Exception as exc:
        logger.error("Predict pipeline failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail=f"Pipeline failed: {exc}. Check LLM API keys and restart the backend.",
        ) from exc

    latency = round((time.perf_counter() - start) * 1000, 2)
    return PredictResponse(
        intent=result.get("intent", ""),
        priority=result.get("priority", ""),
        sentiment=result.get("sentiment", ""),
        customer_type=result.get("customer_type", ""),
        language=result.get("language", "English"),
        latency_ms=latency,
    )


@app.post("/generate", response_model=GenerateResponse)
async def generate(
    request: EmailInput,
    user_id: str = Depends(get_current_user_id),
) -> GenerateResponse:
    """Generate a validated support reply."""
    dashboard = get_dashboard_service(user_id)
    state = _build_state(
        request.subject,
        request.email,
        request.customer_name,
        request.company,
        tone=request.tone,
        persona=request.persona,
    )
    graph = _get_graph("get_generate_graph")

    try:
        result = await graph.ainvoke(state)
    except Exception as exc:
        logger.error("Generate pipeline failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail=f"Pipeline failed: {exc}. Check LLM keys and restart the backend.",
        ) from exc

    node_metrics = result.get("node_metrics", {})
    latency = _total_latency(node_metrics)

    response_data = {
        "subject": request.subject,
        "intent": result.get("intent", ""),
        "language": result.get("language", "English"),
        "generated_reply": result.get("generated_reply", {}),
        "overall_latency_ms": latency,
    }
    dashboard.append_generation(response_data)

    # Also append a lightweight evaluation record so analytics charts update
    eval_record = {
        "subject": request.subject,
        "intent": result.get("intent", ""),
        "priority": result.get("priority", ""),
        "sentiment": result.get("sentiment", ""),
        "customer_type": result.get("customer_type", ""),
        "language": result.get("language", "English"),
        "generated_reply": result.get("generated_reply", {}),
        "overall_score": result.get("generated_reply", {}).get("confidence", 0.0),
        "node_metrics": result.get("node_metrics", {}),
        "overall_latency_ms": latency,
    }
    dashboard.append_evaluation(eval_record)

    return GenerateResponse(
        subject=request.subject,
        email=request.email,
        customer_name=request.customer_name,
        intent=result.get("intent", ""),
        priority=result.get("priority", ""),
        sentiment=result.get("sentiment", ""),
        customer_type=result.get("customer_type", ""),
        language=result.get("language", "English"),
        tone=request.tone,
        persona=request.persona,
        retrieved_documents=result.get("retrieved_documents", []),
        generated_reply=result.get("generated_reply", {}),
        validated_reply=result.get("validated_reply", {}),
        overall_latency_ms=latency,
    )


async def _stream_pipeline(
    graph_name: str,
    state: EmailState,
    user_id: str,
    is_evaluate: bool = False,
) -> AsyncGenerator[str, None]:
    import json
    from fastapi.encoders import jsonable_encoder

    graph = _get_graph(graph_name)
    dashboard = get_dashboard_service(user_id)
    accumulated_state: dict[str, Any] = dict(state)

    if is_evaluate:
        expected_nodes = [
            "classification_agent",
            "knowledge_agent",
            "prompt_builder",
            "generator_agent",
            "validator_agent",
            "parallel_evaluation",
            "final_report",
        ]
    else:
        expected_nodes = [
            "classification_agent",
            "knowledge_agent",
            "prompt_builder",
            "generator_agent",
            "validator_agent",
        ]

    yield f"data: {json.dumps({'type': 'pipeline_start', 'nodes': expected_nodes})}\n\n"

    try:
        if expected_nodes:
            yield f"data: {json.dumps({'type': 'node_start', 'node': expected_nodes[0]})}\n\n"

        async for chunk in graph.astream(state, stream_mode="updates"):
            for node_name, updates in chunk.items():
                accumulated_state.update(updates)
                node_metrics = accumulated_state.get("node_metrics", {}).get(node_name, {})

                yield f"data: {json.dumps({'type': 'node_complete', 'node': node_name, 'metrics': node_metrics, 'summary': node_metrics.get('output_summary', '')})}\n\n"

                if node_name in expected_nodes:
                    idx = expected_nodes.index(node_name)
                    if idx + 1 < len(expected_nodes):
                        next_node = expected_nodes[idx + 1]
                        yield f"data: {json.dumps({'type': 'node_start', 'node': next_node})}\n\n"

        node_metrics = accumulated_state.get("node_metrics", {})
        latency = _total_latency(node_metrics)
        accumulated_state["overall_latency_ms"] = latency

        if is_evaluate:
            eval_data = {
                "subject": accumulated_state.get("subject", ""),
                "intent": accumulated_state.get("intent", ""),
                "priority": accumulated_state.get("priority", ""),
                "sentiment": accumulated_state.get("sentiment", ""),
                "customer_type": accumulated_state.get("customer_type", ""),
                "language": accumulated_state.get("language", "English"),
                "generated_reply": accumulated_state.get("generated_reply", {}),
                "validated_reply": accumulated_state.get("validated_reply", {}),
                "overall_score": accumulated_state.get("overall_score", 0.0),
                "judge_score": accumulated_state.get("judge_score", {}),
                "node_metrics": accumulated_state.get("node_metrics", {}),
            }
            dashboard.append_evaluation(eval_data)

            final_res = EvaluateResponse(
                subject=accumulated_state.get("subject", ""),
                email=accumulated_state.get("email", ""),
                customer_name=accumulated_state.get("customer_name", "Customer"),
                language=accumulated_state.get("language", "English"),
                tone=accumulated_state.get("tone", "professional"),
                persona=accumulated_state.get("persona", "tier1"),
                generated_reply=accumulated_state.get("generated_reply", {}),
                validated_reply=accumulated_state.get("validated_reply", {}),
                bertscore=accumulated_state.get("bertscore", {}),
                embedding_score=accumulated_state.get("embedding_score", {}),
                judge_score=accumulated_state.get("judge_score", {}),
                overall_score=accumulated_state.get("overall_score", 0.0),
                feedback=accumulated_state.get("feedback", ""),
                node_metrics=accumulated_state.get("node_metrics", {}),
            )
        else:
            response_data = {
                "subject": accumulated_state.get("subject", ""),
                "intent": accumulated_state.get("intent", ""),
                "language": accumulated_state.get("language", "English"),
                "generated_reply": accumulated_state.get("generated_reply", {}),
                "overall_latency_ms": latency,
            }
            dashboard.append_generation(response_data)

            eval_record = {
                "subject": accumulated_state.get("subject", ""),
                "intent": accumulated_state.get("intent", ""),
                "priority": accumulated_state.get("priority", ""),
                "sentiment": accumulated_state.get("sentiment", ""),
                "customer_type": accumulated_state.get("customer_type", ""),
                "language": accumulated_state.get("language", "English"),
                "generated_reply": accumulated_state.get("generated_reply", {}),
                "overall_score": accumulated_state.get("generated_reply", {}).get("confidence", 0.0),
                "node_metrics": accumulated_state.get("node_metrics", {}),
                "overall_latency_ms": latency,
            }
            dashboard.append_evaluation(eval_record)

            final_res = GenerateResponse(
                subject=accumulated_state.get("subject", ""),
                email=accumulated_state.get("email", ""),
                customer_name=accumulated_state.get("customer_name", "Customer"),
                intent=accumulated_state.get("intent", ""),
                priority=accumulated_state.get("priority", ""),
                sentiment=accumulated_state.get("sentiment", ""),
                customer_type=accumulated_state.get("customer_type", ""),
                language=accumulated_state.get("language", "English"),
                tone=accumulated_state.get("tone", "professional"),
                persona=accumulated_state.get("persona", "tier1"),
                retrieved_documents=accumulated_state.get("retrieved_documents", []),
                generated_reply=accumulated_state.get("generated_reply", {}),
                validated_reply=accumulated_state.get("validated_reply", {}),
                overall_latency_ms=latency,
            )

        yield f"data: {json.dumps({'type': 'final_result', 'result': jsonable_encoder(final_res)})}\n\n"

    except Exception as exc:
        logger.error("Streaming pipeline error: %s", exc, exc_info=True)
        yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"


@app.post("/generate/stream")
async def generate_stream(
    request: EmailInput,
    user_id: str = Depends(get_current_user_id),
):
    """Stream generate pipeline execution in real-time via Server-Sent Events."""
    from fastapi.responses import StreamingResponse

    state = _build_state(
        request.subject,
        request.email,
        request.customer_name,
        request.company,
        tone=request.tone,
        persona=request.persona,
    )
    return StreamingResponse(
        _stream_pipeline("get_generate_graph", state, user_id, is_evaluate=False),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.post("/evaluate/stream")
async def evaluate_stream(
    request: EvaluateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Stream evaluate pipeline execution in real-time via Server-Sent Events."""
    from fastapi.responses import StreamingResponse

    state = _build_state(
        request.subject,
        request.email,
        request.customer_name,
        request.company,
        request.expected_response,
        tone=request.tone,
        persona=request.persona,
    )
    return StreamingResponse(
        _stream_pipeline("get_full_graph", state, user_id, is_evaluate=True),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(
    request: EvaluateRequest,
    user_id: str = Depends(get_current_user_id),
) -> EvaluateResponse:
    """Full pipeline with evaluation metrics."""
    dashboard = get_dashboard_service(user_id)
    state = _build_state(
        request.subject,
        request.email,
        request.customer_name,
        request.company,
        request.expected_response,
        tone=request.tone,
        persona=request.persona,
    )
    graph = _get_graph("get_full_graph")

    try:
        result = await graph.ainvoke(state)
    except Exception as exc:
        logger.error("Evaluate pipeline failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail=f"Pipeline failed: {exc}. Check LLM keys (GEMINI_API_KEY) and restart the backend after .env changes.",
        ) from exc

    eval_data = {
        "subject": request.subject,
        "intent": result.get("intent", ""),
        "priority": result.get("priority", ""),
        "sentiment": result.get("sentiment", ""),
        "customer_type": result.get("customer_type", ""),
        "language": result.get("language", "English"),
        "generated_reply": result.get("generated_reply", {}),
        "validated_reply": result.get("validated_reply", {}),
        "overall_score": result.get("overall_score", 0.0),
        "judge_score": result.get("judge_score", {}),
        "node_metrics": result.get("node_metrics", {}),
    }
    dashboard.append_evaluation(eval_data)

    return EvaluateResponse(
        subject=request.subject,
        email=request.email,
        customer_name=request.customer_name,
        language=result.get("language", "English"),
        tone=request.tone,
        persona=request.persona,
        generated_reply=result.get("generated_reply", {}),
        validated_reply=result.get("validated_reply", {}),
        bertscore=result.get("bertscore", {}),
        embedding_score=result.get("embedding_score", {}),
        judge_score=result.get("judge_score", {}),
        overall_score=result.get("overall_score", 0.0),
        feedback=result.get("feedback", ""),
        node_metrics=result.get("node_metrics", {}),
    )


@app.get("/dashboard", response_model=DashboardResponse)
async def dashboard(user_id: str = Depends(get_current_user_id)) -> DashboardResponse:
    """Get aggregated dashboard metrics for the authenticated user."""
    dashboard_svc = get_dashboard_service(user_id)
    metrics = dashboard_svc.save_dashboard()
    return DashboardResponse(metrics=metrics.model_dump(mode="json"))


@app.get("/evaluations")
async def list_evaluations(user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    """Return evaluation history for the authenticated user only."""
    dashboard_svc = get_dashboard_service(user_id)
    return {"evaluations": dashboard_svc.list_evaluations()}
