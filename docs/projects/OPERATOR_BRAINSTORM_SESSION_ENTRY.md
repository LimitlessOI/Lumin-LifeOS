# Operator brainstorm & “idea session” — **read this first**

**Purpose:** When Adam asks to **read the brainstorming section**, **have a brainstorming session**, **give me 25 ideas**, **continue where we left off**, or similar — **start here**. This file tells you **exactly** how to behave so he does **not** have to repeat standing instructions each time.

**Not constitutional law.** Full phase law stays in **`docs/BRAINSTORM_SESSIONS_PROTOCOL.md`**. Constitutional / load-bearing forks still use **`AMENDMENT_01`** + real **`run-council` / gate-change`** on the **deployed** app.

**Last updated:** 2026-05-08

---

## Trigger phrases → you do this packet

Treat any of these (and close variants) as “**entry mode**”:

- “Read the brainstorming file / section”
- “Brainstorm session” / “idea session” / “give me **25** ideas”
- “Continue brainstorming” / “what’s next from the vault”

**Mandatory first reads (short path):**

1. **This file** (you’re doing it).
2. **`docs/BRAINSTORM_SESSIONS_PROTOCOL.md`** — phases **1→5**, artifact naming, discard tests.
3. **`docs/projects/BUILDER_AUTONOMY_BRAINSTORM_VAULT.md`** — pooled ideas + **Doing now / Next / Market**.
4. **Latest dated folders** under **`docs/projects/BRAINSTORM_SESSIONS/<program>/`** (e.g. `lifeos/`) — skim **`50_TRIAGE.md`** and **`00_CHARTER.md`** for what was chosen / discarded **last time**.
5. **Where we actually are:** **`docs/LIFEOS_PROGRAM_MAP_SSOT.md`** (LifeOS IA + URLs), **`docs/projects/AMENDMENT_21_LIFEOS_CORE.md` → Approved Product Backlog + Agent Handoff + last Change Receipts**, **`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.{json,md}`**, **`docs/CONTINUITY_LOG.md`** (newest blocks).
6. **Optional machine truth:** **`npm run builder:preflight`**, **`npm run lifeos:builder:throughput-meter`**, last **`npm run lifeos:operational-grade`** receipt if Adam has keys (don’t pretend you ran receipts you didn’t).

Only **after** that inventory may you invent or rank ideas honestly.

---

## Adam’s standing product instructions (carry forward — do **not** make him repeat)

Implement these **as constraints** every session (paraphrase in your openings if useful; **do not** imply he typed them again this thread):

| Theme | Constraint |
|--------|------------|
| **Truth / no drift** | KNOW / THINK / GUESS; no green-when-red; claims tie to receipts, SSOT, or files read **this session**. |
| **Builder-first** | Platform `/build` when possible; IDE code = **`GAP-FILL`** with failure evidence when product paths are skipped. |
| **His voice drives SSOT + queue** | Dislikes, “do X,” sparks (“this made me think of Z”) → **Change Receipts + handoff / continuity**, then **`LIFEOS_DASHBOARD_BUILDER_QUEUE.json`** **`tasks[]`** when it should ship. Real disagreement at architecture level → **`npm run lifeos:gate-change-run`** on Railway (**not** “the council agrees” in chat). |
| **Time expectations** | **~1 min/slice** and **~10 min corridor** refer to **typical automated builder pacing**, not “everything perfected for my life.” **Human test + feedback** is separate (often tens of minutes). |
| **System + build output audit** | Look for bugs in **TSOS machinery** **and** in **what the builder produced** (overlays, routes, specs). |
| **Brainstorm churn** | He does **not** want “25 random ideas forever” — each **new** 25 must **account for** older ideas (**executed well / poorly / skipped / superseded**) first. |

If any of these conflict with Adam’s **latest explicit line in this conversation**, ask once; explicit thread wins (**§2.15** posture).

---

## ChatGPT-inspired shape (parity, **not** a product copy)

**Research bite (external products, 2025-ish framing):**

- **Branching:** parallel threads fork from one message — **mirror here** by either a **new** `BRAINSTORM_SESSIONS/.../` folder with **`00_CHARTER.md` → `parent_session:`** linking the prior charter, **or** a clear “branch intent” stanza Adam approves — so options don’t overwrite each other (**see Yahoo Tech / Thought Leadership summaries on ChatGPT branching**).
- **Brainstorm partner / Academy pattern:** structured **constraints → wide options → clusters → scoring (impact × effort)** → obvious **next steps** — **mirror here** via protocol Phases **1–5** plus **`50_TRIAGE.md`** with **BUILD_NOW / NEXT / MARKET / DISCARD** (**OpenAI Academy “Brainstorming with ChatGPT”** style: widen, then narrow, then plan).

LifeOS stays **truth-first**: no fake “votes” recorded without **`run-council`** receipts where §2.12 applies.

---

## What you deliver when Adam wants “25 ideas” again

Never deliver **orphan** 25s.

1. **Audit line (short):** Which prior brainstorm / vault IDs are **DONE / PARTIAL / STUCK / KILLED** (cite artifact path or receipt).
2. **Exactly 25 new ideas**, numbered **`N01–N25`**, prefixes **`[SYS]`** | **`[PRODUCT:LifeOS]`** | **`[NEW]`** per **`BRAINSTORM_SESSIONS_PROTOCOL`** §Phase 1.
3. **`50_TRIAGE`-style bullets** — at least suggested bucket per idea (**BUILD_NOW** / **NEXT** / **MARKET_ICEBOX** / **DISCARD**) *or* point to **`50_TRIAGE.md`** slice in a dated session folder.
4. **`docs/projects/OPERATOR_BRAINSTORM_SESSION_ENTRY.md`** → link new session folder once created (**convention:** `docs/projects/BRAINSTORM_SESSIONS/<slug>/<YYYY-MM-DD>_<topic>/`).

If he asked only for meta-ideas, still output **audit + exactly 25** per protocol **Phase 3** rules (distinct from Phase‑1 rerun).

---

## Linked receipts

- Latest **live-ish platform + shell grade card (1–10):** `docs/projects/LIFEOS_BROWSER_AND_PLATFORM_GRADE_2026-05-08.md` (update dated file after major deploys).

---

## SSOT indexes

| Doc | Role |
|-----|------|
| `docs/BRAINSTORM_SESSIONS_PROTOCOL.md` | Full multi-model phase prescription |
| `docs/projects/BUILDER_AUTONOMY_BRAINSTORM_VAULT.md` | Long-lived idea pool |
| `docs/projects/BRAINSTORM_SESSIONS/README.md` | Folder conventions |
| `docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.md` | Turning ideas into **`tasks[]`** |
