#!/usr/bin/env python3
"""Verify production runtime deps — does NOT import evaluation/torch modules."""

from __future__ import annotations

import importlib
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


def check(name: str, ok: bool, detail: str = "") -> bool:
    status = "OK" if ok else "FAIL"
    msg = f"[{status}] {name}"
    if detail:
        msg += f" — {detail}"
    print(msg)
    return ok


def main() -> int:
    print("=== Production Runtime Check (no evaluation imports) ===\n")
    ok = True

    ok &= check("Python >= 3.12", sys.version_info >= (3, 12), sys.version.split()[0])

    runtime_packages = [
        "fastapi",
        "uvicorn",
        "httpx",
        "orjson",
        "pydantic",
        "pydantic_settings",
        "langgraph",
        "langchain_core",
        "langchain_anthropic",
        "anthropic",
        "chromadb",
        "numpy",
        "sqlalchemy",
        "psycopg2",
        "jwt",
    ]
    print("\n--- Runtime packages ---")
    for pkg in runtime_packages:
        try:
            importlib.import_module(pkg)
            ok &= check(pkg, True)
        except ImportError as exc:
            ok &= check(pkg, False, str(exc))

    excluded = ["torch", "bert_score", "sentence_transformers"]
    print("\n--- Excluded from production (should be absent) ---")
    for pkg in excluded:
        try:
            importlib.import_module(pkg)
            ok &= check(f"{pkg} not installed", False, "present — use requirements-evaluation.txt only locally")
        except ImportError:
            check(f"{pkg} not installed", True)

    print("\n--- Application startup ---")
    try:
        from app.main import app  # noqa: F401

        ok &= check("app.main:app", True)
    except Exception as exc:
        ok &= check("app.main:app", False, str(exc))

    print("\n--- Providers ---")
    try:
        from app.config import get_settings

        s = get_settings()
        ok &= check("Anthropic key", bool(s.anthropic_api_key), "optional")
        ok &= check("Gemini key", bool(s.effective_gemini_key), "optional")
    except Exception as exc:
        ok &= check("config", False, str(exc))

    try:
        from app.db.database import database_enabled, init_db

        ok &= check("PostgreSQL configured", database_enabled(), "optional")
        if database_enabled():
            ok &= check("Database init", init_db())
    except Exception as exc:
        ok &= check("database", False, str(exc))

    try:
        from app.auth.clerk import clerk_enabled

        check("Clerk auth configured", clerk_enabled(), "optional")
    except Exception as exc:
        ok &= check("clerk", False, str(exc))

    print("\n--- LangGraph (generate path, no evaluation nodes) ---")
    try:
        from app.graph import get_generate_graph

        g = get_generate_graph()
        ok &= check("LangGraph generate graph", g is not None)
    except Exception as exc:
        ok &= check("LangGraph generate graph", False, str(exc))

    print("\n--- ChromaDB ---")
    try:
        from app.retriever.vector_store import get_vector_store

        vs = get_vector_store()
        check("ChromaDB", True, f"{vs.document_count} documents")
    except Exception as exc:
        ok &= check("ChromaDB", False, str(exc))

    print("\n=== Summary ===")
    if ok:
        print("Production runtime ready.")
        return 0
    print("Some checks failed.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
