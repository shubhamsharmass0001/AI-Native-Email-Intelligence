#!/usr/bin/env python3
"""Validate package imports and environment (runs after bootstrap)."""

from __future__ import annotations

import os
import sys
import traceback

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


def _check_import(module: str) -> bool:
    try:
        __import__(module)
        print(f"  OK  {module}")
        return True
    except Exception as exc:
        print(f"  FAIL {module}: {exc}", file=sys.stderr)
        traceback.print_exc()
        return False


def main() -> int:
    print("=== Import validation ===")
    modules = [
        "app",
        "app.main",
        "app.config",
        "app.agents",
        "app.retriever",
        "app.services",
        "app.evaluation",
    ]
    ok = all(_check_import(m) for m in modules)

    print("\n=== Environment diagnostics ===")
    try:
        from app.config import get_settings
        from app.startup_validation import env_summary, validate_production_env

        settings = get_settings()
        for key, value in env_summary(settings).items():
            print(f"  {key}: {value}")

        if os.getenv("RENDER"):
            validate_production_env(settings)
            print("Environment validation: OK")
        else:
            print("Environment validation: skipped (not on Render)")
    except Exception:
        print("Environment validation failed", file=sys.stderr)
        traceback.print_exc()
        ok = False

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
