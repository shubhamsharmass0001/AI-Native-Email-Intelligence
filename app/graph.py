"""LangGraph orchestration for the email intelligence pipeline."""

from typing import Any

from langgraph.graph import END, START, StateGraph

from .agents.classification_agent import classification_agent
from .agents.generator_agent import generator_agent, prompt_builder
from .agents.judge_agent import judge_agent
from .agents.knowledge_agent import knowledge_agent
from .agents.validator_agent import validator_agent
from .state import EmailState
from .utils.logger import get_logger

logger = get_logger(__name__)


def build_email_graph(include_evaluation: bool = True) -> Any:
    """Build and compile the LangGraph workflow."""
    graph = StateGraph(EmailState)

    graph.add_node("classification_agent", classification_agent)
    graph.add_node("knowledge_agent", knowledge_agent)
    graph.add_node("prompt_builder", prompt_builder)
    graph.add_node("generator_agent", generator_agent)
    graph.add_node("validator_agent", validator_agent)

    graph.add_edge(START, "classification_agent")
    graph.add_edge("classification_agent", "knowledge_agent")
    graph.add_edge("knowledge_agent", "prompt_builder")
    graph.add_edge("prompt_builder", "generator_agent")
    graph.add_edge("generator_agent", "validator_agent")

    if include_evaluation:
        from .evaluation.pipeline import (
            final_report_node,
            parallel_evaluation_node,
        )

        graph.add_node("parallel_evaluation", parallel_evaluation_node)
        graph.add_node("final_report", final_report_node)

        graph.add_edge("validator_agent", "parallel_evaluation")
        graph.add_edge("parallel_evaluation", "final_report")
        graph.add_edge("final_report", END)
    else:
        graph.add_edge("validator_agent", END)

    return graph.compile()


def build_predict_graph() -> Any:
    """Build classification-only graph (intent, priority, sentiment, customer in 1 unified call)."""
    graph = StateGraph(EmailState)

    graph.add_node("classification_agent", classification_agent)

    graph.add_edge(START, "classification_agent")
    graph.add_edge("classification_agent", END)

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
