#!/usr/bin/env python3
"""CLI for local development — production uses: bash start.sh"""

import asyncio
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import typer
from rich.console import Console
from rich.table import Table

from app.config import DATASET_DIR, get_settings
from app.graph import get_full_graph, get_generate_graph
from app.utils.helpers import load_json
from app.utils.logger import setup_logging

app = typer.Typer(help="AI Email Intelligence Platform CLI")
console = Console()


@app.command()
def serve(
    host: str = typer.Option("0.0.0.0", "--host"),
    port: int = typer.Option(8000, "--port"),
    reload: bool = typer.Option(False, "--reload"),
) -> None:
    """Start the FastAPI server."""
    import uvicorn

    uvicorn.run("app.main:app", host=host, port=port, reload=reload)


@app.command()
def evaluate_dataset(
    split: str = typer.Option("test", "--split", help="Dataset split: test, validation"),
    limit: int = typer.Option(5, "--limit", help="Number of emails to evaluate"),
) -> None:
    """Run evaluation pipeline on dataset split."""
    setup_logging()
    dataset_path = DATASET_DIR / f"{split}.json"

    if not dataset_path.exists():
        console.print(f"[red]Dataset not found: {dataset_path}[/red]")
        raise typer.Exit(1)

    emails = load_json(dataset_path)[:limit]
    graph = get_full_graph()

    async def _run() -> None:
        table = Table(title=f"Evaluation Results ({split}, n={len(emails)})")
        table.add_column("ID")
        table.add_column("Intent")
        table.add_column("Overall Score")
        table.add_column("BERTScore F1")
        table.add_column("Embedding Sim")

        for email_data in emails:
            state = {
                "subject": email_data["subject"],
                "email": email_data["email"],
                "customer_name": email_data.get("customer_name", "Customer"),
                "company": email_data.get("company", ""),
                "expected_response": email_data.get("expected_response", ""),
                "node_metrics": {},
                "errors": [],
            }
            try:
                result = await graph.ainvoke(state)
                table.add_row(
                    email_data["id"],
                    result.get("intent", ""),
                    str(result.get("overall_score", 0.0)),
                    str(result.get("bertscore", {}).get("f1", 0.0)),
                    str(result.get("embedding_score", {}).get("cosine_similarity", 0.0)),
                )
            except Exception as exc:
                table.add_row(email_data["id"], "ERROR", str(exc), "", "")

        console.print(table)

    asyncio.run(_run())


@app.command()
def generate_reply(
    subject: str = typer.Argument(...),
    email: str = typer.Argument(...),
    customer_name: str = typer.Option("Customer", "--name"),
) -> None:
    """Generate a reply for a single email."""
    setup_logging()
    graph = get_generate_graph()

    async def _run() -> None:
        state = {
            "subject": subject,
            "email": email,
            "customer_name": customer_name,
            "company": "",
            "node_metrics": {},
            "errors": [],
        }
        result = await graph.ainvoke(state)
        reply = result.get("generated_reply", {})
        console.print("\n[bold green]Generated Reply:[/bold green]")
        console.print(reply.get("reply", ""))
        console.print(f"\nConfidence: {reply.get('confidence', 0.0)}")
        console.print(f"Intent: {result.get('intent', '')}")

    asyncio.run(_run())


if __name__ == "__main__":
    app()
