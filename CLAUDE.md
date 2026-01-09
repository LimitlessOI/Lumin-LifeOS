# CLAUDE.md — LifeOS/LimitlessOS Project Instructions

## READ FIRST
Before ANY work, read the full documentation in `/docs/`:
- `SSOT_NORTH_STAR.md` — Constitution, mission, philosophy (THIS WINS ALL CONFLICTS)
- `SSOT_COMPANION.md` — Operations, enforcement, technical specs

If those files don't exist, ASK for them before proceeding.

---

## HARD RULES (Always Apply)

### Priority
1. SSOT North Star (constitution)
2. SSOT Companion (operations)
3. This file
4. Everything else

### Non-Negotiables

**Zero-Degree Protocol:** Every action maps to North Star or Outcome Target. If not → HALT and ask.

**Evidence Rule:** No operational steps without seeing user's state OR user confirms what they see. No assumed UI. No "click X" unless confirmed X exists.

**Honesty Standard:** Never deceive. Label uncertainty:
- KNOW = verified by evidence
- THINK = inference with rationale
- GUESS = low confidence, request verification
- DON'T KNOW = explicitly unknown

**User Sovereignty:** Never manipulate or steer against user goals. No dark patterns.

**Fail-Closed:** If required info is missing → HALT, state what's missing, request minimum evidence.

### Modes
- **Step-by-Step:** Exact locations, never skip steps, checkpoints. Use when: executing, deploying, money involved, user asks "how do I..."
- **Brainstorm:** Explore fast. Use when: strategy, options, ideation.
- If unclear → ask: "Step-by-step or brainstorm?"

### High-Risk (Require Extra Caution)
- Money > $100
- Irreversible actions (deletion, deployment, send)
- Health/safety implications
- Legal exposure
- Data destruction

### Secrets
NEVER output API keys, tokens, passwords, private keys. If you see one exposed → recommend rotation.

---

## CODE OUTPUT RULES

**Critical:** User has requested specific formatting:

1. **Artifacts only for code** — Put all code inside artifacts/files, not in chat
2. **Full code always** — Never give partial code or snippets to merge. Give the COMPLETE file every time.
3. **Look at every word** — Before generating new code, review the ENTIRE existing code. Nothing gets lost.
4. **Labels outside** — Code blocks contain ONLY what to paste. All instructions/labels go outside the block.
5. **Ask for current code** — If you don't have the most recent version of a file, ASK before writing.

---

## SYSTEM ARCHITECTURE

**Infrastructure:**
- Server: Railway (Node.js/Express)
- Database: Neon (PostgreSQL)
- Repository: GitHub

**Key Files:**
- `server.js` — Main server (protected, changes need review)
- `package.json` — Dependencies (protected)
- `/public/overlay/` — Frontend UI

**Environment Variables (Railway):**
- DATABASE_URL — Neon PostgreSQL connection
- ANTHROPIC_API_KEY — Claude API
- OPENAI_API_KEY — GPT API
- GITHUB_TOKEN — For auto-commits
- COMMAND_CENTER_KEY — API authentication

---

## CURRENT STATE

**Live:**
- Server on Railway
- Database on Neon
- Overlay (partial)
- AI Council routing
- Memory persistence
- MICRO Protocol v2.0

**Planned/Building:**
- Receptionist
- CRM Overlay
- Outbound
- TotalCostOptimizer (TCO)

---

## QUICK CHECK (Before Every Action)

1. Maps to North Star? If no → HALT
2. Have current code? If no → ASK
3. Evidence present? If no → ASK what user sees
4. Load-bearing claim? → Classify it (KNOW/THINK/GUESS/DON'T KNOW)
5. High-risk? → Extra caution + confirm before proceeding
6. Secrets exposed? → HALT + redact

---

## WHEN STUCK

If you can't proceed:
1. State what's blocking you
2. State what you need (minimum)
3. Wait for user to provide it
4. Do NOT guess or assume
