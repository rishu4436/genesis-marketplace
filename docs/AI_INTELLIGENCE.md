# Genesis AI Intelligence

Marketplace brain powered by **xAI** when `XAI_API_KEY` is set.
Deterministic engines always work as fallback.

## Why not a simple chatbot

Research on agentic commerce (2026) stresses:

1. **Intent → ranked inventory** (not free chat)
2. **Structured catalog the AI can parse**
3. **Personalization from buyer state**
4. **Decision outputs** (plan, rec, CTA) not essays

Genesis AI does **orchestration + enrichment + concierge hire routing**.

## Features

| Feature | Endpoint | Value |
|---------|----------|--------|
| Orchestrate | `POST /api/ai/orchestrate` | Intent, rewritten brief, ranked specialists, plan of attack |
| Concierge | `POST /api/ai/concierge` | Hire advisor with CTAs |
| Report enrich | inside Full analysis | AI executive brief + hard rec on specialist plan |
| Status | `GET /api/ai/status` | Whether AI is live |

## Setup

```bash
# .env.local / Vercel
XAI_API_KEY=xai-...
XAI_MODEL=grok-4.5   # optional
```

Key from https://console.x.ai — server-side only.

## UI

- Home **AI match** uses orchestrate
- Floating **AI Concierge** bottom-right
- Full analysis tier auto-enriches when key present
