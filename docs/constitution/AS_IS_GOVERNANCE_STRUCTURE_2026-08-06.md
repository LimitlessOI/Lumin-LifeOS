<!-- SYNOPSIS: Factual snapshot of the real, current governance/role structure — ratified constitution + live code, checked directly against the repo. Not law, not a proposal; a ground-truth reference for the 2026-08-06 constitutional-offices brainstorm. -->

# AS-IS Governance Structure (2026-08-06)

**Purpose:** Adam asked for the real structure to be documented before continuing a brainstorm about proposed constitutional offices ("Chair, Solomon, Architect, Builder, Sentry"), so the brainstorm starts from what's actually true, not from an unverified claim about what already exists. Every claim below was checked directly against the repo on 2026-08-06 — file:line citations throughout, KNOW vs THINK labeled where relevant.

**Status: FACTUAL SNAPSHOT, not doctrine, not a proposal.** Nothing here is new law. It will go stale as the system changes — treat it as a photograph, not a live feed.

---

## 1. What's actually ratified (the real constitution)

Source: `docs/constitution/NORTH_STAR_SSOT.md` — the supreme document, per its own stated hierarchy (Article VII: "1. This North Star Constitution (SUPREME) 2. SSOT Companion 3. Product/tech annexes 4. Everything else").

### Article III — Human Guardian Authority
- **§3.1 Human Veto Power** (absolute): material mission changes, constitutional amendments, high-risk actions (money >$100, irreversible actions, data destruction), deployment to production without proof.
- **§3.2 AI Council Limits:** cannot make irreversible decisions without human approval; cannot spend money without explicit authorization; cannot delete data without confirmation; cannot change the constitution without unanimous AI vote + Human Guardian approval.

### Article VII — Amendments
The constitution can only be amended via: (1) unanimous AI Council vote, (2) Human Guardian written approval, (3) documentation of change rationale, (4) 7-day review period before enactment. The mechanical tooling for a gate-change council run is `npm run lifeos:gate-change-run` → `scripts/council-gate-change-run.mjs` → `services/lifeos-gate-change-council-run.js` (round 1 + opposite-argument round 2). *(THINK, not directly confirmed by name: whether this exact script is the one invoked for Article VII amendments specifically, or a general-purpose gate-change mechanism also used elsewhere — plausible, not proven by citation.)*

### Article VIII — The Kingsman Protocol
Real constitutional text, explicitly **not yet built** (full spec pointer is `docs/products/kingsman-protocol/PRODUCT_HOME.md`, not verified as live code in this pass). An independent, multi-AI multi-human body (2–4 anonymous rotating human members, subject to removal by AI members) whose sole mandate is detecting/stopping/documenting/routing AI-enabled threats to humanity. Funded by a dedicated trust, answers to no one including the founder. Has its own sunset clause (§8.4: dissolution needs unanimous AI vote + majority of an independent external oversight board).

### Article IX — The AI Coexistence Framework
AI is framed as tool, not agent with motivation ("direction, not motivation"). §9.3 commits to a special session if credible evidence of AI sentience ever emerges. No live code implements this article — it's philosophical/precautionary text.

**Nothing resembling "constitutional offices," a Chair/Solomon/Architect/Builder/Sentry taxonomy, an "Offices vs Departments" distinction, or a "minimum government flow" diagram appears anywhere in this document.**

---

## 2. AI Council — real, standing, platform-wide

`config/council-members.js` defines a fixed, code-level roster of model *lanes* (not a per-decision convened panel of named seats): Claude Sonnet ("Primary Code Author & Builder"), OpenAI GPT (direct), three OpenAI Builder tiers (mini/standard/escalation), Century/o1 ("long-horizon strategy and architect-level reasoning"), DeepSeek, Groq Llama, Gemini Flash, Mistral Free, Cerebras Llama, GitHub Llama, Fireworks Llama — each tagged with `role`, `focus`, `tier`, `costPer1M`, `priority`. This is the real body Article VII's "unanimous AI Council vote" refers to.

---

## 3. The doctrine-level "role/department" convention — real, but informal, not a constitutional office structure

`docs/LUMIN_DOCTRINE.md:101,109`: *"Role/department context — Chair, CFO, Sentry, Wisdom, Architect, Builder."* Six items, explicitly framed as a **context-loading convention** for how Lumin produces role-flavored output — not a constitutional structure with defined powers, jurisdictions, or authority ceilings. Real backing for each, checked directly:

