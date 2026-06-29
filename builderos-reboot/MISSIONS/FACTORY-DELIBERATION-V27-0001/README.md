<!-- SYNOPSIS: FACTORY-DELIBERATION-V27-0001 — Deliberation governance A→Z -->

# FACTORY-DELIBERATION-V27-0001 — Deliberation governance A→Z

**Purpose:** Ship deliberation v2.7 (seven departments, REP capsules, separation of powers) as a complete FP → BP → code → SENTRY loop.

**Execution path note:** Canonical factory order is FP → BP → Coder → SENTRY. This mission was **coded first** (Conductor GAP-FILL on legacy spine), then **BP retrofitted** from the Founder Packet, then **SENTRY verified**. Same destination; useful comparison against BP-first missions like `FACTORY-REBOOT-0003`.

## Authority sources (Founder Packet inputs)

- `docs/BUILDEROS_VOCABULARY.md` v2.7
- `docs/architecture/DELIBERATION_ARCHITECTURE.md`
- `docs/architecture/FOUNDER_VOCABULARY_CONSENSUS_REPORT.md`
- `docs/products/builderos/PRODUCT_HOME.md`

## Verify

```bash
node builderos-reboot/scripts/run-mission-acceptance.mjs FACTORY-DELIBERATION-V27-0001
npm run lifeos:deliberation:a-to-z-smoke
npm run factory:deliberation-v27:sentry-loop   # 14 aspects — full SENTRY loop
npm run factory:deliberation-v27:sentry        # single mission audit
```

## Verdict surface

- `SENTRY_AUDIT_REPORT.md` — qualitative SENTRY review (this mission)
- `SENTRY_CHECK_RESULT.json` — mechanical checklist
