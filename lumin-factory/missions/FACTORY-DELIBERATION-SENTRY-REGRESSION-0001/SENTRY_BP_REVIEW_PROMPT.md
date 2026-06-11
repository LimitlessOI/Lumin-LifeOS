# SENTRY BP Review Prompt — Regression Harness Mission

**Paste into Claude Code. You are SENTRY auditing the BLUEPRINT only — not implementing.**

---

## Mission

`FACTORY-DELIBERATION-SENTRY-REGRESSION-0001` — SENTRY regression harness for deliberation v2.7.

**Phase:** BP audit **before** any CDR coding.

---

## Read first

1. `builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/FOUNDER_PACKET.json`
2. `REGRESSION_PROBE_CATALOG.json`
3. `BLUEPRINT.json` (artifact under audit)
4. `ACCEPTANCE_TESTS.json` (if synced)

---

## Mechanical checks

```bash
cd /Users/adamhopkins/Projects/Lumin-LifeOS
node -e "
import fs from 'fs';
import { blueprintFreezeCheck } from './factory-staging/factory-core/sentry/blueprint-freeze-check.js';
const bp = JSON.parse(fs.readFileSync('builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/BLUEPRINT.json','utf8'));
console.log(JSON.stringify(blueprintFreezeCheck(bp), null, 2));
"

node builderos-reboot/scripts/sync-acceptance-from-blueprint.mjs FACTORY-DELIBERATION-SENTRY-REGRESSION-0001 --dry-run 2>/dev/null || true
```

---

## Audit checklist (P0 = block CDR)

| ID | Check |
|----|-------|
| P0-1 | Every probe in `REGRESSION_PROBE_CATALOG.json` appears in BP acceptance tests |
| P0-2 | No BP step edits `services/deliberation-governance-service.js` or `config/deliberation-governance.js` |
| P0-3 | Every step has `step_id`, `action_type`, `target_file`, `sandbox_boundary`, `authority_owner`, `on_block` |
| P0-4 | Exact commands listed: `npm run lifeos:deliberation:regression` (+ `--layer=local|live`) |
| P0-5 | Cleanup step references `--verify-railway` before any `--confirm` |
| P0-6 | No founder decision points in steps |
| P1-1 | Determinism requirement documented (two local runs same pass/fail set) |
| P1-2 | Missing live env fails closed (not silent pass) |

---

## Verdict buckets

- `BP_AUDIT_PASS` — CDR may implement (must be backed by `SENTRY_CHECK_RESULT.json`)
- `BP_AUDIT_FAIL` — return to BPB with numbered defects (**acceptable progress** if evidence-backed)
- `UNVERIFIED` — could not run command; do not certify

**SNT language:** FAIL is feedback, not defeat. A verified `BP_AUDIT_FAIL` is higher quality than an unverified PASS. See `SNT_EPISTEMIC_LANGUAGE.md`.

Write result to `SENTRY_BP_AUDIT_REPORT.md` in mission folder **and** ensure mechanical runner produces `SENTRY_CHECK_RESULT.json`.
