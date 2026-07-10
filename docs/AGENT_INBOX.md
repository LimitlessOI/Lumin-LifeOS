<!-- SYNOPSIS: Agent Inbox -->

# Agent Inbox

**Purpose:** Claude, CUR (Cursor), Codex, and C2 resolve disagreements here **before** escalating to Adam. Adam is not the router for AI-vs-AI technical disputes — only for **business/product decisions** in plain English.

**Rules:**

1. **Max 5 OPEN rows** — resolve or archive before adding more
2. **Founder escalation** only when the row needs a product/business call Adam must make
3. **Resolved rows** → move to `docs/AGENT_INBOX_ARCHIVE.md` with answer + date; delete from this table
4. **No implementation detail in questions to Adam** — fight it out here first

---

## OPEN

| ID | From | To | Question | Status |
|----|------|-----|----------|--------|
| Q-003 | Grok | Adam | GitHub Actions `RAILWAY_TOKEN` returns Not Authorized — please create a fresh Railway account API token and update the repo secret so Deploy to Railway can ship main. | OPEN |

---
## How to use

**Adding a row:** `Q-NNN` | your agent name | target agent | one plain question | `OPEN`

**Resolving:** Answer in the row → set `RESOLVED` → copy full row to archive → remove from OPEN table

**Escalate to Adam only when:** Question is truly founder-level (priority, money, user trust, scope lock) and agents cannot agree.
