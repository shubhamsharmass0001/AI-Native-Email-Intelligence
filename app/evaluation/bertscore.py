"""BERTScore evaluation module."""

from ..utils.logger import get_logger

logger = get_logger(__name__)

_bertscore_loaded = False
_bertscore_fn = None


def _load_bertscore():
    global _bertscore_loaded, _bertscore_fn
    if _bertscore_loaded:
        return _bertscore_fn
    try:
        from bert_score import score as bert_score_fn

        _bertscore_fn = bert_score_fn
        _bertscore_loaded = True
        logger.info("BERTScore loaded successfully")
    except ImportError:
        logger.warning("bert-score not available, using fallback")
        _bertscore_loaded = True
    return _bertscore_fn


def compute_bertscore(
    candidate: str,
    reference: str,
    lang: str = "en",
) -> dict[str, float]:
    """Compute BERTScore F1, precision, and recall."""
    if not candidate.strip() or not reference.strip():
        return {"precision": 0.0, "recall": 0.0, "f1": 0.0}

    bert_fn = _load_bertscore()
    if bert_fn is None:
        return _fallback_similarity(candidate, reference)

    try:
        precision, recall, f1 = bert_fn(
            [candidate],
            [reference],
            lang=lang,
            verbose=False,
        )
        return {
            "precision": round(float(precision[0]), 4),
            "recall": round(float(recall[0]), 4),
            "f1": round(float(f1[0]), 4),
        }
    except Exception as exc:
        logger.error("BERTScore computation failed: %s", exc)
        return _fallback_similarity(candidate, reference)


def _token_overlap_ratio(candidate: str, reference: str) -> float:
    """Pure-Python fallback when evaluation packages are not installed."""
    cand_tokens = set(candidate.lower().split())
    ref_tokens = set(reference.lower().split())
    if not cand_tokens or not ref_tokens:
        return 0.0
    return len(cand_tokens & ref_tokens) / len(cand_tokens | ref_tokens)


def _fallback_similarity(candidate: str, reference: str) -> dict[str, float]:
    """Fallback when BERTScore / RapidFuzz unavailable."""
    try:
        from rapidfuzz import fuzz

        ratio = fuzz.token_sort_ratio(candidate, reference) / 100.0
    except ImportError:
        ratio = _token_overlap_ratio(candidate, reference)
    return {"precision": ratio, "recall": ratio, "f1": ratio}
