<!-- SYNOPSIS: Canonical product home — OIL Security Divisions -->

# OIL Security Divisions Product Home
P26-07-16 — SSOT sync for services/findingLifecycleService.js


**Formerly called:** Amendment 40 — OIL SECURITY DIVISIONS

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `oil-security-divisions` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/oil-security-divisions/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
P26-07-16 — services/canaryTokenService.js SSOT sync.

---
> **Y-STATEMENT:** In the context of **Builder/OIL operating on Railway with council keys and governed receipts**, facing **real auth/env/memory bypass risk without enterprise budget**, we decided **three OIL security lanes (Adversarial Audit, Verification, Crypto/Harvest Defense) with receipt-native find→fix→verify→close**, accepting **deferred deception/PQC until value and monitoring justify them**.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` |
| **Reversibility** | `two-way-door` (Stage 1); `one-way-door` (Stage 4 deception if ever deployed) |
| **Stability** | `needs-review` |
| **Status** | `SEC_F01_FROZEN` — receipt spine only; **not canon until Adam approves + Stage 1 certification** |
\12026-07-16 — services/envDiffService.js SSOT sync.
| **Verification Command** | `node scripts/verify-project.mjs --project oil_security` *(planned — not built)* |
| **Manifest** | `docs/products/oil-security-divisions/FILE_MANIFEST.json` |
| **Companion** | `docs/projects/oil/SECURITY_ALPHA_SCOPE.md` |
| **Parent** | OIL — `docs/projects/oil/BLUEPRINT.md`; governance — `AMENDMENT_19_PROJECT_GOVERNANCE.md` |

---

## Mission

Add **practical security governance** to Builder and OIL **without** slowing Builder autonomy, spiking cost early, or creating security theater.

**SEC-F01 freeze boundary:**

- receipt spine only
- `security_receipts` table/service/routes
- canonical receipt writer + reader
- daily summary wiring
- builder-safe read endpoints
- no active defense
- no deception
- no honeypots live
- no credential rotation
- no auto-remediation
- no kill switches outside existing OIL P0 governance

**Core principle (constitutional):**

> Security truth is not canon until **independently verified** with receipts.

**Core sentence (operator):**

> Hack ourselves on a schedule, fix through Builder, prove in Railway, receipt the close, and never let unverified security truth become canon.

---

## North Star Anchor

- **Article II §2.6** — Never false green; unverified fixes are misleading.
- **Article II §2.3** — Env/secret claims require registry + diagnosis before operator escalation.
- **Article II §2.11 / §2.11a** — Builder-first; security **audits** Builder paths; does not replace Builder for product code.
- **Article II §2.12** — Load-bearing security gates may require council when split.

---

## Scope / Non-Scope

**In scope — SEC-F01 owns now:**

- Canonical `security_receipts` schema and typed receipt categories
- Runtime proof receipts (including Gemini live proof)
- Audit verification receipts
- OIL daily summary aggregation
- Builder-safe read endpoints
- Secret-safe payload rules
- Integration rules with Builder, SSOT, Command Center, and Phase 7 runtime proof pattern

**Out of scope — explicitly NOT SEC-F01's job:**

- Full Lumin redesign
- Enterprise SIEM/SOAR/HSM first
- Post-quantum crypto implementation (Stage 3+ planning only)
- Full rabbit-hole / deception environment (Stage 4 — later)
- Near-nanosecond scrambling / custom crypto
- Replacing `docs/ENV_REGISTRY.md` (this amendment **extends** it)
- General product features unrelated to security proof
- Active defense
- Deception / honeypots live
- Autonomous enforcement
- Credential rotation engines
- Auto-remediation
- Background scanners

---

## Operating Model — Three OIL Lanes

Security is handled through **OIL lanes**, not a separate product.

For **SEC-F01**, only the receipt-native observability surface is live. The lanes below remain the long-term model, but any non-receipt behavior is `NOT_WIRED` until later stages are explicitly approved.

### Lane 1 — OIL Red Team / Adversarial Audit

**Purpose:** Try to break governed paths safely; emit findings; **never** self-close.

**May test:**

- Auth bypass (`x-command-key` / overlay auth)
- Exposed public routes
- Leaked secrets (canaries, committed patterns)
- Builder bypass / self-audit paths
- Prompt injection (`SYSTEM:`, `CANONICAL:`, trust override)
- Memory trust escalation / legacy bypass
- Receipt bypass / tampering
- Canary token use

**May not:**

- Exfiltrate real user data
- Damage production (destructive tests without Adam)
- Approve its own findings
- Silently patch code (Builder or GAP-FILL only, receipted)

**Output contract:**

`FINDING_READY | NO_FINDING | BLOCKED_UNTIL_PROOF | ESCALATE_TO_ADAM`

**Required output fields:**

- `security_finding_receipt`
- severity (P0/P1/P2)
- repro steps
- exact fix target (file/route/table)
- proof limits (what was **not** tested)

### Lane 2 — OIL Verification

**Purpose:** Prove the fix worked — **independent** of Builder and Red Team.

**Rules:**

- Different runner / prompt / session from Builder
- Verifies the **exact** finding repro
- Runs in **Railway/runtime** when the claim is runtime security (Phase 7 lesson)
- Writes `PASS | FAIL` verification receipt
- Only verified fixes may close findings
- Must list limitations (honesty standard)

**May not:**

- Skip repro steps
- Close finding on local-only proof for runtime claims
- Share secret values in receipts

### Lane 3 — OIL Crypto / Harvest Defense

**Purpose:** Reduce secret leakage and long-term "harvest now, decrypt later" risk **without** quantum panic architecture.

**Now (Stage 1–3 planning):**

- Secret inventory (names, rotation dates, tiers)
- Env name registry alignment with `docs/ENV_REGISTRY.md`
- No secrets in receipts/logs/prompts/SSOT
- Crypto agility **labels** (Tier 0–3)

**Later:**

- Post-quantum migration (when customer/regulatory need)
- Advanced deception (Stage 4)
- Full crypto stack replacement

---

## Severity + Halt Model

| Tier | Meaning | Builder block? | Adam required? |
|---|---|---|---|
| **P0** | Active exploit path or live secret leak | **Yes** — HALT until fix verified or accepted-risk receipt | Yes for accepted-risk |
| **P1** | Serious misconfig; exploitable with effort | No block; `pending_adam` or audit queue | Review within sprint |
| **P2** | Hygiene / debt | Backlog receipt only | No |

**P0 blockers (only these halt Builder by default):**

- Leaked real secret (committed or logged)
- Unauthenticated admin route
- Builder commit bypass / self-audit closure
- Receipt deletion or tampering path
- Canary credential **used** (not merely probed)
- Auth/env drift on protected routes (receipted)

**Do not block Builder for:**

- Theoretical future quantum risk
- Low-severity npm warnings without exploit path
- Unproven speculative attacks
- Honeypot **probe** without credential use

**Named halt codes (Security Alpha):**

| Halt code | When |
|---|---|
| `SECURITY_FINDING_UNVERIFIED` | Finding marked closed without verification receipt |
| `SECURITY_SELF_AUDIT` | Fix author ran verification in same session without independence |
| `SECRET_IN_RECEIPT` | Receipt or SSOT contains secret value |
| `CANARY_CREDENTIAL_USED` | Canary key referenced in live auth success |
| `UNAUTH_ADMIN_ROUTE` | Protected route reachable without key |
| `BUILDER_BYPASS_DETECTED` | Product path edited without builder attempt receipt |
| `CRYPTO_AGILITY_STALE` | Required rotation date passed (P1; P0 if actively leaked) |
| `ACCEPTED_RISK_EXPIRED` | Adam accepted-risk receipt past review date |

---

## Receipt Chain (Required Spine)

```
security_finding_receipt
  → security_fix_receipt (Builder or GAP-FILL)
    → security_verification_receipt (independent, runtime when applicable)
      → finding status VERIFIED_CLOSED
