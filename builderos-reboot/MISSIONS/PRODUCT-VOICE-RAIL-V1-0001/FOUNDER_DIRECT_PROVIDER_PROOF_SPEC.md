<!-- SYNOPSIS: Founder Direct Provider — Production Regression Proof -->

# Founder Direct Provider — Production Regression Proof

**Mission:** `PRODUCT-VOICE-RAIL-V1-0001`  
**Blueprint step:** `VRV1-S07`  
**Run:** `npm run lifeos:founder-direct-provider:proof`  
**Requires:** `PUBLIC_BASE_URL`, `COMMAND_CENTER_KEY`  
**Receipt:** `products/receipts/FOUNDER_DIRECT_PROVIDER_PROOF.json`

Proves Adam's paid provider APIs are called **live** — no council, simulation, or wrapper theater.

---

## PASS conditions (all required)

| ID | Test | PASS condition |
|----|------|----------------|
| **FDP-T01** | Production health | `GET /api/v1/lifeos/voice-rail/health` → 200; `founder_direct_provider: true`; build ≥ voice-rail-v2.31 |
| **FDP-T02** | GPT → OpenAI live | `POST /founder-direct-provider` with `Talk to GPT: …` → `ok:true`, `provider:openai`, `model` set, `timestamp`, `raw_response` object, live `text` |
| **FDP-T03** | Claude → Anthropic live | Same for Claude → `provider:anthropic` |
| **FDP-T04** | Gemini → Google live | Same for Gemini → `provider:google` |
| **FDP-T05** | No council theater | Response `test:founder_direct_provider`; no `council_used:true`; HTTP not routed via council builder |
| **FDP-T06** | Raw provider receipt | Each provider response includes `request_id` when API returns one; `raw_response` is provider JSON (not synthetic string) |

## FAIL conditions (any one)

- Missing route or 404 on `/founder-direct-provider`
- `ok:false` with `missing_api_key` when keys should be set on Railway
- Provider field wrong (e.g. GPT labeled `anthropic`)
- Empty `raw_response` on success
- Response body lacks `timestamp` or `model`
- Proof run local-only without production base URL

## What PASS does NOT prove

- LifeOS system-agent repo search (separate proof)
- Voice Rail council modes
- Cost optimization across providers
