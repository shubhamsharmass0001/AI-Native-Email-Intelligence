"""Knowledge retrieval agent."""

from ..retriever.retrieval import get_retriever
from ..state import EmailState
from ..utils.helpers import merge_node_metrics
from ..utils.logger import get_logger, log_node_execution

logger = get_logger(__name__)


async def knowledge_agent(state: EmailState) -> dict:
    """Retrieve relevant knowledge via graph traversal and vector search."""
    query = f"{state.get('subject', '')} {state.get('email', '')}"
    with log_node_execution(logger, "knowledge_agent", query[:200]) as metrics:
        retriever = get_retriever()
        documents, graph_context = retriever.retrieve(
            query=query,
            intent=state.get("intent", ""),
        )
        knowledge_context = retriever.format_context(documents, graph_context)
        metrics["output_summary"] = f"retrieved {len(documents)} docs"

        return {
            "retrieved_documents": documents,
            "knowledge": {
                "graph": graph_context,
                "context": knowledge_context,
            },
            **merge_node_metrics(state, "knowledge_agent", metrics),
        }
