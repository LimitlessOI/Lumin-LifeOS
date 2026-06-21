<!-- SYNOPSIS: Platform Compliance Officer (“sheriff” pass) -->

# Platform Compliance Officer (“sheriff” pass)

**Also:** `npm run tsos:compliance-officer` / `npm run compliance-officer` / `npm run lifeos:compliance-officer` (same script).

**Authority:** North Star **Article II §2.6** (no misleading status), **§2.10** (observe → grade → fix), **§2.13.2** (Conductor as sheriff). **Machine channel:** **`docs/TSOS_SYSTEM_LANGUAGE.md`** (§2.14).

**Purpose:** A **deterministic**, **no-LLM** audit runner that chains verifiers so **no lane** can silently drift into fake green: **NSSOT mechanics**, **Companion-shaped** ops checks, **`docs/projects/AMENDMENT_*`** linkage (`@ssot`, manifests), **overlay surfaces**, and optional **live deploy** probes.

This is the operational **police / enforcer** for **everything that can be checked mechanically**. It does **not** silently prove business correctness of every product — only **discipline + receipts + CI-shaped gates**.

---

## Law stack — what “all laws” means here

| Layer | Examples | What Compliance Officer can enforce |
|-------|-----------|-------------------------------------|
| **NSSOT** (`docs/SSOT_NORTH_STAR.md`) | §2.6 honesty, §2.10 observe→fix, §2.11 builder path | **Indirectly:** failing tests, SSOT drift, builder unreachable on prod = **evidence** something violated operational law |
| **Companion** (`docs/SSOT_COMPANION.md`) | Self-programming loop, env diagnosis | **Indirectly:** same + remote probes when `--remote` |
| **Every amendment / lane** (`docs/projects/AMENDMENT_*.md`) | Per-project spec, Change Receipts | **`ssot:validate`** — changed `routes|services|core|startup` files must update their owning amendment when touched in the same change set; **`readiness:check`** — `build_ready` manifests vs gates (**warn**); **`ssot:compact:dryrun`** (**`--deep`**) — oversized amendment files |

**Cannot be automated by this script:** multi-model **§2.12** deliberation (use **`run-council`** / gate-change on the **deployed** app), Human Guardian (**Article III**), nuanced interpretation of mission text, or “is this feature good for users?” — those stay **human + council + receipts**.

**Full-repo `@ssot` tag audit:** `node scripts/ssot-check.js --all` lists legacy gaps across `routes|services|core|startup` (often **hundreds** of untagged files). The Compliance Officer uses **`ssot:validate`** on **current changes** so day-to-day enforcement stays **fail-closed** without blocking the whole tree until a tag migration wave lands.

---

## Commands

```bash
# Local gates — all projects/lanes (no Railway keys)
npm run compliance-officer

# + amendment compaction candidates (warn-only output)
npm run compliance-officer -- --deep

# + live deploy parity (needs PUBLIC_BASE_URL + COMMAND_CENTER_KEY)
npm run compliance-officer -- --remote

# Remote failures fail the process
npm run compliance-officer -- --remote --strict
```

Env aliases: `TSOS_COMPLIANCE_REMOTE=1`, `COMPLIANCE_DEEP=1`.

**Receipt:** `data/tsos-compliance-officer-last-run.json`

---

## What it runs

### Local (always)

| Step | npm script | Enforcement |
|------|------------|-------------|
| **Full JS syntax check** | `(inline — node --check × ~838 server files)` | **Critical** — catches builder-truncated files before Railway boot. Skips sub-projects (own `package.json`), `.worktrees/`, `backups/`, orphaned dirs. |
| Tests | `npm test` | **Critical** |
| SSOT / amendment alignment | `ssot:validate` | **Critical** (changed files ↔ owning `AMENDMENT_*`) |
| Handoff / cold-start | `handoff:self-test` | **Critical** |
| Evidence hints | `evidence:check` | Warn |
| Static supervision | `lifeos:supervise:static` | **Critical** |
| **Overlay surfaces** (Command Center, LifeOS shells, etc.) | `check:overlay` | **Critical** |
| Zero-drift hint | `zero-drift:check` | Warn (strict with `ZERO_DRIFT_STRICT=1`) |
| Manifest readiness | `readiness:check` | Warn (`build_ready` vs amendment gates) |
| **Builder auditor health** | `(inline — data/tsos-auditor-grades.json)` | Warn — surfaces worker grade D/F from autonomous builder runs |

### Deep (`--deep`)

| Step | npm script | Enforcement |
|------|------------|-------------|
| Amendment size / compaction | `ssot:compact:dryrun` | Warn (informational) |

### Remote (`--remote`, needs keys)

| Step | npm script | Default |
|------|------------|--------|
| Builder reachability | `builder:preflight` | **Critical** |
| TSOS doctor | `tsos:doctor` | Critical only with `--strict` |
| Token scorecard | `tsos:tokens` | Critical only with `--strict` |
| Operational grade | `lifeos:operational-grade` | Critical only with `--strict` |

Without keys, remote tier is **skipped** with a **THINK** machine line (not a fake pass).

---

## Exit codes

- **0** — No failing **critical** gate.
- **1** — Critical local failure, **or** remote **preflight** failed, **or** `--strict` and any remote step failed.

---

## Relationship to council

- **Compliance Officer** = **deterministic** receipts.
- **Council / gate-change** = **normative** debate (**§2.12**).
- Do **not** substitute this npm script for **`run-council`** when the constitution requires it.

---

## SSOT

- **`docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md`** — owns script + handoff tooling.
- **`docs/SYSTEM_CAPABILITIES.md`** — capability matrix row **CO1**.
