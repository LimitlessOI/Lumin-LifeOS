# Target Architecture - AI Counsel OS

**Version**: 1.0.0  
**Design Date**: 2025-01-XX

## Vision

A **local-first, modular AI Counsel OS** that:
- Runs entirely on open-source models by default
- Scales to premium APIs only when ROI is 5-10x
- Continuously generates and prioritizes product ideas
- Provides clear service boundaries and composability
- Maintains privacy (local data stays local)

## Architecture Principles

1. **Local-First**: All capabilities work locally; premium is optional enhancement
2. **Modular**: Clear service boundaries, dependency injection, interfaces
3. **Composable**: Services can be mixed/matched, replaced independently
4. **Graceful Degradation**: System works with missing components
5. **ROI-Gated Premium**: Premium APIs only when value > 5-10x cost
6. **Continuous Improvement**: Autonomous idea generation and prioritization

## Folder Structure

```
ai-counsel-os/
├── apps/
│   ├── server/              # Main HTTP/WebSocket server
│   ├── cli/                  # CLI tool (counsel commands)
│   └── overlay/              # UI overlay (future)
├── services/
│   ├── orchestrator/         # Task routing & orchestration
│   ├── memory/               # RAG + vector DB
│   ├── speech/               # STT + TTS
│   ├── calling/              # Inbound/outbound calls
│   ├── video/                # Video processing
│   └── idea-engine/          # Continuous idea generation
├── packages/
│   ├── model-registry/       # Model config & discovery
│   ├── adapters/             # Model/provider adapters
│   ├── types/                # Shared TypeScript types
│   └── prompts/              # Prompt templates
├── data/
│   ├── ideas/                # Idea storage (JSONL)
│   ├── benchmarks/           # Performance benchmarks
│   └── embeddings/           # Vector embeddings cache
├── docs/
│   ├── architecture/         # Architecture docs
│   ├── runbooks/             # Operations guides
│   └── conversation_dumps/   # Conversation history (if provided)
├── scripts/
│   ├── setup/                # Setup scripts
│   ├── benchmark/            # Benchmark harness
│   └── data-ingestion/       # Data import scripts
└── tests/
    ├── unit/                 # Unit tests
    ├── integration/          # Integration tests
    └── benchmarks/           # Performance tests
```

## Core Services

### 1. Orchestrator Service

**Purpose**: Routes tasks to appropriate capability modules

**Responsibilities**:
- Task type detection
- Capability matching
- Model selection
- Ensemble/voting coordination
- Fallback handling

**Interfaces**:
```typescript
interface Orchestrator {
  route(task: Task): Promise<Response>;
  getCapabilities(): Capability[];
  getAvailableModels(capability: Capability): Model[];
}
```

**Implementation**: `services/orchestrator/`

### 2. Model Registry

**Purpose**: Centralized model configuration and discovery

**Format**: YAML/JSON config files

**Structure**:
```yaml
models:
  - name: deepseek-r1:32b
    provider: ollama
    endpoint: http://localhost:11434
    capabilities:
      - reasoning
      - instruction_following
    strengths:
      - fast_reasoning
      - code_understanding
    token_limit: 32768
    latency_class: fast
    cost_class: free
    vision: false
    default_role: reasoning_fast
```

**Implementation**: `packages/model-registry/`

### 3. Memory Service (RAG)

**Purpose**: Document storage, retrieval, and semantic search

**Components**:
- Ingestion pipeline (text/audio/video)
- Chunking strategy
- Embeddings store (local vector DB)
- Reranking integration
- Personal vs project separation

**Storage**:
- Local-first: SQLite + vector extension OR lightweight vector DB
- Optional: PostgreSQL for metadata

**Implementation**: `services/memory/`

### 4. Speech Service

**Purpose**: STT and TTS with local-first support

**Components**:
- Whisper adapter (STT)
- Piper adapter (TTS)
- Streaming support
- Barge-in handling
- Premium provider fallback (optional)

**Implementation**: `services/speech/`

### 5. Calling Service

**Purpose**: Inbound/outbound call handling

**Components**:
- Streaming STT
- Low-latency response
- Turn-taking / barge-in
- TTS streaming output
- Local-first; premium pluggable

**Implementation**: `services/calling/`

### 6. Video Service

**Purpose**: Video processing and generation

**Components**:
- Video editing council (existing)
- ComfyUI integration (optional)
- Local "previs" mode
- Premium "final render" mode
- Abstraction layer for local vs premium

