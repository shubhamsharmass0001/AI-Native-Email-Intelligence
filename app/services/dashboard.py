"""Dashboard metrics aggregation service with per-user PostgreSQL isolation."""

from collections import defaultdict
from datetime import datetime
from typing import Any

from ..config import get_settings
from ..db.database import database_enabled, get_session
from ..db.models import EvaluationRecord, GenerationRecord
from sqlalchemy import select
from ..models import DashboardMetrics
from ..llm.gateway import get_llm_gateway
from ..utils.helpers import load_json, save_json
from ..utils.logger import get_logger

logger = get_logger(__name__)


class DashboardService:
    """Aggregates evaluation results into dashboard metrics."""

    def __init__(self, user_id: str = "local-dev") -> None:
        settings = get_settings()
        self._user_id = user_id
        self._evaluation_path = settings.evaluation_results_path
        self._dashboard_path = settings.dashboard_path
        self._generated_path = settings.generated_results_path

    def _load_evaluations(self) -> list[dict[str, Any]]:
        if database_enabled():
            try:
                with get_session() as session:
                    rows = session.scalars(
                        select(EvaluationRecord)
                        .where(EvaluationRecord.user_id == self._user_id)
                        .order_by(EvaluationRecord.created_at.desc())
                    ).all()
                    return [row.data for row in rows]
            except Exception as exc:
                logger.error("DB load evaluations failed: %s", exc)
                return []

        if not self._evaluation_path.exists():
            return []
        data = load_json(self._evaluation_path)
        return data if isinstance(data, list) else []

    def compute_metrics(self) -> DashboardMetrics:
        """Compute aggregated dashboard metrics from evaluation results."""
        evaluations = self._load_evaluations()
        gateway_stats = get_llm_gateway().stats
        llm_fields = {
            "llm_provider": gateway_stats.current_provider,
            "llm_model": gateway_stats.current_model,
            "fallback_provider": gateway_stats.fallback_provider,
            "fallback_used": gateway_stats.fallback_used,
            "llm_retries": gateway_stats.total_retries,
            "provider_latency_ms": gateway_stats.last_latency_ms,
            "llm_cache_hits": gateway_stats.cache_hits,
        }
        if not evaluations:
            return DashboardMetrics(**llm_fields)

        scores: list[float] = []
        latencies: list[float] = []
        tokens: list[int] = []
        intent_scores: dict[str, list[float]] = defaultdict(list)
        hallucination_flags: list[bool] = []
        judge_scores: dict[str, list[float]] = defaultdict(list)

        for eval_item in evaluations:
            overall = eval_item.get("overall_score", 0.0)
            scores.append(overall)

            intent = eval_item.get("intent", "unknown")
            intent_scores[intent].append(overall)

            node_metrics = eval_item.get("node_metrics", {})
            total_latency = sum(m.get("latency_ms", 0) for m in node_metrics.values())
            latencies.append(total_latency)

            gen_reply = eval_item.get("generated_reply", {})
            tokens.append(gen_reply.get("tokens", 0))

            judge = eval_item.get("judge_score", {})
            hallucination_score = judge.get("hallucination", 1.0)
            hallucination_flags.append(hallucination_score < 0.7)

            for criterion in [
                "correctness", "completeness", "empathy", "professionalism",
                "actionability", "safety", "hallucination", "policy_adherence",
            ]:
                if criterion in judge:
                    judge_scores[criterion].append(judge[criterion])

        intent_averages = {intent: sum(vals) / len(vals) for intent, vals in intent_scores.items()}
        sorted_intents = sorted(intent_averages.items(), key=lambda x: x[1], reverse=True)

        judge_distribution = {k: round(sum(v) / len(v), 4) for k, v in judge_scores.items()}

        gateway_stats = get_llm_gateway().stats
        return DashboardMetrics(
            average_score=round(sum(scores) / len(scores), 4) if scores else 0.0,
            average_latency_ms=round(sum(latencies) / len(latencies), 2) if latencies else 0.0,
            average_tokens=round(sum(tokens) / len(tokens), 1) if tokens else 0.0,
            total_processed=len(evaluations),
            top_intents=[{"intent": k, "avg_score": round(v, 4)} for k, v in sorted_intents[:5]],
            worst_intents=[{"intent": k, "avg_score": round(v, 4)} for k, v in sorted_intents[-5:]],
            hallucination_rate=round(sum(hallucination_flags) / len(hallucination_flags), 4)
            if hallucination_flags
            else 0.0,
            judge_distribution=judge_distribution,
            last_updated=datetime.utcnow(),
            llm_provider=gateway_stats.current_provider,
            llm_model=gateway_stats.current_model,
            fallback_provider=gateway_stats.fallback_provider,
            fallback_used=gateway_stats.fallback_used,
            llm_retries=gateway_stats.total_retries,
            provider_latency_ms=gateway_stats.last_latency_ms,
            llm_cache_hits=gateway_stats.cache_hits,
        )

    def save_dashboard(self) -> DashboardMetrics:
        """Compute metrics (persist to file only in local-dev mode)."""
        metrics = self.compute_metrics()
        if not database_enabled():
            save_json(self._dashboard_path, metrics.model_dump(mode="json"))
        logger.info("Dashboard computed for user=%s with %d evaluations", self._user_id, metrics.total_processed)
        return metrics

    def append_evaluation(self, result: dict[str, Any]) -> None:
        """Append evaluation result scoped to user."""
        if database_enabled():
            try:
                with get_session() as session:
                    session.add(EvaluationRecord(user_id=self._user_id, data=result))
                return
            except Exception as exc:
                logger.error("DB append evaluation failed: %s", exc)

        evaluations = self._load_evaluations()
        evaluations.append(result)
        save_json(self._evaluation_path, evaluations)
        self.save_dashboard()

    def append_generation(self, result: dict[str, Any]) -> None:
        """Append generation result scoped to user."""
        if database_enabled():
            try:
                with get_session() as session:
                    session.add(GenerationRecord(user_id=self._user_id, data=result))
                return
            except Exception as exc:
                logger.error("DB append generation failed: %s", exc)

        if self._generated_path.exists():
            data = load_json(self._generated_path)
            if not isinstance(data, list):
                data = []
        else:
            data = []
        data.append(result)
        save_json(self._generated_path, data)

    def list_evaluations(self) -> list[dict[str, Any]]:
        """Public accessor for user-scoped evaluation history."""
        return self._load_evaluations()


def get_dashboard_service(user_id: str = "local-dev") -> DashboardService:
    """Factory for user-scoped dashboard service."""
    return DashboardService(user_id=user_id)
