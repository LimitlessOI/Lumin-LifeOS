# AI Counsel OS - Reorganization Summary

**Date**: 2025-01-XX  
**Status**: Phase 1 Complete (Structure + Core Components)

## What Was Done

### Phase 0: Repo Audit ✅

- **Created**: `docs/architecture/current.md` - Comprehensive analysis of existing architecture
- **Created**: `docs/architecture/target.md` - Target architecture design
- **Identified**: Key issues (monolithic structure, mixed patterns, missing local-first features)
- **Documented**: Current strengths (two-tier system, idea generation, knowledge base)

### Phase 1: Target Architecture ✅

#### Folder Structure Created
```
apps/
  ├── server/          # Main HTTP server (to be migrated)
  ├── cli/            # CLI tool (✅ created)
  └── overlay/         # UI overlay (future)

services/
  ├── orchestrator/   # Task routing (skeleton)
  ├── memory/         # RAG system (to be migrated)
  ├── speech/         # STT/TTS (to be migrated)
  ├── calling/        # Call system (to be migrated)
  ├── video/          # Video processing (to be migrated)
  └── idea-engine/    # Idea generation (✅ created)

packages/
  ├── model-registry/ # Model config (✅ created)
  ├── adapters/       # Model adapters (✅ created)
  ├── types/          # TypeScript types (future)
  └── prompts/        # Prompt templates (future)

data/
  ├── ideas/          # Idea storage
  ├── benchmarks/     # Performance data
  └── embeddings/     # Vector cache

docs/
  ├── architecture/   # Architecture docs (✅ created)
  ├── runbooks/       # Operations guides (✅ created)
  └── conversation_dumps/ # Conversation history (✅ created)
```

#### Model Registry ✅

- **Created**: `packages/model-registry/models.yaml` - Complete model configuration
  - 20+ models defined (reasoning, code, vision, embeddings, speech)
  - Capability mappings
  - Role assignments
  - Cost classifications
- **Created**: `packages/model-registry/index.js` - Registry loader and query functions

#### Adapters ✅

- **Created**: `packages/adapters/ollama.js` - Ollama local models
- **Created**: `packages/adapters/whisper.js` - Whisper STT (local)
- **Created**: `packages/adapters/piper.js` - Piper TTS (local)
- **Created**: `packages/adapters/premium-api.js` - Premium APIs with ROI gating

#### Idea Engine ✅

- **Created**: `services/idea-engine/index.js` - Full pipeline:
  - Generate 20 ideas every 30 minutes
  - Normalize to structured schema
  - Cluster/dedupe using embeddings
  - Multi-model voting system
  - Save to JSONL + markdown
  - Scheduler support

#### CLI Tool ✅

- **Created**: `apps/cli/index.js` - Command-line interface
  - `counsel health` - System health check
  - `counsel models` - List/test models
  - `counsel ideas run` - Generate ideas
  - `counsel ideas review` - Review ideas
  - `counsel benchmark` - Run benchmarks (placeholder)

#### Documentation ✅

- **Created**: `docs/runbook.md` - Complete operations guide
- **Created**: `docs/conversation_dumps/README.md` - Instructions for conversation history

### Phase 2: Idea Engine ✅

- ✅ Idea generation with structured schema
- ✅ Clustering/deduplication (embeddings + similarity)
- ✅ Multi-model voting system
- ✅ Ensemble scoring
- ✅ JSONL + markdown output
- ✅ Scheduler (every 30 minutes)

### Phase 3: Premium ROI Gating ✅

- ✅ ROI threshold enforcement (5-10x rule)
- ✅ Cost estimation
- ✅ Automatic blocking when ROI insufficient
- ✅ Logging and reporting hooks

## What Still Needs to Be Done

### Immediate Next Steps

1. **Migrate Existing Code**
   - Move `server.js` logic to `apps/server/`
   - Extract core modules to services
   - Update imports and dependencies

2. **Complete Orchestrator**
   - Implement capability-based routing
   - Add ensemble/voting coordination
   - Integrate with model registry

