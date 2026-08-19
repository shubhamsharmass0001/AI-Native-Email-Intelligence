"""Quick smoke test for the LLM gateway and provider failover."""

import asyncio
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.config import get_settings
from app.llm.gateway import get_llm_gateway


async def main() -> None:
    get_settings.cache_clear()
    global _gateway  # noqa: PLW0603
    import app.llm.gateway as gw

    gw._gateway = None
    gateway = get_llm_gateway()
    result, metrics = await gateway.generate(
        'Return JSON only: {"status": "ok"}',
        parse_json=True,
    )
    print("provider:", metrics.get("provider"))
    print("model:", metrics.get("model"))
    print("retries:", metrics.get("retries"))
    print("fallback_used:", metrics.get("fallback_used"))
    print("result:", result)
    print("stats:", gateway.stats.to_dict())


if __name__ == "__main__":
    asyncio.run(main())
