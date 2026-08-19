#!/usr/bin/env python3
"""Generate embeddings for knowledge documents (alias for embed_knowledge)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if __name__ == "__main__":
    from scripts.embed_knowledge import app

    app()