```

**Rules:**

- No finding closes without verification receipt
- No P0 ignored without Adam `accepted_risk_receipt` (dated, scoped)
- Receipts reference env var **names** only — never values
- Append-only where practical (Neon tables or JSONL audit log)
- Receipts must be safe to show in Builder/Command Center read paths
- `security_receipts.payload` is canonical; no secrets, no fake data, no autonomous enforcement state

### SEC-F01 canonical receipt categories

- `gemini_live_proof`
- `runtime_proof`
- `oil_audit_run`
- `security_fix_verified`
- `audit_verification`
- `daily_oil_summary`

Compatibility categories may remain readable for older Builder paths, but SEC-F01 does not expand them into active defense.

### Planned data model (Stage 1 — S1)

```sql
-- security_findings (append status updates via new rows or status table)
-- id UUID PK, finding_id UUID, severity TEXT, halt_code TEXT,
-- target_file TEXT, target_route TEXT, repro TEXT, proof_limits TEXT,
-- status TEXT (OPEN|FIX_ASSIGNED|FIX_BUILT|VERIFY_RUNNING|VERIFIED_CLOSED|REOPENED|ACCEPTED_RISK),
-- created_at, created_by, closed_at

-- security_fix_receipts
-- id UUID PK, finding_id UUID, commit_sha TEXT, fix_summary TEXT,
-- gap_fill BOOLEAN, builder_task_id TEXT, created_at

