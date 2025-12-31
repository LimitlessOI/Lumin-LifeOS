# SESSION HANDOFF DOCUMENT

> **Last Updated:** 2025-01-02  
> **Purpose:** Help new Claude instances quickly understand project state

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

### Infrastructure
- ✅ Railway deployment (production)
- ✅ Neon PostgreSQL database connected
- ✅ Local Ollama on Mac M2 Max (32GB RAM)
- ✅ Groq API integration (free cloud backup)
- ✅ Health endpoints (`/healthz`, `/health`, `/api/health`)

### AI System
- ✅ Multi-tier AI Council (Tier 0: free, Tier 1: paid)
- ✅ Cost shutdown protection (blocks paid models when budget = $0)
- ✅ Automatic fallback chain: Groq → Ollama → Error
- ✅ Knowledge context loading (TRUE_VISION.md as primary)
- ✅ JSON sanitization for Ollama responses
- ✅ Streaming support for Cloudflare tunnels

### Core Features
- ✅ Self-programming capability (codebase reader, dependency manager, error recovery)
- ✅ Auto-builder for revenue opportunities
- ✅ Business Center (opportunity generation)
- ✅ Knowledge base processing (18 dumps, 402 ideas indexed)
- ✅ Knowledge query endpoints (`/api/v1/knowledge/*`)

### Knowledge System
- ✅ TRUE_VISION.md loaded as primary context in all AI prompts
- ✅ CORE_TRUTHS.md and PROJECT_CONTEXT.md loaded
- ✅ Knowledge dumps processed into `knowledge/index/entries.jsonl`
- ✅ Code snippet filtering to avoid garbage in prompts

---

## 4. WHAT'S BROKEN / NEEDS WORK ⚠️

### Critical Issues
- ⚠️ **Railway auto-deploy** - May not trigger automatically (webhook issues)
  - **Workaround:** Manual redeploy in Railway dashboard
  - **Fix needed:** Reconnect GitHub webhook or verify auto-deploy settings

### Known Limitations
- ⚠️ **Knowledge dumps contain code snippets** - Some entries in `entries.jsonl` are code fragments, not ideas
  - **Status:** Filtering added, but may need refinement
  - **Impact:** Low (filtering works, but some garbage may slip through)

- ⚠️ **Database query in buildNextOpportunity** - Fixed but needs testing
  - **Status:** Changed from `ORDER BY priority DESC` to `ORDER BY created_at DESC`
  - **Needs:** Verification that it works correctly

### Missing Features
- ⚠️ **AST parsing** - Not yet implemented (from SELF_PROGRAMMING_GAPS_ANALYSIS.md)
- ⚠️ **Advanced code quality checks** - Basic linting only
- ⚠️ **Automated testing** - Not integrated into self-programming flow
- ⚠️ **Migration generator** - Created but needs integration testing

### Environment Setup
- ⚠️ **`.env.local`** - Needs DATABASE_URL from Railway
  - **Status:** Template created, user needs to fill in actual DATABASE_URL
  - **Guide:** See `docs/HOW_TO_FIND_RAILWAY_DATABASE_URL.md`

---

## 5. IMMEDIATE PRIORITIES

### Priority 1: Revenue Generation
1. **Launch Builder pods + Money pods**
   - Get overlay, receptionist, CRM, outbound, and TC live
   - Scale to $500+/day with ROI-gated spend

2. **Revenue-generating apps/services:**
   - AI CRM Overlay (always-on, screen-aware)
   - AI Story/Anime/Movie Generator
   - AI Legal Documents
   - Screen Shopping Overlay
   - Employee Training Overlay
   - KeepMyWordTracker
   - ADHD/Executive Function Assistant
   - AI Homework Helper
   - Commercial Property Finder
   - Habit Tracker for salespeople

### Priority 2: System Hardening
1. **Test and verify recent fixes:**
   - Database query fix in `buildNextOpportunity`
   - Groq API handler (verify it works end-to-end)
   - Knowledge context loading (verify TRUE_VISION is used)

2. **Improve knowledge processing:**
   - Better filtering of code snippets
   - Smarter idea extraction from dumps
   - Process remaining 114 MB of dumps intelligently

### Priority 3: Self-Programming Enhancement
1. **Add AST parsing** (from gaps analysis)
2. **Improve code modification** (insert into existing files, not just replace)
3. **Add automated testing** to self-programming flow

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
