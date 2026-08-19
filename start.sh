#!/usr/bin/env bash
set -e

export PYTHONPATH="$(pwd)"
export OPENBLAS_NUM_THREADS="${OPENBLAS_NUM_THREADS:-1}"
export OMP_NUM_THREADS="${OMP_NUM_THREADS:-1}"

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000}
