"""LangGraph orchestration for the email intelligence pipeline."""

from typing import Any

from langgraph.graph import END, START, StateGraph

from .agents.customer_agent import customer_agent
from .agents.generator_agent import generator_agent, prompt_builder
from .agents.intent_agent import intent_agent
from .agents.judge_agent import judge_agent
from .agents.knowledge_agent import knowledge_agent
from .agents.priority_agent import priority_agent
from .agents.sentiment_agent import sentiment_agent
from .agents.validator_agent import validator_agent
from .state import EmailState
from .utils.logger import get_logger

logger = get_logger(__name__)


def build_email_graph(include_evaluation: bool = True) -> Any:
    """Build and compile the LangGraph workflow."""
    graph = StateGraph(EmailState)

    graph.add_node("intent_agent", intent_agent)
    graph.add_node("priority_agent", priority_agent)
    graph.add_node("sentiment_agent", sentiment_agent)
    graph.add_node("customer_agent", customer_agent)
    graph.add_node("knowledge_agent", knowledge_agent)
    graph.add_node("prompt_builder", prompt_builder)
    graph.add_node("generator_agent", generator_agent)
    graph.add_node("validator_agent", validator_agent)

    graph.add_edge(START, "intent_agent")
    graph.add_edge("intent_agent", "priority_agent")
    graph.add_edge("priority_agent", "sentiment_agent")
    graph.add_edge("sentiment_agent", "customer_agent")
    graph.add_edge("customer_agent", "knowledge_agent")
    graph.add_edge("knowledge_agent", "prompt_builder")
    graph.add_edge("prompt_builder", "generator_agent")
    graph.add_edge("generator_agent", "validator_agent")

    if include_evaluation:
        from .evaluation.pipeline import (
            bertscore_node,
            embedding_evaluation_node,
            final_report_node,
        )

        graph.add_node("embedding_evaluation", embedding_evaluation_node)
        graph.add_node("bertscore", bertscore_node)
        graph.add_node("judge_agent", judge_agent)
        graph.add_node("final_report", final_report_node)

        graph.add_edge("validator_agent", "embedding_evaluation")
        graph.add_edge("embedding_evaluation", "bertscore")
        graph.add_edge("bertscore", "judge_agent")
        graph.add_edge("judge_agent", "final_report")
        graph.add_edge("final_report", END)
    else:
        graph.add_edge("validator_agent", END)

    return graph.compile()


def build_predict_graph() -> Any:
    """Build classification-only graph (intent, priority, sentiment, customer)."""
    graph = StateGraph(EmailState)

    graph.add_node("intent_agent", intent_agent)
    graph.add_node("priority_agent", priority_agent)
    graph.add_node("sentiment_agent", sentiment_agent)
    graph.add_node("customer_agent", customer_agent)

    graph.add_edge(START, "intent_agent")
    graph.add_edge("intent_agent", "priority_agent")
    graph.add_edge("priority_agent", "sentiment_agent")
    graph.add_edge("sentiment_agent", "customer_agent")
    graph.add_edge("customer_agent", END)

    return graph.compile()


_compiled_graph: Any = None
_predict_graph: Any = None
_generate_graph: Any = None


def get_full_graph() -> Any:
    """Full pipeline with evaluation — evaluation deps imported lazily inside build."""
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_email_graph(include_evaluation=True)
    return _compiled_graph


def get_generate_graph() -> Any:
    """Generation pipeline without evaluation."""
    global _generate_graph
    if _generate_graph is None:
        _generate_graph = build_email_graph(include_evaluation=False)
    return _generate_graph


def get_predict_graph() -> Any:
    """Classification-only graph."""
    global _predict_graph
    if _predict_graph is None:
        _predict_graph = build_predict_graph()
    return _predict_graph
