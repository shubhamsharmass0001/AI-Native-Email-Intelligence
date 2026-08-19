# Render Production Deployment

## Render Dashboard Settings

| Setting | Value |
|---------|--------|
| **Root Directory** | *(blank — repo root)* |
| **Build Command** | `pip install -r requirements.txt` |
| **Pre-Deploy Command** | *(blank — do NOT run build_vector_store here)* |
| **Start Command** | `bash start.sh` |
| **Health Check Path** | `/health` |

## Pre-deploy: build vector store locally

Render Free (512MB) **cannot** embed documents at startup. Build offline and commit:

```bash
python scripts/build_vector_store.py
git add knowledge/vectorstore/
git commit -m "chore: prebuilt vector store"
git push origin main
```

Render only **opens** `knowledge/vectorstore/` — never regenerates embeddings.

## Required Environment Variables

Paste these in **Render → your service → Environment**:

```env
# LLM — at least one API key
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash-lite
GEMINI_API_KEY=AIza...

DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_live_...
CLERK_ISSUER=https://xxx.clerk.accounts.dev
CLERK_JWKS_URL=https://xxx.clerk.accounts.dev/.well-known/jwks.json
CORS_ORIGINS=https://ainativeemail.vercel.app
CHROMA_PERSIST_DIR=./knowledge/vectorstore
```

## Startup behavior (512MB-safe)

On boot the server logs only:

```
✓ Database connected
✓ FastAPI started
✓ Routes registered
✓ Environment OK
```

No Chroma, no ONNX download, no ingestion.

## Health URLs

```
GET /health  → {"status":"healthy","version":"..."}     # Render probe, <100ms
GET /status  → vector store + LLM config (dashboard)  # lazy Chroma metadata
```

## Git Commands

```bash
git add -A
git commit -m "fix: lazy vector store init for Render 512MB"
git push origin main
```

See [README.md](./README.md) → **Production Startup Architecture** for RAM estimates.
