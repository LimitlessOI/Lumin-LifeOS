<!-- SYNOPSIS: Observe BPB → SENTRY → CDR (real time) -->

# Observe BPB → SENTRY → CDR (real time)

**Mission:** `FACTORY-DELIBERATION-SENTRY-REGRESSION-0001`

---

## Before anything runs

```bash
cd /path/to/Lumin-LifeOS
export PUBLIC_BASE_URL="https://robust-magic-production.up.railway.app"
export COMMAND_CENTER_KEY="..."   # from Railway — same as production
npm run builder:preflight
```

Preflight exit **0** = Railway reachable + auth aligned.

---

## 1. Confirm FP is BPB-ready (now)

```bash
node -e "
import { runBpbIntakeGate } from './factory-staging/factory-core/bpb/intake-gate.js';
const r = runBpbIntakeGate('FACTORY-DELIBERATION-SENTRY-REGRESSION-0001', { strict_pd: false });
console.log(JSON.stringify(r, null, 2));
process.exit(r.ok ? 0 : 1);
"
```

**Expect:** `BPB_INTAKE_PASS` with violations `[]` — except `delib:...` if deliberation gate not seeded for this mission (see below).

If deliberation gate blocks intake (no session seeded yet), BPB may use `skip_if_missing: true` for first BP compile only — **document in BP step H00**.

---

## 2. Watch BPB produce BLUEPRINT (phase 1)

BPB output lands in:

`builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/BLUEPRINT.json`

**Watch file changes:**

```bash
# Terminal A — watch mission folder
watch -n 2 'ls -la builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/'
```

**Factory full loop (if using machine layer):**

```bash
npm run factory:full-loop
# or mission-specific when BP exists:
node builderos-reboot/scripts/run-mission-acceptance.mjs FACTORY-DELIBERATION-SENTRY-REGRESSION-0001
```

**Builder on Railway (Conductor orchestrates, council writes BP):**

```bash
npm run lifeos:builder:orchestrate
# or targeted build with spec pointing at FOUNDER_PACKET.md
```

---

## 3. SENTRY audit BP (before any code)

```bash
node builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/CONTENT/run-deliberation-sentry.mjs
# After BP exists — mission-specific SENTRY script TBD in BP step
```

Manual checklist while reading `BLUEPRINT.json`:

- Every probe in `REGRESSION_PROBE_CATALOG.json` appears in acceptance tests  
- Every step has `target_file`, `action_type`, `authority_owner`  
- No step edits `services/deliberation-governance-service.js` validators  

---

## 4. After harness exists — watch regression

```bash
npm run lifeos:deliberation:regression -- --layer=local
npm run lifeos:deliberation:regression -- --layer=live
```

**Receipt:**

```bash
cat builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/REGRESSION_RUN_RESULT.json
```

**Compare to baseline:**

```bash
cat builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/SNT_LIVE_VERIFY.json
```

---

## 5. Cleanup fingerprint (only with env)

```bash
node --import dotenv/config scripts/deliberation-sentry-probe-cleanup.mjs --verify-railway
# DELETE only when intentional:
# node --import dotenv/config scripts/deliberation-sentry-probe-cleanup.mjs --confirm
```

---

## What “good” looks like

| Phase | Signal |
|-------|--------|
| FP intake | `BPB_INTAKE_PASS` |
| BP written | `BLUEPRINT.json` + `ACCEPTANCE_TESTS.json` exist |
| SENTRY | Audit report PASS, no P0 on BP |
| CDR | `node --check` on harness script |
| Run | `REGRESSION_RUN_RESULT.json` all probes pass |
