#!/usr/bin/env python3
"""Embed knowledge base policies into ChromaDB (delegates to build_vector_store)."""

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import typer
from rich.console import Console

console = Console()
app = typer.Typer(help="Embed knowledge base into ChromaDB (build phase)")


@app.command()
def embed(
    clear: bool = typer.Option(False, "--clear", help="Clear existing embeddings first"),
) -> None:
    """Build vector store — prefer: python scripts/build_vector_store.py"""
    argv = [sys.executable, os.path.join(ROOT, "scripts", "build_vector_store.py")]
    if clear:
        argv.append("--clear")
    os.execv(sys.executable, argv)


if __name__ == "__main__":
    app()
