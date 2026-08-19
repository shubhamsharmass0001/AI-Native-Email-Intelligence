#!/usr/bin/env bash
set -e

export OPENBLAS_NUM_THREADS="${OPENBLAS_NUM_THREADS:-1}"
export OMP_NUM_THREADS="${OMP_NUM_THREADS:-1}"

pip install --upgrade pip
pip install -r requirements.txt

# Optional: index knowledge at build time (non-fatal — lifespan retries)
python - <<'PY' || echo "WARN: embed step skipped — will retry at startup"
from app.retriever.vector_store import get_vector_store

vs = get_vector_store()
if vs.document_count == 0:
    count = vs.ingest_policies()
    print(f"Ingested {count} documents")
else:
    print(f"Chroma already indexed: {vs.document_count} documents")
PY
