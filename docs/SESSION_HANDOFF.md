# SESSION HANDOFF - LifeOS Project

> **Last Updated:** December 31, 2024  
> **Session:** TRUE_VISION foundation + local server setup  
> **Purpose:** Help new Claude/AI instances quickly get up to speed

---

## Quick Start for New AI Instances

**Read these files in order:**
1. `docs/TRUE_VISION.md` - The complete mission and philosophy
2. `docs/CORE_TRUTHS.md` - 10 immutable principles
3. `docs/PROJECT_CONTEXT.md` - Technical status
4. This file - Current state and priorities

---

## 1. PROJECT OVERVIEW

**LifeOS / LimitlessOS** - AI-powered operating system for life and business automation.

**Read First:** [`docs/TRUE_VISION.md`](./TRUE_VISION.md) - This is the foundational mission document that supersedes everything else.

### Core Philosophy: BE → DO → HAVE
1. **BE** - Help people think like who they want to become
2. **DO** - Help them act aligned with that identity  
3. **HAVE** - Results naturally follow

### Two Systems:
- **LifeOS** - For individual consumers (whole life transformation)
- **LimitlessOS** - For businesses

Both run on the **Overlay** - a lightweight window connected to cloud servers.

---

## 2. CURRENT PHASE

**Phase 1: Financial Independence** (CURRENT)

**Goal:** Make money fast so the system can't be controlled by profit motives

- Revenue targets: $500+/day initially, scaling rapidly
- Methods: Overlay services, AI automation, business tools
- Status: Bootstrap mode - $0 budget, free models only

**Why Speed Matters:** Financial independence ensures ethics remain unalterable and mission stays pure.

---

## 3. WHAT'S WORKING ✅

| Component | Status | Notes |
|-----------|--------|-------|
| Server (local) | ✅ Works | `node --env-file=.env.local server.js` |
| Ollama AI | ✅ Works | Free, local, no API costs |
| Database (Neon) | ✅ Works | Cloud, free tier |
| TRUE_VISION context | ✅ Added | Now injected into all AI prompts |
| Knowledge base | ⚠️ Partial | Has entries but extraction was poor |
| Health endpoints | ✅ Works | `/healthz`, `/health`, `/api/health` |
| JSON sanitization | ✅ Works | Handles Ollama response parsing |
| Cost shutdown | ✅ Works | Blocks paid models when budget = $0 |
| Multi-tier AI Council | ✅ Works | Tier 0 (free) + Tier 1 (paid) |
| Knowledge query endpoints | ✅ Works | `/api/v1/knowledge/*` |

---

## 4. WHAT'S NOT WORKING ❌

| Component | Status | Issue |
|-----------|--------|-------|
| Railway server | ❌ Broken | Tunnel to Ollama fails (HTTP 403) |
| Groq fallback | ❌ Bug | MODEL OPTIMIZATION overrides it |
| Self-programming | ❌ Broken | Can't save generated files |
| Auto-builder | ❌ Broken | File extraction fails |
| Overlay UI | ⚠️ Untested | Needs verification |
| Railway auto-deploy | ⚠️ Intermittent | Webhook may be disconnected |
| Knowledge extraction | ⚠️ Poor quality | Code snippets mixed with ideas |
| AST parsing | ❌ Missing | Not yet implemented |
| Advanced testing | ❌ Missing | Not integrated into self-programming |

---

## 5. IMMEDIATE PRIORITIES

1. **Test TRUE_VISION injection** - Verify AI knows the real mission
2. **Fix Groq fallback** - So cloud server can work without tunnel
3. **Test overlay** - Verify communication works
4. **Fix self-programming** - Enable file saving for generated code
5. **Fix auto-builder** - Get file extraction working
6. **Fix Railway tunnel** - Resolve HTTP 403 to Ollama
7. **Improve knowledge extraction** - Filter out code snippets better

---

## 6. RECENT CHANGES

