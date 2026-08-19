"""Lazy ChromaDB vector store manager — no heavy init at import or startup."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from ..config import KNOWLEDGE_DIR, POLICIES_DIR, get_settings
from ..utils.helpers import load_json
from ..utils.logger import get_logger

logger = get_logger(__name__)

COLLECTION_NAME = "knowledge_documents"
NOT_INITIALIZED_MSG = (
    "Vector store not initialized. Run locally or in CI: python scripts/build_vector_store.py"
)


class VectorManager:
    """Singleton that lazily opens Chroma, collection, and embedding function."""

    _instance: VectorManager | None = None

    def __init__(self) -> None:
        self._client: Any = None
        self._collection: Any = None
        self._embedding_fn: Any = None
        self._ready: bool | None = None

    @classmethod
    def instance(cls) -> VectorManager:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        """Reset singleton — for tests and build script."""
        cls._instance = None

    @property
    def persist_dir(self) -> Path:
        return Path(get_settings().chroma_persist_dir)

    def _ensure_client(self) -> Any:
        if self._client is not None:
            return self._client
        import chromadb
        from chromadb.config import Settings as ChromaSettings

        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.debug("Chroma PersistentClient opened at %s", self.persist_dir)
        return self._client

    def _ensure_embedding_fn(self) -> Any:
        """Load ONNX MiniLM only when a query/build embedding is required."""
        if self._embedding_fn is not None:
            return self._embedding_fn
        from chromadb.utils import embedding_functions

        self._embedding_fn = embedding_functions.DefaultEmbeddingFunction()
        logger.info("Embedding function loaded (all-MiniLM-L6-v2 ONNX)")
        return self._embedding_fn

    def get_collection(self, *, create: bool = False) -> Any | None:
        """Open existing collection without attaching an embedding function."""
        if self._collection is not None:
            return self._collection

        client = self._ensure_client()
        try:
            self._collection = client.get_collection(name=COLLECTION_NAME)
            return self._collection
        except Exception:
            if create:
                self._collection = client.create_collection(
                    name=COLLECTION_NAME,
                    embedding_function=self._ensure_embedding_fn(),
                    metadata={"hnsw:space": "cosine"},
                )
                return self._collection
            return None

    @property
    def is_ready(self) -> bool:
        if self._ready is None:
            try:
                col = self.get_collection()
                self._ready = col is not None and col.count() > 0
            except Exception:
                self._ready = False
        return self._ready

    @property
    def document_count(self) -> int:
        col = self.get_collection()
        if col is None:
            return 0
        try:
            return col.count()
        except Exception:
            return 0

    def status(self) -> dict[str, Any]:
        """Lightweight status for /status — touches Chroma metadata only."""
        count = self.document_count
        return {
            "vector_store_ready": count > 0,
            "document_count": count,
            "persist_dir": str(self.persist_dir),
            "warning": "" if count > 0 else NOT_INITIALIZED_MSG,
        }

    def query(self, query_text: str, top_k: int = 3) -> list[dict[str, Any]]:
        """Semantic search — lazy-loads embedding fn for query vector only."""
        col = self.get_collection()
        if col is None or col.count() == 0:
            logger.warning(NOT_INITIALIZED_MSG)
            return []

        ef = self._ensure_embedding_fn()
        query_embeddings = ef([query_text])
        results = col.query(
            query_embeddings=query_embeddings,
            n_results=min(top_k, col.count()),
            include=["documents", "metadatas", "distances"],
        )

        documents: list[dict[str, Any]] = []
        if not results["ids"] or not results["ids"][0]:
            return documents

        for i, doc_id in enumerate(results["ids"][0]):
            distance = results["distances"][0][i] if results["distances"] else 0.0
            score = 1.0 - distance
            metadata = results["metadatas"][0][i] if results["metadatas"] else {}
            documents.append(
                {
                    "id": doc_id,
                    "content": results["documents"][0][i],
                    "score": round(score, 4),
                    "node": metadata.get("node", ""),
                    "category": metadata.get("category", ""),
                    "title": metadata.get("title", ""),
                    "metadata": metadata,
                }
            )
        return documents

    def add_documents(
        self,
        ids: list[str],
        documents: list[str],
        metadatas: list[dict[str, Any]],
    ) -> None:
        col = self.get_collection(create=True)
        if col is None:
            raise RuntimeError("Failed to create Chroma collection")
        safe_metas = [_sanitize_metadata(m) for m in metadatas]
        col.upsert(ids=ids, documents=documents, metadatas=safe_metas)
        self._ready = True
        logger.info("Upserted %d documents into vector store", len(ids))

    def collect_knowledge_documents(self) -> tuple[list[str], list[str], list[dict[str, Any]]]:
        """Load policy + FAQ documents from knowledge/ JSON files."""
        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict[str, Any]] = []

        for policy_file in sorted(POLICIES_DIR.glob("*.json")):
            data = load_json(policy_file)
            node = data.get("node", policy_file.stem.title())
            for policy in data.get("policies", []):
                doc_id = policy["id"]
                content = f"{policy['title']}: {policy['content']}"
                ids.append(doc_id)
                documents.append(content)
                metadatas.append(
                    {
                        "node": node,
                        "category": "policy",
                        "title": policy["title"],
                        "tags": ",".join(policy.get("tags", [])),
                        "source_file": policy_file.name,
                    }
                )

        faq_dir = KNOWLEDGE_DIR / "faq"
        for faq_file in sorted(faq_dir.glob("*.json")):
            data = load_json(faq_file)
            node = data.get("node", "General")
            for idx, faq in enumerate(data.get("faqs", [])):
                doc_id = f"faq-{node.lower()}-{idx}"
                content = f"Q: {faq['question']} A: {faq['answer']}"
                ids.append(doc_id)
                documents.append(content)
                metadatas.append(
                    {
                        "node": node,
                        "category": "faq",
                        "title": faq["question"],
                        "tags": "",
                        "source_file": faq_file.name,
                    }
                )

        return ids, documents, metadatas

    def build(self, *, clear: bool = False) -> int:
        """BUILD PHASE ONLY — create collection, embed all documents, verify."""
        if clear and self._client is not None:
            try:
                self._client.delete_collection(COLLECTION_NAME)
            except Exception:
                pass
            self._collection = None
            self._ready = None

        self._collection = None
        col = self.get_collection(create=True)
        if col is None:
            raise RuntimeError("Could not create Chroma collection")

        ids, documents, metadatas = self.collect_knowledge_documents()
        if not ids:
            raise RuntimeError("No knowledge documents found under knowledge/policies and knowledge/faq")

        self.add_documents(ids, documents, metadatas)
        return len(ids)

    def verify_integrity(self) -> dict[str, Any]:
        """Verify prebuilt vector store is usable."""
        count = self.document_count
        result: dict[str, Any] = {
            "ok": count > 0,
            "document_count": count,
            "persist_dir": str(self.persist_dir),
            "sample_query_ok": False,
        }
        if count == 0:
            result["error"] = NOT_INITIALIZED_MSG
            return result

        try:
            hits = self.query("billing refund policy", top_k=1)
            result["sample_query_ok"] = len(hits) > 0
            result["ok"] = result["sample_query_ok"]
            if hits:
                result["sample_hit"] = hits[0].get("id", "")
        except Exception as exc:
            result["error"] = str(exc)
            result["ok"] = False

        return result

    def clear(self) -> None:
        if self._client is None:
            self._ensure_client()
        try:
            self._client.delete_collection(COLLECTION_NAME)  # type: ignore[union-attr]
        except Exception:
            pass
        self._collection = None
        self._ready = False


def _sanitize_metadata(meta: dict[str, Any]) -> dict[str, str | int | float | bool]:
    clean: dict[str, str | int | float | bool] = {}
    for k, v in meta.items():
        if isinstance(v, (str, int, float, bool)):
            clean[k] = v
        else:
            clean[k] = str(v)
    return clean


def get_vector_manager() -> VectorManager:
    return VectorManager.instance()
