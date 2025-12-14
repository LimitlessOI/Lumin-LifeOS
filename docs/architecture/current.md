# Current Architecture - Lumin-LifeOS

**Last Updated**: 2025-01-XX  
**Version**: 27.0.0

## Overview

Lumin-LifeOS is a monolithic Node.js/Express application with a two-tier AI council system, designed for local-first operation with premium API fallbacks.

## Entry Points

### Primary Entry Point
- **`server.js`** (12,314 lines) - Main Express server
  - Handles all HTTP/WebSocket routes
  - Initializes database connections
  - Manages AI council members
  - Coordinates all services

### Secondary Entry Points
- Various service-specific entry points in `/services/` (Python, Go, JS)
- Client applications in `/client/`, `/frontend/`, `/dashboard/`

## Core Architecture

### 1. AI Council System

**Two-Tier Architecture:**
- **Tier 0 (Open Source)**: Local Ollama models, free/cheap cloud models
- **Tier 1 (Premium)**: GPT-4o, Gemini, Grok (oversight only)

**Key Components:**
- `core/tier0-council.js` - Free/cheap model execution
- `core/tier1-council.js` - Premium model validation
- `core/open-source-council.js` - Specialization-based routing
- `core/model-router.js` - Intelligent model selection
- `core/video-editing-council.js` - Video processing coordination

**Council Members** (defined in `server.js:1516-1729`):
- Local Ollama models: `ollama_deepseek`, `ollama_llama`, `ollama_phi3`, etc.
- Cloud models: `deepseek`, `chatgpt`, `gemini`, `grok`
- 9+ specialized open source models added recently

### 2. Database Layer

**Primary Database**: PostgreSQL (Neon)
- Connection pool managed in `server.js`
- Tables auto-created on startup via `initDatabase()`

**Key Tables:**
- `conversation_memory` - Chat history
- `consensus_proposals` - AI consensus decisions
- `knowledge_base_files` - Document storage
- `comprehensive_ideas` - Idea tracking
- `daily_ideas` - Daily idea generation
- `execution_tasks` - Task queue
- `daily_spend` - Cost tracking

### 3. Services Architecture

**Core Services** (`/core/`):
- `knowledge-base.js` - RAG/document storage
- `enhanced-idea-generator.js` - Idea generation pipeline
- `comprehensive-idea-tracker.js` - Idea management
- `auto-queue-manager.js` - Task queue management
- `outreach-automation.js` - Email/SMS/phone automation
- `vapi-integration.js` - Voice API integration
- `video-generator.js` - Video generation
- `web-scraper.js` - Web scraping

**External Services** (`/services/`):
- 200+ files across multiple languages (JS, Python, Go)
- Various microservices for specific domains
- Mixed patterns and architectures

### 4. Memory & Knowledge

**Knowledge Base System:**
- File-based storage in `/knowledge/` directories
- PostgreSQL for metadata
- Full-text search via `tsvector`
- Categories: business-ideas, context, historical, security

**Memory System:**
- Conversation memory in PostgreSQL
- Context injection into prompts
- Source of Truth storage (`system_source_of_truth` table)

### 5. Idea Generation System

**Current Implementation:**
- `generateDailyIdeas()` in `server.js` - Simple daily generation
- `core/enhanced-idea-generator.js` - Full pipeline (generate → debate → research → vote)
- `core/comprehensive-idea-tracker.js` - Idea storage and tracking
- `core/auto-queue-manager.js` - Automatic idea queueing

**Features:**
- Multi-AI idea generation
- Council debate and improvement
- Online research integration
- Voting system
- Automatic queueing

**Missing:**
- Clustering/deduplication
- Embedding-based similarity
- Scheduled execution (runs on-demand, not every 30 min)
- Structured output format

### 6. Speech & Calling

**Current Implementation:**
- `core/vapi-integration.js` - Vapi voice API integration
- Twilio integration for SMS/phone
- `core/outreach-automation.js` - Automated outreach

**Missing:**
- Local STT (Whisper)
- Local TTS (Piper)
- Streaming support
- Barge-in handling

### 7. Video Processing

**Video Editing Council:**
- `core/video-editing-council.js` - Coordinates 8 video tools
- FFmpeg, AnimateDiff, Stable Video Diffusion, Whisper, Coqui TTS, MoviePy, OpenCV
- Uses Ollama for AI coordination
- API endpoints: `/api/v1/video/process`, `/api/v1/video/council/status`

### 8. Cost Management

**Features:**
- Daily spend tracking
- Cost shutdown thresholds
- MAX_DAILY_SPEND enforcement
- ROI tracking
- Automatic fallback to free models

## Dependencies

### Runtime
- Node.js >= 18.0.0
- PostgreSQL (Neon)
- Ollama (local, optional)

### NPM Packages (minimal)
- `express` - Web server
- `pg` - PostgreSQL client
- `ws` - WebSockets
- `dayjs` - Date handling
- `dotenv` - Environment config
- `stripe` - Payments
- `twilio` - SMS/phone

### External Services
- Railway (hosting)
- Neon (PostgreSQL)
- Stripe (payments)
- Twilio (SMS/phone)
- OpenAI, Anthropic, Google, X.AI (AI APIs)

## File Structure

```
Lumin-LifeOS/
├── server.js (12K+ lines - monolithic)
├── core/ (43 modules)
├── services/ (200+ files)
├── docs/ (16 files)
├── scripts/ (29 files)
├── database/ (migrations)
├── client/, frontend/, dashboard/ (UI)
├── config/ (31 config files)
└── [many other directories]
```

## Issues & Technical Debt

### 1. Monolithic Structure
- `server.js` is 12,314 lines
- All routes, logic, and services in one file
- Difficult to test and maintain

### 2. Mixed Patterns
- Services in `/services/` use different languages/patterns
- No clear service boundaries
- Inconsistent error handling

### 3. No Clear Module Boundaries
- Core modules tightly coupled
- No dependency injection
- Global state management

### 4. Missing Local-First Features
- No local STT/TTS
- No local vector DB for embeddings
- No local reranking
- Limited graceful degradation

### 5. Idea System Gaps
- No clustering/deduplication
- No embedding-based similarity
- No scheduled execution
- No structured output format

### 6. No Model Registry
- Models hardcoded in `COUNCIL_MEMBERS`
- No capability profiles
- No dynamic model discovery

### 7. Limited Testing
- No test suite visible
- No benchmark harness
- No integration tests

### 8. Documentation Gaps
- README is generic
- No architecture docs (until now)
- No runbook
- No API documentation

## Strengths

1. **Working Two-Tier System** - Effective cost optimization
2. **Open Source Council** - Good specialization routing
3. **Idea Generation** - Functional pipeline
4. **Knowledge Base** - Document storage working
5. **Cost Management** - Effective spend controls
6. **Video Council** - Coordinated video processing

## Next Steps

See `target.md` for the proposed architecture that addresses these issues while preserving strengths.