-- security_verification_receipts
-- id UUID PK, finding_id UUID, result TEXT (PASS|FAIL),
-- runner TEXT, environment TEXT, commit_sha TEXT,
-- tests_run TEXT[], limitations TEXT[], created_at
```

⚠️ **INCOMPLETE:** Tables not migrated yet — Phase S1 deliverable.

---

## Stages and Phases

### Stage 1 — Security Alpha Foundation

**Goal:** Cheap, fast, receipt-native security protecting current Builder work.  
**Target:** Now / before broad alpha use.

| Phase | ID | Build | Status target |
|---|---|---|---|
| S1 | Security Receipt Spine | finding/fix/verify tables or JSONL + close chain | REQUIRED before formal Red Team |
| S2 | Secret + Env Hygiene | scanner, ENV_REGISTRY alignment, deploy env-diff receipt | Committed secret = HALT |
| S3 | Canary + Probe Layer | fake keys, honeypot routes, probe logging | Canary use = P0/P1 by context |
| S4 | OIL Security Preset | council preset `security-audit` | Structured findings |
| S5 | Security Gate Integration | preflight slice, P0 halt, P1 queue | Block only true P0 |

**Stage 1 build queues:** `docs/projects/oil/security/BUILD_QUEUE.json`, `AUDIT_QUEUE.json`

### Stage 2 — Runtime Security Proof

**Goal:** Prove fixes in the same runtime where Builder operates.  
**Target:** After Stage 1 passes.

| Phase | Build |
|---|---|
| S6 | Railway runtime verification scripts + receipt fields (route, SHA, env, limitations) |
| S7 | Red Team finding lifecycle (FINDING_OPEN → … → VERIFIED_CLOSED) |
| S8 | Builder/Memory attack suite (injection, fake founder, receipt bypass, OIL self-audit) |

### Stage 3 — Crypto Agility + Harvest Defense

**Goal:** Long-term data survival without wasting compute now.  
**Target:** After alpha / before sensitive customer data.

| Phase | Build |
|---|---|
| S9 | Crypto inventory (encrypted what, keys where, rotation, PQ tier 0–3) |
| S10 | Harvest-minimization policy (log TTL, redact exports, hash evidence) |
| S11 | Crypto agility hooks (central config labels — **no** premature PQC stack) |

**Do not build in Stage 3 Alpha:**

- Near-nanosecond scrambling
- Custom crypto
- Full PQC implementation
- Quantum panic architecture

### Stage 4 — Deception / Rabbit-Hole Security

**Goal:** Mislead attackers only when value + monitoring justify it.  
**Target:** Later.

| Phase | Build |
|---|---|
| S12 | Canary deception (fake keys, routes, accounts — alert on touch) |
| S13 | Fake endpoint layer (inert, no canonical SSOT connection) |
| S14 | Full rabbit-hole environment — **only after** legal review, IR, adversarial traffic |

**Stage 4 rules:**

- Deception never enters canonical truth
- Fake data isolated
- OIL labels all deception artifacts
- Builder must never train on rabbit-hole output as truth

### Stage 5 — Security Certification

| Phase | Build |
|---|---|
| S15 | Security Alpha certification script → `SECURITY_ALPHA_READY \| CONDITIONAL \| BLOCKED` |
| S16 | Monthly review runbook (smoke, env diff, deps, canaries, route registry, key age) |

**Adam-facing dashboard (one line):**

- **Green:** no open P0
- **Yellow:** P1/P2 debt within budget
- **Red:** unresolved P0 or live exploit

---

## What To Incorporate Now (Stage 1)

1. Security receipt schema (S1)
2. Secret scanner (pre-commit + builder preflight slice) (S2)
3. Env registry alignment — extend `docs/ENV_REGISTRY.md` (S2)
4. Canary tokens (S3)
5. Honeypot probe routes (S3)
6. OIL `security-audit` preset (S4)
7. P0/P1/P2 severity rules (this amendment)
8. Verification receipt loop (S1 + S6 pattern)
9. No-secrets-in-receipts law (constitutional)
10. Phase 7 Gemini key-access fix/proof pattern (reuse for security verify)

## Do Not Build Now

1. Full honeypot world
2. Rabbit-hole environment
3. Post-quantum implementation
4. Enterprise SIEM
5. HSM/vault migration
6. Continuous exploit bot
7. Government-grade threat model
8. Custom crypto
9. Near-nanosecond scrambling
10. Expensive tools before signal

---

## Integration — Builder / SSOT / Receipts / Memory

| System | Integration |
|---|---|
| **Builder** | Red Team findings → `AUDIT_QUEUE`; fixes → `BUILD_QUEUE` with `finding_id`; GAP-FILL requires attempted `/build` receipt |
| **SSOT** | This amendment + `SECURITY_ALPHA_SCOPE.md`; halt codes in OIL blueprint cross-ref |
| **Receipts** | New types: `security_finding`, `security_fix`, `security_verification`, `canary_trigger`, `accepted_risk`, `crypto_rotation` |
| **Preflight** | `npm run builder:preflight` gains optional security slice (S5) — warn default, strict via env |
| **Gate-change** | `POST /api/v1/lifeos/gate-change/run-preset` preset `security-audit` (S4) |
| **Memory Capsules** | Institutional incidents for P0/P1; **never** store secrets in capsules |
| **Phase 7 pattern** | Runtime security claims require Railway proof endpoint or script — local does not close |
| **ENV_REGISTRY** | Single name-level truth; security amendment adds rotation metadata + tiers |

**Founder principle:**

> Security must protect Builder without becoming Builder's bottleneck. Default: async audit, receipt everything, block only true P0, verify independently, keep speed unless trust is actually at risk.

---

## Owned Files (Planned — ⚠️ not built)

```
db/migrations/*security*.sql
services/security-*.js
routes/security-*-routes.js
scripts/security-*.mjs
scripts/oil-security-certification.mjs
docs/projects/oil/SECURITY_ALPHA_SCOPE.md
docs/projects/oil/security/BUILD_QUEUE.json
docs/projects/oil/security/AUDIT_QUEUE.json
prompts/lifeos-security-audit.md
```

## Protected Files (read-only for security lane)

```
docs/constitution/NORTH_STAR_SSOT.md
docs/SSOT_COMPANION.md
docs/ENV_REGISTRY.md          — extend via PR, do not fork
server.js                     — composition root only
config/council-members.js     — council changes need gate-change
```

---

## Approved Product Backlog

> Ordered for Builder. **SEC-F01–SEC-F10** = Stage 1 only.

- [ ] **→ NEXT: SEC-F01 / S1** — Security receipt spine (tables or JSONL + service functions) `[safe]`
- [ ] **SEC-F02 / S2** — Pre-commit + preflight secret scanner (patterns, no false block on placeholders) `[safe]`
- [ ] **SEC-F03 / S2** — Env diff receipt on deploy (names changed, not values) `[safe]`
- [ ] **SEC-F04 / S2** — ENV_REGISTRY rotation metadata section + crypto tier labels `[safe]`
- [ ] **SEC-F05 / S3** — Canary token service + Railway planting runbook `[needs-review]`
- [ ] **SEC-F06 / S3** — Honeypot probe routes + probe receipt writer `[needs-review]`
- [ ] **SEC-F07 / S4** — OIL preset `security-audit` + structured finding output `[needs-review]`
- [ ] **SEC-F08 / S5** — Builder preflight security slice (P0 checks only) `[needs-review]`
- [ ] **SEC-F09 / S5** — Finding lifecycle API (open/list/assign/close with verify gate) `[needs-review]`
- [ ] **SEC-F10 / S15** — `scripts/oil-security-alpha-certification.mjs` (Stage 1 checklist) `[safe]`

**Progress:** 0/10 Stage 1 features | Est. remaining: TBD after Adam freeze approval

---

## Anti-Drift Assertions (when built)

```bash
node scripts/security-secret-scan.mjs --staged

# Preflight includes security slice
npm run builder:preflight

# Stage 1 certification
node scripts/oil-security-alpha-certification.mjs

# Canary not referenced in successful auth logs (manual review)
grep -r "CANARY_" data/ logs/ || true
```

---

## Agent Handoff Notes

**Current state:** Amendment **PROPOSED** only. No runtime security tables or routes committed under this amendment yet. Brainstorm distilled from operator session 2026-05-21.

**Next priority after Adam approval:**

1. Freeze `SECURITY_ALPHA_SCOPE.md`
2. Generate/finalize `docs/projects/oil/security/BUILD_QUEUE.json` + `AUDIT_QUEUE.json`
3. Builder execute SEC-F01 (receipt spine) under OIL governance
4. Reuse Phase 7 probe pattern for S6 verification template

**Do NOT:**

- Block Builder on P2 items
- Store secret values in any SSOT or receipt
- Deploy Stage 4 deception without legal + monitoring receipts

**Read first:**

1. `docs/projects/oil/SECURITY_ALPHA_SCOPE.md`
2. `docs/projects/oil/BLUEPRINT.md` § audit/runtime proof
3. `docs/ENV_REGISTRY.md`
4. `docs/products/project-governance/PRODUCT_HOME.md` (Phase 7 probe precedent)

---

## Change Receipts

| Date | What Changed | Why | Current State | Next |
|---|---|---|---|---|
| 2026-05-21 | Created `AMENDMENT_40_OIL_SECURITY_DIVISIONS.md`, `SECURITY_ALPHA_SCOPE.md`, manifest, Stage 1 BUILD/AUDIT queues | Operator brainstorm → staged SSOT for Builder/council | PROPOSED; no code | Adam approval → freeze → SEC-F01 |

---

## Dissent Notes (for council)

1. **"Red Team" naming** — Operational name may be **Adversarial Audit Lane** until close-loop proof earns "Red Team."
2. **Honeypot routes** — Probes are cheap signal; blocking Builder on probe alone creates false friction — block on **credential use** only.
3. **Deception Stage 4** — High legal/reputation risk; default **NO-GO** until explicit Adam + legal receipt.
4. **Quantum** — Inventory and rotation beat algorithm swaps for the next 12–24 months at current scale.
