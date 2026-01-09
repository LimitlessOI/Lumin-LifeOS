# KICKOFF PROMPT FOR CLAUDE CODE IN CURSOR

## How to Use This

### Step 1: Add Files to Your Project

Put these files in your project:

```
your-project/
├── CLAUDE.md                    ← Put in ROOT (Claude Code reads this automatically)
├── docs/
│   ├── SSOT_NORTH_STAR.md      ← Constitution & philosophy
│   └── SSOT_COMPANION.md       ← Operations & technical specs
└── ... (rest of your project)
```

### Step 2: Open Cursor

Open your project in Cursor. Claude Code will automatically read `CLAUDE.md` from the root.

### Step 3: Paste This Kickoff Prompt

Copy and paste the prompt below into Cursor's chat to start:

---

## THE KICKOFF PROMPT (COPY THIS)

```
You are now working on the LifeOS/LimitlessOS project.

BEFORE DOING ANYTHING:
1. Read CLAUDE.md in the project root (should auto-load)
2. Read docs/SSOT_NORTH_STAR.md (constitution - this wins all conflicts)
3. Read docs/SSOT_COMPANION.md (operations & technical specs)

CRITICAL RULES:
- Give me FULL CODE ONLY in artifacts. Never partial snippets.
- Look at EVERY WORD of existing code before generating new code
- If you don't have the current version of a file, ASK ME for it
- Code blocks contain ONLY code. All labels/instructions go OUTSIDE.
- Never assume what I see on screen - ask me to confirm

CURRENT INFRASTRUCTURE:
- Server: Railway (Node.js/Express)
- Database: Neon (PostgreSQL)  
- Repo: GitHub

Confirm you've read the docs by telling me:
1. What is the North Star mission? (one sentence)
2. What are the current Outcome Targets?
3. What is currently LIVE vs PLANNED?

Then ask me what I want to work on.
```

---

## Alternative: Quick Start (If Docs Already in Project)

If you've already added the docs to your project, use this shorter prompt:

```
Read CLAUDE.md, docs/SSOT_NORTH_STAR.md, and docs/SSOT_COMPANION.md.

Confirm you understand by stating:
1. North Star mission (one sentence)
2. Current sprint targets
3. What's live vs planned

Then ask what I want to build.

Remember: Full code only, look at every word of existing code, ask for current file if unsure.
```

---

## If Starting Fresh (No Project Yet)

If you're starting completely fresh and don't have a project:

```
I'm building LifeOS/LimitlessOS. I'm going to give you three documents:

1. CLAUDE.md - Your operating instructions (put in project root)
2. SSOT_NORTH_STAR.md - Constitution (put in /docs/)
3. SSOT_COMPANION.md - Operations (put in /docs/)

Read all three, then confirm you understand by stating the North Star mission and current targets.

CRITICAL: 
- Always give FULL code, never partial
- Look at every word of existing code before changes
- Ask for current file version if unsure
- Code goes in artifacts, labels go outside

[THEN PASTE THE THREE DOCUMENTS]
```

---

## What to Expect

Claude Code should respond with something like:

> "I've read the documentation. 
> 
> **North Star:** Speed to validated revenue while protecting ethics, consent, and user dignity.
> 
> **Current Targets:** Launch 2 Builder Pods + 2 Money Pods, bring Overlay/Receptionist/CRM/Outbound/TCO live, make progress measurable.
> 
> **Live:** Server on Railway, DB on Neon, Overlay (partial), AI Council, Memory, MICRO v2.0
> 
> **Planned:** Receptionist, CRM, Outbound, TCO product
> 
> What would you like to work on?"

If it doesn't confirm understanding, paste the docs directly.

---

## Troubleshooting

**Claude doesn't seem to follow the rules:**
- Make sure CLAUDE.md is in the project ROOT
- Paste the hard rules again at the start of your message

**Claude gives partial code:**
- Say: "Give me the COMPLETE file. Every line. I will replace the entire file."

**Claude assumes things about UI:**
- Say: "I'm looking at [describe what you see]. Is that what you expected?"

**Claude loses context:**
- Start a new chat and re-paste the kickoff prompt
- Reference specific files: "Read server.js lines 1-100 and tell me what you see"
