<!-- SYNOPSIS: FACTORY-DEMO-SAMPLE-0001 — End-to-End BuilderOS Demo -->

# FACTORY-DEMO-SAMPLE-0001 — End-to-End BuilderOS Demo

Mission: prove BuilderOS can move from founder intent to shipped, verified code with no human design decisions.

## Inputs
- `builderos-reboot/MISSIONS/FACTORY-DEMO-SAMPLE-0001/FOUNDER_PACKET.json`
- `builderos-reboot/MISSIONS/FACTORY-DEMO-SAMPLE-0001/PRODUCT_DEVELOPMENT_RESULT.json`
- `builderos-reboot/MISSIONS/FACTORY-DEMO-SAMPLE-0001/DELIBERATION_GATE.json`
- `builderos-reboot/MISSIONS/FACTORY-DEMO-SAMPLE-0001/BLUEPRINT.json`

## Step executed
- `node scripts/run-factory-demo-sample.mjs` invoked `dispatchExecuteMission({ mission_id: 'FACTORY-DEMO-SAMPLE-0001' })`.
- BPB intake gate passed.
- `runWriteFileExact` wrote `public/factory-demo-widget.mjs`.
- SENTRY Layer A behavior assertions passed:
  - `file_contains`: `export function greet`
  - `exports_smoke`: `greet`
  - `function_behavior_test`: `greet('Factory')` returns `{ message: 'Hello Factory', ok: true }`

## Deploy evidence
- Production URL: `https://lumin-web-production-e3a9.up.railway.app/factory-demo-widget.mjs`
- Deploy SHA: `84d15ae313861ab87424cfa0f390baba2aa53bcc`
- SENTRY smoke receipt: `products/receipts/SENTRY_PASS_sentry-smoke_sentry-1785529967756.json`

## Conclusion
BuilderOS executed a full idea → founder packet → blueprint → code → SENTRY PASS → deploy cycle autonomously. Revenue is a product-stage gate, not part of this builder-capacity proof.