**Implementation**: `services/video/`

### 7. Idea Engine Service

**Purpose**: Continuous autonomous idea generation and prioritization

**Components**:
- Scheduler (every 30 minutes)
- Idea generation (20 ideas per run)
- Normalization (structured schema)
- Clustering/deduplication (embeddings + similarity)
- Model voting (multi-agent scoring)
- Output generation (markdown + JSONL)
- GitHub issue creation (optional)

**Schema**:
```typescript
interface Idea {
  id: string;
  title: string;
  problem: string;
  user: string;
  solution: string;
  differentiator: string;
  effort: 'easy' | 'medium' | 'hard' | 'very_hard';
  roi_hypothesis: number;
  novelty: number;        // 1-10
  feasibility: number;   // 1-10
  user_impact: number;  // 1-10
  revenue_potential: number; // 1-10
  time_to_demo: number;  // days
  strategic_alignment: number; // 1-10
  ensemble_score: number; // weighted average
  cluster_id?: string;
  created_at: Date;
}
```

**Implementation**: `services/idea-engine/`

## Adapters

### Model Adapters

**Purpose**: Abstract model provider differences

**Adapters**:
- `OllamaAdapter` - Local Ollama models
- `WhisperAdapter` - Local Whisper STT
- `PiperAdapter` - Local Piper TTS
- `ComfyUIAdapter` - ComfyUI video generation (optional)
- `PremiumAPIAdapter` - OpenAI, Anthropic, Google, etc. (with ROI gating)

**Interface**:
```typescript
interface ModelAdapter {
  name: string;
  capabilities: Capability[];
  call(prompt: string, options: CallOptions): Promise<Response>;
  isAvailable(): Promise<boolean>;
  getCostEstimate(prompt: string): number;
}
```

**Implementation**: `packages/adapters/`

## Premium ROI Gating

**Rule**: Only call premium APIs when:
1. Task requires it (quality threshold unmet locally)
2. Predicted ROI > 5x (based on configured value model)

**Implementation**:
- Cost/benefit logging
- Weekly report generator
- Automatic fallback to local
- Explicit opt-in for premium

**Location**: `services/orchestrator/premium-gate.ts`

## CLI Commands

**Tool**: `counsel` (in `apps/cli/`)

**Commands**:
```bash
counsel health              # System health check
counsel models              # List available models
counsel models test         # Test model availability
counsel ideas run           # Run idea generation manually
counsel ideas review        # Review ideas (default: today)
counsel ideas review --date 2025-01-15
counsel memory ingest <file> # Ingest document
counsel memory search <query> # Search memory
counsel benchmark           # Run benchmarks
```

## Data Storage

### Ideas
- **Format**: JSONL (append-only)
- **Location**: `data/ideas/ideas.jsonl`
- **Daily Reports**: `docs/ideas/YYYY-MM-DD.md`
- **Database**: Optional PostgreSQL for querying

### Benchmarks
- **Format**: JSON
- **Location**: `data/benchmarks/`
- **Metrics**: Latency, quality score, cost per task type

### Embeddings
- **Format**: Vector DB (local)
- **Location**: `data/embeddings/`
- **Cache**: Reuse embeddings for similar queries

## Testing Strategy

### Unit Tests
- Router decisions
- Idea clustering
- RAG retrieval
- Voting logic
- Adapter interfaces

### Integration Tests
- End-to-end workflows
- Service communication
- Fallback scenarios

### Benchmarks
- Latency per model per task type
- Quality scoring
- Cost tracking
- Performance regression detection

## Migration Path

### Phase 1: Structure
1. Create new folder structure
2. Move core modules to services
3. Extract model registry
4. Create adapters

### Phase 2: Features
1. Implement idea engine with clustering
2. Add local STT/TTS
3. Build RAG with vector DB
4. Create CLI

### Phase 3: Premium Gating
1. Implement ROI calculation
2. Add premium gate
3. Create cost/benefit logging
4. Generate reports

### Phase 4: Polish
1. Add tests
2. Create benchmarks
3. Write runbook
4. Document APIs

## Success Metrics

1. **Local-First**: 90%+ of tasks handled locally
2. **ROI**: Premium calls only when ROI > 5x
3. **Ideas**: 20 ideas every 30 minutes, top 10 prioritized
4. **Performance**: <2s latency for local models
5. **Reliability**: Graceful degradation when components missing
6. **Test Coverage**: >80% unit test coverage

## Next Steps

See implementation plan in `/docs/implementation-plan.md`
