"""Embedding service with lazy loading and lightweight fallbacks."""

from functools import lru_cache
from typing import Any

import numpy as np

from ..config import get_settings
from ..utils.logger import get_logger

logger = get_logger(__name__)

_model: Any = None
_model_name: str | None = None


def _load_model(model_name: str) -> Any:
    """Lazy-load SentenceTransformer to avoid heavy imports at startup."""
    global _model, _model_name
    if _model is not None and _model_name == model_name:
        return _model
    try:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading embedding model: %s", model_name)
        _model = SentenceTransformer(model_name)
        _model_name = model_name
        return _model
    except Exception as exc:
        logger.warning("SentenceTransformer unavailable (%s), using fallback", exc)
        return None


class EmbeddingService:
    """Local embedding generation with graceful degradation."""

    def __init__(self, model_name: str | None = None) -> None:
        settings = get_settings()
        self._model_name = model_name or settings.embedding_model
        self._model = None

    @property
    def model(self) -> Any:
        if self._model is None:
            self._model = _load_model(self._model_name)
        return self._model

    def embed_text(self, text: str) -> list[float]:
        if self.model is None:
            return _hash_embedding(text)
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def embed_batch(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        if self.model is None:
            return [_hash_embedding(t) for t in texts]
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            show_progress_bar=len(texts) > 50,
        )
        return [emb.tolist() for emb in embeddings]

    def cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        a = np.array(vec_a, dtype=float)
        b = np.array(vec_b, dtype=float)
        dot = np.dot(a, b)
        norm = np.linalg.norm(a) * np.linalg.norm(b)
        if norm == 0:
            return 0.0
        return float(dot / norm)

    @property
    def dimension(self) -> int:
        if self.model is not None:
            return self.model.get_sentence_embedding_dimension()
        return 384


def _hash_embedding(text: str, dim: int = 384) -> list[float]:
    """Deterministic lightweight embedding fallback (no torch required)."""
    import hashlib

    vec = np.zeros(dim, dtype=float)
    for i, token in enumerate(text.lower().split()):
        h = int(hashlib.md5(token.encode()).hexdigest(), 16)
        vec[h % dim] += 1.0 / (i + 1)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec.tolist()


@lru_cache
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()
