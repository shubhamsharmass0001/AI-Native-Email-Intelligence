#!/usr/bin/env python3
"""Build-phase script: create Chroma collection, embed knowledge, verify, exit.

Run locally or in CI — NEVER during FastAPI startup.

    python scripts/build_vector_store.py
    python scripts/build_vector_store.py --clear
    python scripts/build_vector_store.py --verify-only

Requires Python 3.10+ (3.12 recommended — matches Render runtime.txt).
"""

from __future__ import annotations

import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

MIN_PYTHON = (3, 10)


def _check_python() -> None:
    if sys.version_info < MIN_PYTHON:
        ver = ".".join(map(str, sys.version_info[:3]))
        need = ".".join(map(str, MIN_PYTHON))
        print(
            f"ERROR: Python {ver} detected. This project requires Python {need}+.\n"
            f"  Windows: py -V:Astral/CPython3.12.13 scripts/build_vector_store.py\n"
            f"  Or install Python 3.12 from https://www.python.org/downloads/",
            file=sys.stderr,
        )
        raise SystemExit(1)


def _check_deps() -> None:
    missing: list[str] = []
    for pkg in ("pydantic", "pydantic_settings", "chromadb"):
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg.replace("_settings", "-settings"))
    if missing:
        print(
            "ERROR: Missing Python packages: " + ", ".join(missing) + "\n\n"
            "Install project dependencies first (with venv activated):\n\n"
            "  pip install -r requirements.txt\n\n"
            "Windows note: ChromaDB may fail to compile on Windows (chroma-hnswlib).\n"
            "  Use GitHub Actions → 'Build Vector Store' workflow, or Linux/WSL:\n"
            "  .github/workflows/build-vector-store.yml",
            file=sys.stderr,
        )
        raise SystemExit(1)


def main() -> int:
    _check_python()
    _check_deps()
    parser = argparse.ArgumentParser(description="Build precomputed Chroma vector store")
    parser.add_argument("--clear", action="store_true", help="Delete existing collection first")
    parser.add_argument("--verify-only", action="store_true", help="Verify existing store only")
    args = parser.parse_args()

    from app.config import get_settings
    from app.services.vector_manager import VectorManager
    from app.utils.logger import setup_logging

    setup_logging()
    settings = get_settings()

    print("=" * 60)
    print("Vector Store Build Phase")
    print("=" * 60)
    print(f"Persist dir : {settings.chroma_persist_dir}")
    print(f"Embedding   : {settings.embedding_model} (Chroma DefaultEmbeddingFunction / ONNX)")
    print()

    VectorManager.reset()
    manager = VectorManager.instance()

    if args.verify_only:
        report = manager.verify_integrity()
        print("Verify report:", report)
        return 0 if report.get("ok") else 1

    count = manager.build(clear=args.clear)
    print(f"Embedded {count} documents")

    report = manager.verify_integrity()
    print("Integrity:", report)

    if not report.get("ok"):
        print("BUILD FAILED — vector store verification did not pass", file=sys.stderr)
        return 1

    print()
    print("SUCCESS — commit knowledge/vectorstore/ and deploy to Render.")
    print("Production startup will open this index without regenerating embeddings.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
