"""Embedding cosine similarity evaluation."""

from ..retriever.embeddings import get_embedding_service
from ..utils.logger import get_logger

logger = get_logger(__name__)


def compute_embedding_similarity(
    candidate: str,
    reference: str,
) -> dict[str, float]:
    """Compute cosine similarity between candidate and reference embeddings."""
    if not candidate.strip() or not reference.strip():
        return {"cosine_similarity": 0.0}

    try:
        service = get_embedding_service()
        candidate_emb = service.embed_text(candidate)
        reference_emb = service.embed_text(reference)
        similarity = service.cosine_similarity(candidate_emb, reference_emb)
        return {"cosine_similarity": round(similarity, 4)}
    except Exception as exc:
        logger.error("Embedding similarity failed: %s", exc)
        return {"cosine_similarity": 0.0}
