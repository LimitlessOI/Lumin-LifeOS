# LifeOS Domain Prompt Files

## What This Directory Is

Each file here is a **30-second context brief** for any AI agent working on a specific domain.

When Cursor hits a usage limit and a new agent starts cold, it reads the relevant file here BEFORE reading any code. This is the anti-drift layer — the agent knows what the domain does, what already exists, what models to use, and exactly what to build next, without reading thousands of lines of SSOT amendments.

## How to Use

**Session start (as an AI agent):**
0. **Read `prompts/00-LIFEOS-AGENT-CONTRACT.md` first** — **North Star Article II §2.6** (platform-wide: no lies, no misleading — to operators, users, or system state); then LifeOS specifics + read full `AMENDMENT_21` before editing it.
1. Identify which domain you're working on
2. Read `prompts/<domain>.md` — this is your full context in one file
3. Then read the SSOT amendment it points to for deeper detail (for LifeOS: **entire** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` before any edit to that file)
4. Do NOT re-build what the prompt file says already exists

**When you ship a change:**
1. Update the relevant `prompts/<domain>.md` with the new state
2. Update `## Next approved task` with whatever is next
3. Update AMENDMENT_21 Change Receipts (or the owning amendment)

## Files in This Directory

| File | Domain | SSOT |
|---|---|---|
| `00-LIFEOS-AGENT-CONTRACT.md` | **Read first** — Platform epistemic oath (North Star §2.6) + LifeOS channel | AMENDMENT_21 + North Star |
| `lifeos-lumin.md` | Lumin AI conversational interface | AMENDMENT_21 |
| `lifeos-weekly-review.md` | Weekly letter + interactive conversation | AMENDMENT_21 |
| `lifeos-scorecard.md` | MITs + daily scorecard + deferral tracking | AMENDMENT_21 |
| `lifeos-conflict.md` | Conflict intelligence + interruption | AMENDMENT_21 |
| `lifeos-truth-delivery.md` | Truth delivery + calibration learning loop | AMENDMENT_21 |
| `lifeos-emotional.md` | Emotional patterns + daily check-in | AMENDMENT_21 |
| `lifeos-council-builder.md` | Council builder dispatch endpoint | AMENDMENT_21 |
| `lifeos-habits.md` | Recurring habits + identity framing + streak summary | AMENDMENT_21 |
| `lifeos-legacy.md` | Trusted contacts + time-capsule + digital will completeness | AMENDMENT_21 |
| `lifeos-gate-change-proposal.md` | §2.6 ¶8 — gate-change / efficiency proposals → council rubric | AMENDMENT_01 + 21 + North Star |

## The Rule

**If the prompt file says it exists → it exists. Don't rebuild it.**
**If the prompt file says it's next → that is the next task. Start there.**

The prompt file is always updated atomically when a file is changed. If there's a conflict between the prompt file and the code, trust the code and update the prompt file.