### 2025-01-02: Knowledge Context Update
- ✅ **TRUE_VISION.md** created as foundational mission document
- ✅ **Knowledge loader updated** to prioritize TRUE_VISION.md in all AI prompts
- ✅ **Code snippet filtering** added to avoid garbage from knowledge dumps
- ✅ **Prompt structure changed** - TRUE_VISION now appears first in every prompt

### 2025-01-02: Database Query Fix
- ✅ Fixed `buildNextOpportunity` query (changed ORDER BY to `created_at DESC`)
- ✅ Committed and pushed to GitHub

### 2025-01-02: Documentation
- ✅ Created `docs/HOW_TO_FIND_RAILWAY_DATABASE_URL.md`
- ✅ Created `docs/RAILWAY_DEPLOYMENT_CHECK.md`
- ✅ Created `docs/KNOWLEDGE_CONTEXT_UPDATE.md`
- ✅ Created `.env.local` template

### Previous Session: Self-Programming Foundation
- ✅ Created `core/codebase-reader.js`
- ✅ Created `core/dependency-manager.js`
- ✅ Created `core/error-recovery.js`
- ✅ Created `core/migration-generator.js`
- ✅ Created `core/json-sanitizer.js`
- ✅ Created `core/enhanced-file-extractor.js`
- ✅ Created `core/code-validator.js`
- ✅ Created `core/code-linter.js`
- ✅ Integrated all modules into `handleSelfProgramming`

### Previous Session: Groq Integration
- ✅ Added Groq models to COUNCIL_MEMBERS (`groq_llama`, `groq_mixtral`)
- ✅ Implemented Groq API handler in `callCouncilMember`
- ✅ Added to free fallback chain (no tunnel needed)

### Previous Session: Knowledge Processing
- ✅ Created `scripts/process-knowledge.js`
- ✅ Processed 18 knowledge dumps (402 ideas indexed)
- ✅ Created `docs/CORE_TRUTHS.md`
- ✅ Created `docs/PROJECT_CONTEXT.md`

---

## 7. HOW TO RUN THE SYSTEM LOCALLY

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Neon or local)
- Ollama installed and running (optional, for local models)
- Groq API key (optional, for free cloud backup)

### Setup Steps

1. **Clone and install:**
   ```bash
   cd ~/Projects/Lumin-LifeOS
   npm install
   ```

2. **Create `.env.local` file:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your DATABASE_URL from Railway
   ```

3. **Get DATABASE_URL from Railway:**
   - See `docs/HOW_TO_FIND_RAILWAY_DATABASE_URL.md` for detailed instructions
   - Or use Railway dashboard → Database service → Variables

4. **Configure `.env.local`:**
   ```env
   DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
   COMMAND_CENTER_KEY=MySecretKey2025LifeOS
   OLLAMA_ENDPOINT=http://localhost:11434
   MAX_DAILY_SPEND=0
   NODE_ENV=development
   PORT=3000
   ```

5. **Start the server:**
   ```bash
   node --env-file=.env.local server.js
   ```

   Or with dotenv:
   ```bash
   npm run dev
   # or
   node server.js
   ```

6. **Verify it's working:**
   ```bash
   curl http://localhost:3000/health
   # Should return: OK
   
   curl http://localhost:3000/api/health
   # Should return JSON with status
   ```

### Testing the API

```bash
# Test chat endpoint
curl -X POST "http://localhost:3000/api/v1/chat?key=MySecretKey2025LifeOS" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the mission of LifeOS?"}'

