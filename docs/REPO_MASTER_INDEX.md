# REPO_MASTER_INDEX — where every index lives

**Purpose:** One navigation page for **inventory, SSOT, lanes, and ops** — so cold agents and humans do not hunt blindly.  
**Maintain:** When you add a new “index” or canonical list, add a row here in the same PR.

---

## A. Repo inventory & cleanup (filesystem truth)

| Document | What it indexes | Regenerate / edit |
|----------|-----------------|-------------------|
| [`REPO_MASTER_INDEX.md`](REPO_MASTER_INDEX.md) | **This file** — map of all indexes | Human |
| [`REPO_BUCKET_INDEX.md`](REPO_BUCKET_INDEX.md) | Top-level **buckets** only (file count + bytes); largest 15 | **`npm run repo:catalog`** |
| [`REPO_CATALOG.md`](REPO_CATALOG.md) | **Every indexed file** (path, size, hint) | **`npm run repo:catalog`** |
| [`REPO_CATALOG.json`](REPO_CATALOG.json) | Machine JSON (same data as catalog) | **`npm run repo:catalog`** |
| [`REPO_TRIAGE_NOTES.md`](REPO_TRIAGE_NOTES.md) | Human **KEEP / GOLD / DELETE-CANDIDATE** | Human |
| [`REPO_DEEP_AUDIT.md`](REPO_DEEP_AUDIT.md) | **Spine vs barnacles** (`server.js` composition), tiers, waves | Human (update after big architecture changes) |
| [`scripts/generate-repo-catalog.mjs`](../scripts/generate-repo-catalog.mjs) | Generator source | Human; **@ssot** Amendment 36 |

---

## B. Product & governance SSOT

| Document | What it indexes |
|----------|-----------------|
| [`projects/INDEX.md`](projects/INDEX.md) | **Amendments 01–39+** — registry, priorities, cross-links |
| [`projects/AMENDMENT_38_IDEA_VAULT.md`](projects/AMENDMENT_38_IDEA_VAULT.md) | **Idea Vault** — streams, **Seed catalog §A–D**, portfolio triage, links to **39** + design brief |
| [`projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md`](projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md) | **Memory Intelligence** — evidence ladder, `/api/v1/memory`, debates, lessons, intent drift |
| [`MEMORY_FRAMEWORK_DESIGN_BRIEF.md`](MEMORY_FRAMEWORK_DESIGN_BRIEF.md) | **Memory framework** — strategic why, 25 ideas, phases, open questions, §13 review notes |
| [`SSOT_NORTH_STAR.md`](SSOT_NORTH_STAR.md) | Constitution |
| [`SSOT_COMPANION.md`](SSOT_COMPANION.md) | Operations + env pointer |
| [`SSOT_DUAL_CHANNEL.md`](SSOT_DUAL_CHANNEL.md) | Agent packet vs full system channel |
| [`SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md`](SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md) | Build-from-SSOT readiness |
| [`ENV_REGISTRY.md`](ENV_REGISTRY.md) | Environment variables + deploy inventory |
| [`SYSTEM_CAPABILITIES.md`](SYSTEM_CAPABILITIES.md) | HTTP routes, scripts, **gaps** |
| [`CONTINUITY_INDEX.md`](CONTINUITY_INDEX.md) | **Which lane log** to open |
| [`CONTINUITY_LOG.md`](CONTINUITY_LOG.md) | General / cross-lane session history |
| [`CONTINUITY_LOG_LIFEOS.md`](CONTINUITY_LOG_LIFEOS.md) | LifeOS lane |
| [`CONTINUITY_LOG_COUNCIL.md`](CONTINUITY_LOG_COUNCIL.md) | Council / builder / models |
| [`CONTINUITY_LOG_TC.md`](CONTINUITY_LOG_TC.md) | TC lane |
| [`CONTINUITY_LOG_HORIZON.md`](CONTINUITY_LOG_HORIZON.md) | Horizon intel |
| [`CONTINUITY_LOG_SECURITY.md`](CONTINUITY_LOG_SECURITY.md) | Security / red-team |
| [`AI_COLD_START.md`](AI_COLD_START.md) | Generated cold-start packet |
| [`AGENT_RULES.compact.md`](AGENT_RULES.compact.md) | Generated enforcement packet |
| [`QUICK_LAUNCH.md`](QUICK_LAUNCH.md) | Conductor start + execution protocol |

---

## C. Prompts & builder domains

| Path | Role |
|------|------|
| [`prompts/README.md`](../prompts/README.md) | Prompt directory overview (if present) |
| [`prompts/00-LIFEOS-AGENT-CONTRACT.md`](../prompts/00-LIFEOS-AGENT-CONTRACT.md) | Epistemic baseline |
| [`prompts/00-SSOT-READ-SEQUENCE.md`](../prompts/00-SSOT-READ-SEQUENCE.md) | Read order |
| [`prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md`](../prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md) | Model tiers |
| [`prompts/lifeos-*.md`](../prompts/) | Builder **domain** briefs |

---

## D. Repo-root / legacy feature lists

| Document | Notes |
|----------|--------|
| [`../FEATURE_INDEX.md`](../FEATURE_INDEX.md) | Feature-oriented catalog (may lag; cross-check `routes/`) |
| [`CONVERSATION_DUMP_IDEAS_INDEX.md`](CONVERSATION_DUMP_IDEAS_INDEX.md) | **Chat exports + mined themes** — canonical dump paths, inventory, backlog clusters |

---

## E. Runtime spine (code — not an index file)

| Entry | Role |
|--------|------|
| [`../server.js`](../server.js) | Composition root |
| [`../startup/register-runtime-routes.js`](../startup/register-runtime-routes.js) | Main **product** route mounts |
| [`../startup/routes/server-routes.js`](../startup/routes/server-routes.js) | Stripe, memory mount, ops, auto-builder hooks |
| [`../routes/api-v1-core.js`](../routes/api-v1-core.js) | Core `/api/v1` tasks / ideas / snapshots |

Detail: [`REPO_DEEP_AUDIT.md`](REPO_DEEP_AUDIT.md).

---

## F. When to update what

| Event | Action |
|-------|--------|
| Large add/move/delete in repo | `npm run repo:catalog` → refreshes **BUCKET_INDEX**, **CATALOG**, **JSON** |
| Deprecate or delete a tree | Row in **REPO_TRIAGE_NOTES** + optional **REPO_DEEP_AUDIT** tier edit |
| New amendment | **projects/INDEX.md** + owning amendment file |
| New lane | **CONTINUITY_INDEX.md** + new `CONTINUITY_LOG_*.md` |
| New self-serve API | **SYSTEM_CAPABILITIES.md** + **ENV_REGISTRY.md** if env changes |

---

*Last updated: 2026-04-26 — **Amendment 39** + **`MEMORY_FRAMEWORK_DESIGN_BRIEF.md`** in §B; **38** Seed §D squeeze. Prior: 2026-04-25 Idea Vault row.*
