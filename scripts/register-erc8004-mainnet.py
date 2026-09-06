"""Register one Genesis specialist on BSC mainnet ERC-8004.

Skips the 8004scan index (currently 500s) and mints on the identity registry.
Requires WALLET_PASSWORD and cwd = studio/<Agent>/app/agent.
Does not print secrets.
"""

from __future__ import annotations

import os
import sys

# Skip 8004scan get_all_agents (CLI dies on 500 before broadcasting).
from bnbagent_studio_core.erc8004 import helpers

helpers._find_owned_agent = lambda sdk: None  # type: ignore[method-assign]

from bnbagent_studio_core.wallet import get_wallet
from bnbagent_studio_core.erc8004.helpers import register

AGENTS = {
    "range-keeper": {
        "name": "RangeKeeper",
        "endpoint": "https://genesis-marketplace-one.vercel.app/api/apex/range-keeper",
        "description": "Genesis marketplace specialist for PancakeSwap V3 LP rebalance plans. Plan only, no fund custody.",
    },
    "gridwright": {
        "name": "Gridwright",
        "endpoint": "https://genesis-marketplace-one.vercel.app/api/apex/gridwright",
        "description": "Genesis marketplace specialist for BSC grid trading layouts. Plan only, no fund custody.",
    },
    "yield-router": {
        "name": "YieldRouter",
        "endpoint": "https://genesis-marketplace-one.vercel.app/api/apex/yield-router",
        "description": "Genesis marketplace specialist for USDT yield routing on BSC. Plan only, no fund custody.",
    },
    "health-sentinel": {
        "name": "HealthSentinel",
        "endpoint": "https://genesis-marketplace-one.vercel.app/api/apex/health-sentinel",
        "description": "Genesis marketplace specialist for health-factor protection plans. Plan only, no fund custody.",
    },
}


def main() -> int:
    slug = sys.argv[1] if len(sys.argv) > 1 else ""
    spec = AGENTS.get(slug)
    if not spec:
        print(f"usage: register-erc8004-mainnet.py <{'|'.join(AGENTS)}>", file=sys.stderr)
        return 2
    if not os.environ.get("WALLET_PASSWORD"):
        print("error: WALLET_PASSWORD is not set", file=sys.stderr)
        return 2

    wallet = get_wallet()
    print(f"slug={slug} wallet={wallet.address} name={spec['name']}")
    agent_id = register(
        wallet,
        endpoint=spec["endpoint"],
        network="bsc-mainnet",
        name=spec["name"],
        description=spec["description"],
        protocol="A2A",
        version="0.3.0",
    )
    print(f"registered agent_id={agent_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
