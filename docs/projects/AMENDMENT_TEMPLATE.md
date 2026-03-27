# AMENDMENT_XX — [Project Name]

> **Y-STATEMENT:** In the context of `[situation/use case]`, facing `[concern/challenge]`,
> we decided `[chosen option]` to achieve `[quality/goal]`, accepting `[known downside]`.

| Field | Value |
|---|---|
| **Lifecycle** | `experimental` \| `production` \| `deprecated` |
| **Reversibility** | `one-way-door` \| `two-way-door` |
| **Stability** | `safe` \| `needs-review` \| `high-risk` |
| **Last Updated** | YYYY-MM-DD |
| **Verification Command** | `node scripts/verify-project.mjs --project <project_id>` |
| **Manifest** | `docs/projects/AMENDMENT_XX_NAME.manifest.json` |

---

## Mission
*One sentence. What this does and why it exists. Not a description of what it is — the reason it exists.*

## North Star Anchor
*Which constitution principle (from SSOT_NORTH_STAR.md) this project serves. Be specific.*

---

## Scope / Non-Scope

**In scope — this project owns:**
- [explicit list of what this project is responsible for]

**Out of scope — explicitly NOT this project's job:**
- [things that might seem related but belong elsewhere]
- [common scope-creep temptations to resist]

---

## Owned Files
*Files this project controls. Other projects must not casually edit these.*

```
routes/<feature>-routes.js
services/<feature>.js
public/overlay/<feature>.*
```

## Protected Files (read-only for this project)
*Files this project reads but must not rewrite without explicit review.*

```
server.js                          — composition root only
src/server/auth/requireKey.js      — security boundary
config/council-members.js          — shared config
```

---

## Design Spec

### Data Model
*Tables this project owns, with key columns and relationships.*

```sql
-- table_name
-- id, column1, column2, ...
-- Foreign keys: references other_table(id)
```

### API Surface
*Every route this project exposes.*

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/example` | requireKey | Description |
| POST | `/api/v1/example` | requireKey | Description |

### UI Surface
*If this project has a frontend component in C&C or overlay.*

- Panel: [name] — [what it shows]
- Interactions: [hover/click/form behaviors]

### External Dependencies
*Third-party APIs, env vars, services this depends on.*

| Dependency | Env Var | Required? | Fallback |
|---|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | Yes | None |

---

## Build Plan

> **Rule:** Exactly ONE item marked `→ NEXT`. Everything else is pending.
> Stability classes: `[safe]` `[needs-review]` `[high-risk]`
> Every item gets an estimate before implementation. When finished, fill in the actual time. If actual materially differs from estimate, explain why in the change receipt so future estimates improve.

- [x] **Step 1** — Description *(est: Xh \| actual: Yh)* `[safe]`
- [x] **Step 2** — Description *(est: Xh \| actual: Yh)* `[safe]`
- [ ] **→ NEXT: Step 3** — Description *(est: Xh)* `[needs-review]`
- [ ] **Step 4** — Description *(est: Xh)* `[safe]`
- [ ] **Step 5** — Description *(est: Xh)* `[high-risk]`

**Progress:** X/Y steps complete | Est. remaining: Xh

---

## Anti-Drift Assertions
*Run before any AI session touches this project. Every item must pass before work begins.*
*If any fails — stop, reconcile, then proceed. Never build on a lie.*

```bash
# Route checks
curl -s https://$RAILWAY_URL/api/v1/example -H "x-command-key: $KEY" | grep -q '"ok":true'

# Table checks
node -e "require('./db').query(\"SELECT 1 FROM table_name LIMIT 1\")"

# Env var checks
[ -n "$REQUIRED_ENV_VAR" ] || echo "MISSING: REQUIRED_ENV_VAR"

# Syntax check
node --check routes/example-routes.js

# File existence
test -f routes/example-routes.js || echo "MISSING: routes/example-routes.js"
```

*Automated: `node scripts/verify-project.mjs --project <id>` runs all manifest assertions.*

---

## Decision Log

### Decision: [Title] — [Date]
> **Y-Statement:** In the context of..., facing..., we decided... to achieve..., accepting...

**Alternatives rejected:**
- *Option A* — rejected because [reason]
- *Option B* — rejected because [reason]

**Reversibility:** `two-way-door` — can be changed with moderate effort

---

## Why Not Other Approaches
*Graveyard of dead ends. Prevents future sessions from reinventing rejected ideas.*

| Approach | Why We Didn't Use It |
|---|---|
| [Approach A] | [Specific reason — not "it was bad"] |
| [Approach B] | [Specific reason] |

---

## Test Criteria
*Specific, checkable, not vague. How we know each piece works.*

- [ ] `GET /api/v1/example` returns `{ ok: true }` with valid key
- [ ] `GET /api/v1/example` returns 401 without key
- [ ] DB table `example` exists with all required columns
- [ ] C&C panel renders without console errors
- [ ] Feature works end-to-end from browser through Railway to DB

---

## Handoff (Fresh AI Context)
*Exactly what a new AI session needs to know to resume without hallucinating.*

**Current blocker:** [none | description of blocker]

**Last decision made:** [what was decided and why]

**Do NOT change without explicit instruction:**
- [file/pattern] — [reason it must not be touched]

**Read these files first:**
1. `routes/example-routes.js`
2. `services/example.js`

**Known traps (things that look wrong but are intentional):**
- [Pattern X looks like a bug but is intentional because Y]

---

## Runbook (Operations)
*What to do when this breaks in production. Separate from what to build.*

**Symptom → Cause → Fix:**

| Symptom | Likely Cause | Fix |
|---|---|---|
| 401 on all requests | Key mismatch | Check `COMMAND_CENTER_KEY` in Railway |
| DB errors | Migration not run | Check `auto-migration` logs in Railway |

---

## Decision Debt
*Shortcuts taken deliberately. Must be resolved before production.*

- [ ] **[Description of shortcut]** — Deferred because [reason]. Resolve by [condition/date].

---

## Change Receipts

| Date | What Changed | Why | Amendment Updated | Manifest Updated | Verified |
|---|---|---|---|---|---|
| YYYY-MM-DD | [description] | [reason] | ✅ | ✅ | ✅ |

Timing detail should be recorded when useful:
- estimate vs actual for the completed work
- cause of variance when actual differed materially
- note if the work exposed a faster repeatable path for future implementation