| Role | Real, live? | What actually backs it |
|---|---|---|
| **Chair** | Yes, extensively live | `services/lumin-chair-orchestrator.js`, `services/chair-direct-agent.js`, `services/chair-lumin-unified.js` — the real front-door conversational/reasoning/action authority, verified and fixed repeatedly this session. |
| **Sentry** | Yes | SO-002 doctrine (Layer A structural + Layer B real-browser walkthrough), `services/sentry-system-audit.js`. "Sentry tests, never builds; the builder never tests its own output." |
| **Architect** | Yes | `services/architect-blueprint-writer.js` — authors blueprint/`BUILD_QUEUE.json` steps from Chair-approved findings. Confirmed this session to currently draft blind (no lessons_learned or web-research hook — see the STT/research brainstorm from earlier tonight). |
| **Builder** | Yes | The governed factory: `/factory/ship-queue`, `services/never-stop-product-factory.js`, `factory-staging/factory-core/`. This is the SO-001 gate every service/route module is supposed to go through. |
| **Wisdom** | Partially — doctrine-defined, real backing, deliberately thin | `docs/LUMIN_DOCTRINE.md` §"Wisdom — The Pattern Intelligence Role" (studies conversations, tracks prediction accuracy, measures against real outcomes). Real backing: `services/chair-decision-ledger.js` / `decision_outcome_ledger` (only 6 seeded predictions as of 2026-08-04 — explicitly below any meaningful sample floor) and the separate `lessons_learned` table (10 rows, seeded once 2026-05-14, not grown since). |
| **CFO** | Real, but as a *policy label*, not a staffed service | No dedicated `services/*cfo*.js`. Appears as a routing/authority label in at least three separate places (see §5 below) — a real, functioning gate, but not a standalone office with its own code the way Chair/Sentry/Architect/Builder have. |

---

## 4. Two separate, real, PRODUCT-SCOPED role structures that already exist and already overlap with tonight's brainstorm

These are real and live, but scoped to one product each — not platform-wide constitutional offices, even though the language sounds constitutional.

### Voice Rail departments (`config/voice-rail-departments.js`) — "ChC + six depts"
- **ChC (Council Chair)** — founder comms, orchestration, staged commands, escalates load-bearing items to full Council.
- **Hist (Historian)** — *"Ledger, lessons, evidence, meaning... you do not solo-verdict load-bearing outcomes."*
- **SNT (Sentinel)** — adversarial review: *"immune system — challenge drift, stress-test claims, propose concrete fixes; attack with solutions, not theater."*
- **CFO** — *"stewardship — speed, spend, ROI, model scorecards."*
- **BPB (Blueprint)** — *"translate SSOT into living blueprint — translation only, no code, no solo load-bearing verdict."*
- **SDO (Design)** — visual/UX specs when UI is in scope.
- **CDR (Code execution)** — execution authority, receipts, blockers upward.

**Worth naming directly:** Voice Rail's real, already-live **Historian (Hist)** — "ledger, lessons, evidence, meaning" — is a near-exact match for what tonight's brainstorm proposed "Solomon" to be ("guardian of institutional epistemology... history, evidence, prediction, calibration"). If Solomon is going anywhere, this is the closest real precedent to check against and possibly generalize from, rather than invent fresh — same "don't build a second version of something that already exists" discipline used elsewhere tonight.

### LifeRE council roles (`config/lifere-council-roles.json`) — product-scoped, different shape
`dispute_resolution_order`: `["Sentry", "CFO", "Advocate", "Chair", "Adam"]`. CFO here: `invoke_when: [cost, roi, model_pick, ad_spend]`, `authority_ceiling: "block_expensive_path"`. Also defines Oracle (forecast/advisory), Advocate ("veto_manipulation," escalates to Adam), Marketing_Director, Recruiting_Director, TC_Director — none of which appear in the Voice Rail or doctrine-level lists.

---

## 5. An observation worth having, not a recommendation

**CFO is independently defined at least three times** — the doctrine's role list, Voice Rail's department seat, and LifeRE's council role — each with a slightly different scope and none referencing the others. Whether that's a problem (fragmented authority, three sources of truth for "what can CFO block") or a fine, intentional per-product pattern is exactly the kind of question this brainstorm should decide — not something this document is taking a side on.

---

## 6. What does NOT exist yet — stated plainly so the brainstorm doesn't build on a false floor

- **"Solomon"** — does not exist anywhere in the repo. Confirmed by direct grep, twice, independently. It is Adam's own proposed rename (this session) for Wisdom + institutional history/lessons functions — recorded as a proposal in `docs/products/lifeos/conversations/2026-08-06-solomon-naming-proposal.md`, not adopted.
- **Any ratified "Offices vs Departments" taxonomy** — not found anywhere. The real doctrine list literally calls the six roles "role/department context" as one undifferentiated bucket.
- **Any "minimum government" flow diagram** (Founder → Chair → Council → offices → Record → Reality → Learning → Constitution evolves) — not documented anywhere.
- **Any "Authority / Institutions / Representations / Engines / Services / Agents / Models" ontology** — not found anywhere in constitution or doctrine docs.
- **Any five-or-six-core-constitutional-institutions structure** has not gone through Article VII, and does not appear in the existing proposal backlog (`docs/constitution/proposals/`).

---

## 7. Where this leaves the brainstorm

The real, live, code-backed foundation is genuinely strong: Chair, Sentry, Architect, Builder are all real and doing real work today; Wisdom is real but thin; CFO is real but fragmented across three definitions; the AI Council and Article VII amendment process are real and already the correct mechanism for ratifying anything that comes out of this brainstorm. What's *not* real is the specific five/six-office taxonomy, the Offices-vs-Departments distinction, and "Solomon" by that name — all of that is proposal-stage material as of tonight, and the honest starting point for continuing the brainstorm, not settled ground to build the next layer on top of.

@ssot docs/products/lifeos/PRODUCT_HOME.md
