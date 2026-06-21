<!-- SYNOPSIS: FACTORY-REBOOT-0031 — Role-Based Council Routing -->

# FACTORY-REBOOT-0031 — Role-Based Council Routing

**Status:** QUEUED — spec ready; BLUEPRINT steps pending BPB materialization  
**Type:** Factory / platform (improves builder — not a product mission)

## Problem

Production routing uses **task types** that collapse to **Gemini Flash**. Factory departments (AIC, BPB, Coder, SENTRY) do not drive model selection.

See: `docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md`

## Outcome

Requests resolve **department first**, then **provider pool** per `prompts/00-PROVIDER-STRATEGY-LOCK.md`.

## Read first

1. `prompts/00-PROVIDER-STRATEGY-LOCK.md`
2. `docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md`
3. `ROLE_BASED_COUNCIL_ROUTING_SPEC.md` (this folder)

## Verify (after implementation)

```bash
npm run factory:ci
# + new script or acceptance: department routing smoke
curl -H "x-command-key: $COMMAND_CENTER_KEY" \
  "$PUBLIC_BASE_URL/api/v1/lifeos/builder/model-map" | jq '.departments'
```

## Authority

- **Production spine** targets: `config/`, `services/builderos-routing-policy.js`, `routes/lifeos-council-builder-routes.js`
- **Not** factory-staging council quarantine lift (separate cutover)

## Non-goals

- Adding new API keys as the first step
- Merging factory-staging execute-step with production builder
- Product features (Conversation Commitments — separate mission)
