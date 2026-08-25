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
                    evals = [row.data for row in rows]
                    if evals:
                        return evals
                    # Fallback to generations if no evaluation records yet
                    gen_rows = session.scalars(
                        select(GenerationRecord)
                        .where(GenerationRecord.user_id == self._user_id)
                        .order_by(GenerationRecord.created_at.desc())
                    ).all()
                    return [row.data for row in gen_rows]
            except Exception as exc:
                logger.error("DB load evaluations failed: %s", exc)
                return []

        if self._evaluation_path.exists():
            data = load_json(self._evaluation_path)
            if isinstance(data, list) and data:
                return data

        if self._generated_path.exists():
            data = load_json(self._generated_path)
            if isinstance(data, list) and data:
                return data

        return []

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
            overall = eval_item.get("overall_score", 0.9)
            scores.append(overall)

            intent = eval_item.get("intent", "general_inquiry")
            intent_scores[intent].append(overall)

            node_metrics = eval_item.get("node_metrics", {})
            total_latency = (
                sum(m.get("latency_ms", 0) for m in node_metrics.values())
                or eval_item.get("overall_latency_ms", 3500)
            )
            latencies.append(total_latency)

            gen_reply = eval_item.get("generated_reply", {})
            tokens.append(gen_reply.get("tokens", 1200))

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

        total_proc = len(evaluations)
        avg_quality = round(sum(scores) / total_proc, 4) if total_proc else 0.0
        avg_latency = round(sum(latencies) / total_proc, 2) if total_proc else 0.0
        avg_tokens = round(sum(tokens) / total_proc, 1) if total_proc else 0.0
        hallucination_rate = round(sum(hallucination_flags) / total_proc, 4) if total_proc else 0.0

        return DashboardMetrics(
            total_processed=total_proc,
            average_quality_score=avg_quality,
            average_latency_ms=avg_latency,
            average_token_count=avg_tokens,
            intent_distribution={k: len(v) for k, v in intent_scores.items()},
            priority_distribution=self._compute_distribution(evaluations, "priority"),
            sentiment_distribution=self._compute_distribution(evaluations, "sentiment"),
            customer_type_distribution=self._compute_distribution(evaluations, "customer_type"),
            top_performing_intents=[k for k, _ in sorted_intents[:3]],
            underperforming_intents=[k for k, _ in sorted_intents[-3:]],
            hallucination_rate=hallucination_rate,
            judge_score_distribution=judge_distribution,
            last_updated=datetime.now(),
            **llm_fields,
        )

    def _compute_distribution(self, items: list[dict[str, Any]], field: str) -> dict[str, int]:
        dist: dict[str, int] = defaultdict(int)
        for item in items:
            val = item.get(field)
            if val:
                dist[str(val)] += 1
        return dict(dist)

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
        self.save_dashboard()

    def list_evaluations(self) -> list[dict[str, Any]]:
        """Public accessor for user-scoped evaluation history."""
        return self._load_evaluations()


def get_dashboard_service(user_id: str = "local-dev") -> DashboardService:
    """Factory for user-scoped dashboard service."""
    return DashboardService(user_id=user_id)
