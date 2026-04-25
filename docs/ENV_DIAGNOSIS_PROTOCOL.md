# Environment diagnosis protocol (mandatory before “env is missing”)

**Authority:** Implements `docs/SSOT_NORTH_STAR.md` **Article II §2.3** (evidence) for variable claims.  
**Canonical map:** `docs/ENV_REGISTRY.md` (including **Deploy inventory — Lumin / robust-magic**).  
**Machine mirror:** `services/env-registry-map.js` + `GET /api/v1/railway/managed-env/registry` (when authenticated).

---

## Rule (non-negotiable)

No agent may state **KNOW** that a variable is **absent from production** or “not there” **until** steps **1–3** below are satisfied. If the **name** appears in `ENV_REGISTRY.md` (registry table **or** deploy inventory) as present in the **Lumin / robust-magic** vault, the default hypothesis is **THINK: name exists — failure is elsewhere** until disproven.

### Operator-supplied evidence (hard stop — same conversation)

If **Adam (or any operator) already supplied evidence in the same thread** that a given variable **name** exists in the Railway vault — e.g. Variables UI **screenshot**, pasted **name list**, explicit sentence (“`COMMAND_CENTER_KEY` is set”), or any equivalent **non-secret** proof — then **until disproven by machine evidence from that deploy** (e.g. authenticated `GET /api/v1/railway/env` on the **same** service showing the key absent, or a documented wrong-service / wrong-project ID):

| Forbidden | Required instead |
|-----------|-------------------|
| Asking Adam to “add”, “set”, “paste”, or “confirm” those **same** names in Railway | Diagnose **shell vs deploy**, **wrong `PUBLIC_BASE_URL`**, **401 / key mismatch**, **404 deploy drift**, **verifier skip**, or **code bug** |
| **KNOW** or casual wording that those names are “not in Railway” / “missing from production” / “not configured” **because Cursor’s shell had empty `process.env`** | State **THINK/Know:** vault evidence exists; failure is **local auth / URL / build age / runtime**, with receipts |

**Empty `process.env` in Cursor or CI is never sufficient evidence that Railway lacks a variable the operator just proved is there.** Conflating the two is **misleading** (North Star **Article II §2.6**).

---

## 1. Read the canonical sources (same session)

1. `docs/ENV_REGISTRY.md` — full registry **and** **Deploy inventory — Lumin (Railway production)** (names-only list from vault UI).
2. If the claim is about **remote** deploy: `GET /api/v1/railway/managed-env/registry` (or Command Center env health) — **names / categories**, not values in logs.
3. `docs/BUILDER_OPERATOR_ENV.md` — shell vs Railway split for **Conductor laptop** vs **server**.

---

## 2. If the name IS listed — diagnose non-secret causes first

Work through in order (stop when root cause found):

| Check | Why it mimics “missing env” |
|--------|------------------------------|
| **Wrong runtime** | Local `node` / Cursor shell has **no** Railway inject — only `process.env` you exported. |
| **Wrong key for header** | Server accepts `COMMAND_CENTER_KEY` / `LIFEOS_KEY` / `API_KEY` — shell must export the **same value** Railway uses; requests use **`x-command-key`**. |
| **Typo / legacy name** | e.g. `GROK_API_KEY` vs `GROQ_API_KEY`; eXp keys `exp_okta_*` vs uppercase aliases (see registry). |
| **Wrong base URL** | Preflight hits `PUBLIC_BASE_URL` — must be **this** service’s public origin (e.g. **robust-magic** deploy), not a stale host. |
| **401 vs 404** | 401 = auth mismatch, not “variable undefined in Railway.” |
| **Verifier skips secrets** | `verify-project` may skip `CLIENTCARE_*` locally unless `--strict-manifest-env` — read script docs before claiming missing. |
| **Non-standard UI keys** | Railway may show keys such as `lifeos@hopkinsgroup.org` or `Adam@hopkinsgroup.org` — treat as **legacy labels**; map to documented names in registry when possible. |

---

## 3. System remediation (before asking Adam to rotate a secret)

When diagnosis shows the **name** is correct but **value** is wrong or stale, and the failure is **not** a code bug:

1. Use **`POST /api/v1/railway/env/bulk`** (with `x-command-key`) per `CLAUDE.md` system self-execution table — **only** for vars the platform is allowed to set (non-secret toggles, URLs that are not secrets, or values already generated inside the system policy).
2. Trigger **`POST /api/v1/railway/deploy`** if a restart is required after env change.
3. Re-run **`npm run builder:preflight`** or the failing verifier; append outcome to **`data/builder-preflight-log.jsonl`** / Change Receipts.

**Adam (human) is required** only when: (a) the system **cannot** set the var via Railway API policy, (b) the value is a **secret** that must be typed or rotated in the vault UI, or (c) receipts prove **no other cause** after steps 1–3 and system remediation attempts — document that proof in the receipt before escalation.

---

## 4. Certification (“present **and** working”)

**Presence** = name in Railway + mirrored in **`docs/ENV_REGISTRY.md` → Deploy inventory** (screenshots or `GET /api/v1/railway/env`).

**Working** = a **defined success criterion** passed on the **live** deploy (HTTP probe, script exit 0, or user-visible flow). When that happens, append a row to **`docs/ENV_REGISTRY.md` → Env certification log** (see **Env certification playbook** in the same file for standard probes).

**Operator loop (recommended after each slice that depends on env):**

1. Export `PUBLIC_BASE_URL` + command key (same values as Railway).
2. Run **`npm run env:certify`** — probes `GET /healthz`, `GET /api/v1/railway/env` (names + masked values), `GET /api/v1/lifeos/builder/domains` (+ `/ready` when present); appends **`data/env-certification-log.jsonl`** (gitignored) and prints a **markdown table row** to paste into the certification log.
3. Paste the printed row into **`ENV_REGISTRY.md`** (edit the table) so **git** carries the human-readable receipt; keep JSONL as machine backup.

This stops future agents from re-litigating the same var after it is **proven working**, not only “listed.”

---

## 5. LLM self-check (one line before sending)

> “I claimed env X is missing — I have read `ENV_REGISTRY.md` deploy inventory + this protocol; I classified KNOW/THINK/GUESS; if the **name** is listed or **Adam already proved it in this thread**, I did **not** ask him to re-set Railway; I listed non-secret causes (shell, URL, 401, 404 deploy drift, verifier skip) tried.”

If that sentence cannot be written honestly → **HALT** and read sources.