3. **Complete Memory Service**
   - Implement local vector DB
   - Add embedding service
   - Integrate reranking
   - Migrate existing knowledge base

4. **Complete Speech Service**
   - Integrate Whisper adapter
   - Integrate Piper adapter
   - Add streaming support
   - Add barge-in handling

5. **Complete Calling Service**
   - Integrate speech service
   - Add turn-taking logic
   - Migrate existing VAPI integration

6. **Complete Video Service**
   - Migrate video editing council
   - Add ComfyUI adapter (optional)
   - Add abstraction layer

7. **Testing**
   - Unit tests for router, clustering, voting
   - Integration tests
   - Benchmark harness

8. **Integration**
   - Connect idea engine to server
   - Connect CLI to services
   - Update server.js to use new structure

## How to Use What's Been Created

### 1. Model Registry

```javascript
import ModelRegistry from './packages/model-registry/index.js';

const registry = ModelRegistry.loadRegistry();
const models = registry.getAllModels();
const reasoningModels = registry.getModelsByRole('reasoning');
```

### 2. Idea Engine

```javascript
import IdeaEngine from './services/idea-engine/index.js';

const engine = new IdeaEngine(callCouncilMember, modelRegistry, embeddingService);

// Run once
await engine.run(20);

// Start scheduler
engine.startScheduler(30); // Every 30 minutes
```

### 3. Adapters

```javascript
import OllamaAdapter from './packages/adapters/ollama.js';

const adapter = new OllamaAdapter();
const available = await adapter.isAvailable();
const response = await adapter.call(prompt, { model: 'deepseek-v3' });
```

### 4. CLI

```bash
# Make executable
chmod +x apps/cli/index.js

# Or use via node
node apps/cli/index.js health
node apps/cli/index.js models
node apps/cli/index.js ideas run
```

## File Locations

### Key Files Created

- `docs/architecture/current.md` - Current architecture analysis
- `docs/architecture/target.md` - Target architecture design
- `packages/model-registry/models.yaml` - Model configurations
- `packages/model-registry/index.js` - Registry loader
- `services/idea-engine/index.js` - Idea generation engine
- `packages/adapters/*.js` - Model adapters
- `apps/cli/index.js` - CLI tool
- `docs/runbook.md` - Operations guide

### Data Directories

- `data/ideas/` - Idea storage (JSONL)
- `data/benchmarks/` - Performance data
- `data/embeddings/` - Vector cache
- `docs/ideas/` - Daily idea reports (markdown)

## Dependencies Added

- `js-yaml` - For model registry YAML parsing
- `commander` - For CLI argument parsing

## Next Session Priorities

1. **Integrate idea engine into server.js**
   - Add API endpoints
   - Start scheduler on server startup
   - Connect to existing database

2. **Create orchestrator service**
   - Implement routing logic
   - Add capability matching
   - Integrate with adapters

3. **Migrate knowledge base to memory service**
   - Add vector DB support
   - Implement embedding service
   - Add reranking

4. **Add tests**
   - Unit tests for core components
   - Integration tests
   - Benchmark harness

## Notes

- All new code is in the new folder structure
- Existing code in `server.js` and `core/` remains unchanged
- Migration can be done incrementally
- New components are designed to work alongside existing code
- Graceful degradation when components are missing

## Questions for User

1. **Conversation History**: Do you have ChatGPT conversation exports to paste in `docs/conversation_dumps/`?

2. **Migration Strategy**: 
   - Incremental (keep server.js, gradually migrate)?
   - Big bang (rewrite server.js to new structure)?
   - Hybrid (new endpoints in new structure, old ones remain)?

3. **Priority**: Which service should be completed first?
   - Orchestrator (routing)
   - Memory (RAG)
   - Speech (STT/TTS)
   - Idea engine integration

4. **Testing**: Should I create test framework now or after migration?

5. **Dependencies**: Any specific versions or additional packages needed?