# Test knowledge endpoints
curl "http://localhost:3000/api/v1/knowledge/stats?key=MySecretKey2025LifeOS"
curl "http://localhost:3000/api/v1/knowledge/ideas?key=MySecretKey2025LifeOS"
```

### Expected Startup Output

```
📚 [KNOWLEDGE] Loaded TRUE_VISION.md (PRIMARY FOUNDATION)
📚 [KNOWLEDGE] Loaded CORE_TRUTHS.md
📚 [KNOWLEDGE] Loaded PROJECT_CONTEXT.md
📚 [KNOWLEDGE] Loaded X entries from index
✅ SYSTEM READY
🔐 Command Center Activation: http://localhost:3000/activate
🎯 Command Center: http://localhost:3000/command-center
```

---

## 8. KEY FILES & LOCATIONS

### Documentation
- `docs/TRUE_VISION.md` - **READ THIS FIRST** - Foundational mission
- `docs/CORE_TRUTHS.md` - Immutable principles
- `docs/PROJECT_CONTEXT.md` - Current project status
- `docs/SELF_PROGRAMMING_GAPS_ANALYSIS.md` - What's missing for full self-programming

### Core System
- `server.js` - Main server file (20K+ lines)
- `core/auto-builder.js` - Revenue opportunity builder
- `core/business-center.js` - Business opportunity generator
- `core/codebase-reader.js` - Code context reader
- `core/dependency-manager.js` - Auto dependency management
- `core/error-recovery.js` - Error handling and retry
- `core/migration-generator.js` - Database migration generator

### Knowledge System
- `knowledge/index/entries.jsonl` - Processed knowledge dumps (402 ideas)
- `scripts/process-knowledge.js` - Knowledge processor
- `• Lumin-Memory/00_INBOX/raw/` - Raw knowledge dumps (18 files, 114 MB)

### Configuration
- `.env.local` - Local environment variables (not in git)
- `package.json` - Dependencies
- `railway.json` - Railway deployment config
- `Dockerfile` - Docker build config

---

## 9. IMPORTANT NOTES

### Cost Management
- **MAX_DAILY_SPEND=0** - No spending allowed until revenue
- **Free models only:** Ollama (local) + Groq (free API)
- **Paid models blocked** when budget = $0 (by design)

### AI Council Structure
- **Tier 0 (Free):** Ollama models, Groq models
- **Tier 1 (Paid):** ChatGPT, Gemini, DeepSeek, Grok
- **Fallback order:** Groq → Ollama → Error

### Knowledge Context Priority
1. **TRUE_VISION.md** (PRIMARY - always first, full content)
2. **CORE_TRUTHS.md** (Secondary - truncated to 2000 chars)
3. **PROJECT_CONTEXT.md** (Tertiary - truncated to 1500 chars)
4. **Relevant ideas** from knowledge dumps (filtered, max 5)

### Git Workflow
- **Main branch:** `main`
- **Current branch:** Usually `main` (feature branches for major changes)
- **Deployment:** Railway auto-deploys from `main` (when webhook works)

---

## 10. QUICK REFERENCE

### Start Server
```bash
node --env-file=.env.local server.js
```

### Test Health
```bash
curl http://localhost:3000/health
```

### Process Knowledge
```bash
node scripts/process-knowledge.js
```

### Check Git Status
```bash
git status
git log --oneline -5
```

### Railway Deployment
- Dashboard: https://railway.app
- Service: robust-magic-production
- Manual redeploy: Dashboard → Deployments → Redeploy

---

## 11. NEXT SESSION CHECKLIST

When starting a new session, check:

- [ ] Read `docs/TRUE_VISION.md` to understand mission
- [ ] Check `git log` for recent changes
- [ ] Verify server starts locally (`node --env-file=.env.local server.js`)
- [ ] Check Railway deployment status
- [ ] Review this document for current state
- [ ] Check immediate priorities above
- [ ] Update this document with any new findings

---

## 12. UPDATE THIS DOCUMENT

**After each major work session, update:**
- Recent changes section
- What's working / What's broken
- Immediate priorities
- Any new setup steps or gotchas

**Keep it concise but complete** - this is a quick reference, not exhaustive documentation.

---

*This document should be the first thing a new Claude instance reads to get up to speed quickly.*
