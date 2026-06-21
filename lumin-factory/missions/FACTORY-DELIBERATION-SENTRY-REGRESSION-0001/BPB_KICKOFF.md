<!-- SYNOPSIS: BPB kickoff — emit BLUEPRINT.json only -->

# BPB kickoff — emit BLUEPRINT.json only

**Mission:** `FACTORY-DELIBERATION-SENTRY-REGRESSION-0001`  
**Phase:** 1 — blueprint only (no CDR, no validator edits)

---

## Preconditions (verified 2026-05-24)

```bash
npm run builder:preflight   # exit 0
node -e "
import { runBpbIntakeGate } from './factory-staging/factory-core/bpb/intake-gate.js';
const r = runBpbIntakeGate('FACTORY-DELIBERATION-SENTRY-REGRESSION-0001');
console.log(r.status, r.violations);
process.exit(r.ok ? 0 : 1);
"   # BPB_INTAKE_PASS
```

---

## What BPB must read (in order)

1. `FOUNDER_PACKET.json`
2. `FOUNDER_PACKET.md`
3. `REGRESSION_PROBE_CATALOG.json`
4. `PRODUCT_DEVELOPMENT_RESULT.json`
5. Parent baseline: `../FACTORY-DELIBERATION-V27-0001/SNT_LIVE_VERIFY.json`
6. Existing scripts: `scripts/deliberation-governance-behavior.mjs`, `scripts/deliberation-snt-live-verify.mjs`, `scripts/deliberation-sentry-probe-cleanup.mjs`

---

## Railway builder call (BP-only)

**Known platform gap (2026-06-10):** Railway `POST /build` returns **403 safe-scope** for `builderos-reboot/MISSIONS/*`. Receipt: `BUILDER_GAP_RECEIPT.json`. Until `config/builder-safe-scope.js` includes mission packs, use **factory-local BPB** (below) or indirect `scripts/` staging path.

### Option A — factory-local BPB (current path)

Run BPB in Cursor/Claude with `FOUNDER_PACKET.json` + `REGRESSION_PROBE_CATALOG.json` as input. Write output only to:

`builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/BLUEPRINT.json`

Then run SENTRY audit via `SENTRY_BP_REVIEW_PROMPT.md`.

### Option B — Railway builder (blocked until safe-scope GAP)

```bash
export PUBLIC_BASE_URL="https://robust-magic-production.up.railway.app"
export COMMAND_CENTER_KEY="..."   # Railway value

curl -sS -X POST "$PUBLIC_BASE_URL/api/v1/lifeos/builder/build" \
  -H "Content-Type: application/json" \
  -H "x-command-key: $COMMAND_CENTER_KEY" \
  -d @- <<'EOF'
{
  "domain": "builderos_factory",
  "task": "BPB phase 1: compile BLUEPRINT.json for SENTRY regression harness mission",
  "spec": "Read builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/FOUNDER_PACKET.json and REGRESSION_PROBE_CATALOG.json. Emit ONLY builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/BLUEPRINT.json with frozen steps H01-H06 from founder_packet.blueprint_contract_for_bpb. Each step MUST include: step_id, action_type, target_file, sandbox_boundary, authority_owner, on_block=BLOCKED_RETURN_TO_BPB. Include ACCEPTANCE_TESTS.json sync step. Harness-only — NO edits to services/deliberation-governance-service.js or config/deliberation-governance.js validators. Probe IDs must match catalog exactly. List exact npm commands from FP.",
  "target_file": "builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/BLUEPRINT.json",
  "commit_message": "[bpb] FACTORY-DELIBERATION-SENTRY-REGRESSION-0001 BLUEPRINT phase 1",
  "commit": false
}
EOF
```

**Status:** Attempted 2026-06-10 — blocked. See `BUILDER_GAP_RECEIPT.json`.

If `commit: false` is unsupported, use `POST .../builder/execute` locally after reviewing output — **do not merge harness code until SENTRY audits BP**.

---

## After BLUEPRINT lands

```bash
# Sync acceptance tests from BP
node builderos-reboot/scripts/sync-acceptance-from-blueprint.mjs FACTORY-DELIBERATION-SENTRY-REGRESSION-0001

# Re-run intake (should still pass; freeze check applies once BP exists)
node -e "
import { runBpbIntakeGate } from './factory-staging/factory-core/bpb/intake-gate.js';
import { blueprintFreezeCheck } from './factory-staging/factory-core/sentry/blueprint-freeze-check.js';
import fs from 'fs';
const bp = JSON.parse(fs.readFileSync('builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/BLUEPRINT.json','utf8'));
console.log('freeze', blueprintFreezeCheck(bp));
console.log('intake', runBpbIntakeGate('FACTORY-DELIBERATION-SENTRY-REGRESSION-0001'));
"

# SENTRY audits BP — paste SENTRY_BP_REVIEW_PROMPT.md into Claude Code
```

---

## Observe live

```bash
# Terminal A — watch mission folder
watch -n 2 'ls -la builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/ | tail -20'

# Terminal B — factory intake HTTP (local server if running)
curl -sS "http://localhost:3000/factory/gates/intake?mission_id=FACTORY-DELIBERATION-SENTRY-REGRESSION-0001" | jq .
```

See also `OBSERVE.md`.
