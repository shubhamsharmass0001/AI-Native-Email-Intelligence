"""ChromaDB vector store — delegates to lazy VectorManager."""

from typing import Any

from ..services.vector_manager import NOT_INITIALIZED_MSG, VectorManager, get_vector_manager
from ..utils.logger import get_logger

logger = get_logger(__name__)

__all__ = ["VectorStore", "get_vector_store", "NOT_INITIALIZED_MSG"]


class VectorStore:
    """Backward-compatible facade over VectorManager."""

    def __init__(self) -> None:
        self._manager = get_vector_manager()

    @property
    def document_count(self) -> int:
        return self._manager.document_count

    @property
    def is_ready(self) -> bool:
        return self._manager.is_ready

    def add_documents(
        self,
        ids: list[str],
        documents: list[str],
        metadatas: list[dict[str, Any]],
    ) -> None:
        self._manager.add_documents(ids, documents, metadatas)

    def query(self, query_text: str, top_k: int = 3) -> list[dict[str, Any]]:
        return self._manager.query(query_text, top_k=top_k)

    def ingest_policies(self) -> int:
        """Deprecated for runtime — use scripts/build_vector_store.py instead."""
        logger.warning("ingest_policies() is for build scripts only; prefer build_vector_store.py")
        ids, documents, metadatas = self._manager.collect_knowledge_documents()
        if ids:
            self._manager.add_documents(ids, documents, metadatas)
        return len(ids)

    def clear(self) -> None:
        self._manager.clear()


_vector_store: VectorStore | None = None


def get_vector_store() -> VectorStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store
