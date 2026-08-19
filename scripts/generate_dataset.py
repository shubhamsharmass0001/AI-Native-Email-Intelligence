#!/usr/bin/env python3
"""High-quality Hiver-style support email dataset generator (standalone, no torch)."""

import asyncio
import json
import os
import random
import re
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import typer
from anthropic import AsyncAnthropic
from rich.console import Console
from rich.progress import BarColumn, Progress, TextColumn, TimeRemainingColumn

from app.config import DATASET_DIR, get_settings
from app.constants import (
    CUSTOMER_TYPES,
    DATASET_SPLIT,
    EXAMPLES_PER_INTENT,
    INTENTS,
    PRIORITIES,
    SENTIMENTS,
    TOTAL_DATASET_SIZE,
)
from app.dataset_profiles import COMPANY_STYLE, HIVER_CONTEXT, INTENT_SCENARIOS
from app.utils.helpers import compute_hash, load_json, save_json
from app.utils.logger import setup_logging, get_logger

app = typer.Typer(help="Generate Hiver-quality synthetic support email dataset")
console = Console()
logger = get_logger(__name__)

GENERATION_PROMPT = """You are generating training data for an AI Email Copilot (like Hiver AI).

{hiver_context}

Generate ONE realistic customer support email and its ideal agent reply.

Intent: {intent}
Scenario: {scenario}
Company style (customer works at): {company}
Style notes: {style_notes}
Customer type: {customer_type}
Priority: {priority}
Sentiment: {sentiment}
Difficulty: {difficulty}
Variation seed: {seed}

Requirements:
- Email must feel like a real support ticket (subject + body, 4-10 sentences)
- Include concrete details: workspace name, plan tier, seat count, thread/ticket IDs as placeholders
- expected_response must be a complete, send-ready agent reply with empathy, policy-accurate steps, and professional close
- knowledge_tags must match support categories (billing, account, security, api, etc.)
- Do NOT use lorem ipsum or generic filler

Return ONLY valid JSON:
{{
  "customer_name": "<name>",
  "company": "{company}",
  "subject": "<subject>",
  "email": "<body>",
  "intent": "{intent}",
  "priority": "{priority}",
  "sentiment": "{sentiment}",
  "customer_type": "{customer_type}",
  "language": "en",
  "knowledge_tags": ["tag1", "tag2"],
  "difficulty": "{difficulty}",
  "expected_response": "<full agent reply>"
}}"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("{"):
        return json.loads(text)
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError("No JSON in response")


async def _call_claude(client: AsyncAnthropic, model: str, prompt: str) -> dict:
    response = await client.messages.create(
        model=model,
        max_tokens=2048,
        temperature=0.7,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    return _extract_json(text)


async def generate_single_email(
    client: AsyncAnthropic,
    model: str,
    intent: str,
    example_idx: int,
    seen_hashes: set[str],
    max_retries: int = 3,
) -> dict | None:
    company = random.choice(list(COMPANY_STYLE.keys()))
    customer_type = random.choice(CUSTOMER_TYPES)
    priority = random.choice(PRIORITIES)
    sentiment = random.choice(SENTIMENTS)
    difficulty = random.choice(["easy", "medium", "hard"])
    scenario = INTENT_SCENARIOS.get(intent, f"Support request about {intent.replace('_', ' ')}")
    seed = f"{intent}-{example_idx}-{random.randint(1000, 9999)}"

    prompt = GENERATION_PROMPT.format(
        hiver_context=HIVER_CONTEXT,
        intent=intent,
        scenario=scenario,
        company=company,
        style_notes=COMPANY_STYLE[company],
        customer_type=customer_type,
        priority=priority,
        sentiment=sentiment,
        difficulty=difficulty,
        seed=seed,
    )

    for attempt in range(max_retries):
        try:
            result = await _call_claude(client, model, prompt)
            email_text = result.get("email", "")
            if len(email_text) < 50:
                continue
            content_hash = compute_hash(email_text)
            if content_hash in seen_hashes:
                continue
            seen_hashes.add(content_hash)
            result["id"] = f"{intent}_{example_idx:03d}"
            result["intent"] = intent
            return result
        except Exception as exc:
            logger.error("Failed %s [%d] attempt %d: %s", intent, example_idx, attempt + 1, exc)
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
    return None


async def generate_dataset(output_dir: Path, incremental: bool = True, limit: int | None = None) -> None:
    settings = get_settings()
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    model = settings.anthropic_model

    output_dir.mkdir(parents=True, exist_ok=True)
    all_emails: list[dict] = []
    seen_hashes: set[str] = set()

    checkpoint_path = output_dir / "checkpoint.json"
    if incremental and checkpoint_path.exists():
        all_emails = load_json(checkpoint_path)
        seen_hashes = {compute_hash(e.get("email", "")) for e in all_emails}
        console.print(f"[yellow]Resuming: {len(all_emails)} emails[/yellow]")

    existing_ids = {e["id"] for e in all_emails}
    tasks_plan: list[tuple[str, int]] = []
    for intent in INTENTS:
        for idx in range(EXAMPLES_PER_INTENT):
            email_id = f"{intent}_{idx:03d}"
            if email_id not in existing_ids:
                tasks_plan.append((intent, idx))

    if limit:
        tasks_plan = tasks_plan[:limit]

    if not tasks_plan:
        console.print("[green]Dataset complete[/green]")
        _split_and_save(all_emails, output_dir)
        return

    console.print(f"[bold]Generating {len(tasks_plan)} emails with {model}[/bold]")

    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TimeRemainingColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Generating", total=len(tasks_plan))
        for intent, idx in tasks_plan:
            email = await generate_single_email(client, model, intent, idx, seen_hashes)
            if email:
                all_emails.append(email)
                if incremental:
                    save_json(checkpoint_path, all_emails)
            progress.advance(task)
            await asyncio.sleep(0.3)

    _split_and_save(all_emails, output_dir)
    if checkpoint_path.exists():
        checkpoint_path.unlink()
    console.print(f"[green]Done: {len(all_emails)} emails[/green]")


def _split_and_save(all_emails: list[dict], output_dir: Path) -> None:
    random.seed(42)
    shuffled = sorted(all_emails, key=lambda x: x.get("id", ""))
    random.shuffle(shuffled)

    train_size = DATASET_SPLIT["train"]
    val_size = DATASET_SPLIT["validation"]
    train = shuffled[:train_size]
    validation = shuffled[train_size : train_size + val_size]
    test = shuffled[train_size + val_size : train_size + val_size + DATASET_SPLIT["test"]]

    save_json(output_dir / "train.json", train)
    save_json(output_dir / "validation.json", validation)
    save_json(output_dir / "test.json", test)
    save_json(output_dir / "full.json", shuffled)
    console.print(f"Saved train={len(train)} val={len(validation)} test={len(test)}")


@app.command()
def generate(
    output_dir: Path = typer.Option(DATASET_DIR, "--output", "-o"),
    incremental: bool = typer.Option(True, "--incremental/--no-incremental"),
    limit: int | None = typer.Option(None, "--limit", help="Max emails to generate (for testing)"),
) -> None:
    """Generate dataset using Claude Sonnet 4.6+."""
    setup_logging()
    settings = get_settings()
    if not settings.anthropic_api_key:
        console.print("[red]ANTHROPIC_API_KEY missing. Add it to .env in project root.[/red]")
        raise typer.Exit(1)
    console.print(f"Model: [cyan]{settings.anthropic_model}[/cyan]")
    asyncio.run(generate_dataset(output_dir, incremental, limit))


@app.command()
def verify() -> None:
    """Verify API key and model access."""
    setup_logging()
    settings = get_settings()
    if not settings.anthropic_api_key:
        console.print("[red].env is empty or missing ANTHROPIC_API_KEY[/red]")
        raise typer.Exit(1)

    async def _test():
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        r = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=32,
            messages=[{"role": "user", "content": "Reply with OK"}],
        )
        return r.content[0].text

    try:
        result = asyncio.run(_test())
        console.print(f"[green]API OK[/green] model={settings.anthropic_model} response={result}")
    except Exception as exc:
        console.print(f"[red]API failed:[/red] {exc}")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
