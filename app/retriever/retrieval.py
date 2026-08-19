"""Knowledge graph traversal and hybrid retrieval."""

from typing import Any

from ..config import get_settings
from .vector_store import get_vector_store
from ..utils.helpers import load_json
from ..utils.logger import get_logger

logger = get_logger(__name__)


class KnowledgeRetriever:
    """Traverses knowledge graph and retrieves relevant documents."""

    def __init__(self) -> None:
        settings = get_settings()
        self._graph = load_json(settings.knowledge_graph_path)
        self._vector_store = get_vector_store()
        self._top_k = settings.retrieval_top_k

    def get_nodes_for_intent(self, intent: str) -> list[str]:
        """Map intent to knowledge graph nodes."""
        mapping = self._graph.get("intent_to_node_mapping", {})
        return mapping.get(intent, ["Technical"])

    def traverse_graph(self, start_nodes: list[str], depth: int = 1) -> dict[str, Any]:
        """Traverse knowledge graph from start nodes including related nodes."""
        visited: set[str] = set()
        collected: dict[str, Any] = {"nodes": {}, "escalation_rules": []}

        def _visit(node_name: str, current_depth: int) -> None:
            if node_name in visited or current_depth > depth:
                return
            visited.add(node_name)

            node_data = self._graph.get("nodes", {}).get(node_name)
            if not node_data:
                return

            collected["nodes"][node_name] = {
                "description": node_data.get("description", ""),
                "policies": node_data.get("policies", []),
                "faqs": node_data.get("faqs", []),
                "templates": node_data.get("templates", []),
            }
            collected["escalation_rules"].extend(
                node_data.get("escalation_rules", [])
            )

            if current_depth < depth:
                for related in node_data.get("related_nodes", []):
                    _visit(related, current_depth + 1)

        for node in start_nodes:
            _visit(node, 0)

        return collected

    def retrieve(
        self,
        query: str,
        intent: str = "",
        knowledge_tags: list[str] | None = None,
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        """Hybrid retrieval: graph traversal + vector search."""
        start_nodes = self.get_nodes_for_intent(intent) if intent else ["Technical"]
        if knowledge_tags:
            for tag in knowledge_tags:
                tag_node = tag.title()
                if tag_node in self._graph.get("nodes", {}) and tag_node not in start_nodes:
                    start_nodes.append(tag_node)

        graph_context = self.traverse_graph(start_nodes, depth=1)

        search_query = query
        if intent:
            search_query = f"{intent}: {query}"

        vector_results = self._vector_store.query(search_query, top_k=self._top_k)

        if not vector_results and (
            not self._vector_store.is_ready or self._vector_store.document_count == 0
        ):
            if not self._vector_store.is_ready:
                logger.warning(
                    "Vector store not initialized — using graph-only retrieval. "
                    "Run: python scripts/build_vector_store.py"
                )
            else:
                logger.warning("Vector store empty, using graph-only retrieval")
            vector_results = self._fallback_from_graph(graph_context)

        logger.info(
            "Retrieved %d documents for intent=%s nodes=%s",
            len(vector_results),
            intent,
            start_nodes,
        )
        return vector_results, graph_context

    def _fallback_from_graph(self, graph_context: dict[str, Any]) -> list[dict[str, Any]]:
        """Fallback retrieval from graph when vector store is empty."""
        from ..config import FAQ_DIR, POLICIES_DIR, TEMPLATES_DIR

        results: list[dict[str, Any]] = []
        for node_name in graph_context.get("nodes", {}):
            node_info = graph_context["nodes"][node_name]
            for policy_file in node_info.get("policies", []):
                path = POLICIES_DIR / policy_file
                if path.exists():
                    data = load_json(path)
                    for policy in data.get("policies", [])[:1]:
                        results.append(
                            {
                                "id": policy["id"],
                                "content": f"{policy['title']}: {policy['content']}",
                                "score": 0.5,
                                "node": node_name,
                                "category": "policy",
                                "title": policy["title"],
                                "metadata": {},
                            }
                        )
            if len(results) >= 3:
                break
        return results[:3]

    def format_context(
        self,
        documents: list[dict[str, Any]],
        graph_context: dict[str, Any],
    ) -> str:
        """Format retrieved knowledge into prompt context string."""
        parts: list[str] = []

        for node_name, node_info in graph_context.get("nodes", {}).items():
            parts.append(f"## {node_name}: {node_info.get('description', '')}")

        for doc in documents:
            parts.append(
                f"[{doc['id']}] ({doc['node']}/{doc['category']}) {doc['title']}\n{doc['content']}"
            )

        escalation = graph_context.get("escalation_rules", [])
        if escalation:
            parts.append("## Escalation Rules")
            for rule in escalation:
                parts.append(
                    f"- {rule['condition']}: escalate to {rule['escalate_to']} (SLA: {rule['sla_hours']}h)"
                )

        return "\n\n".join(parts)


_retriever: KnowledgeRetriever | None = None


def get_retriever() -> KnowledgeRetriever:
    """Singleton retriever for dependency injection."""
    global _retriever
    if _retriever is None:
        _retriever = KnowledgeRetriever()
    return _retriever
