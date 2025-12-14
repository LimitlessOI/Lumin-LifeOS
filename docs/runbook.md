# AI Counsel OS - Runbook

**Version**: 1.0.0  
**Last Updated**: 2025-01-XX

## Quick Start

### Prerequisites

1. **Node.js** >= 18.0.0
2. **PostgreSQL** (or Neon connection string)
3. **Ollama** (for local models) - [Install](https://ollama.com)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd Lumin-LifeOS

# Install dependencies
npm install

# Install js-yaml for model registry
npm install js-yaml commander

# Set up environment
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Ollama (local models)
OLLAMA_ENDPOINT=http://localhost:11434

# Premium APIs (optional, ROI-gated)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
GROK_API_KEY=...

# Cost Controls
MAX_DAILY_SPEND=0  # $0 = free models only
COST_SHUTDOWN_THRESHOLD=0  # Block paid models if exceeded
```

## Running the System

### Start Core Services

```bash
# Start main server
npm start

# Or with Node directly
node server.js
```

The server will:
- Initialize database tables
- Load model registry
- Start idea engine scheduler (every 30 minutes)
- Listen on port 8080 (default)

### Health Check

```bash
# Using CLI
node apps/cli/index.js health

# Or HTTP endpoint
curl http://localhost:8080/healthz
```

### Check Models

```bash
# List all models
node apps/cli/index.js models

# Test model availability
node apps/cli/index.js models --test
```

## Idea Engine

### Manual Run

```bash
# Generate 20 ideas
node apps/cli/index.js ideas run

# Generate custom count
node apps/cli/index.js ideas run --count 50
```

### Review Ideas

```bash
# Review today's ideas
node apps/cli/index.js ideas review

# Review specific date
node apps/cli/index.js ideas review --date 2025-01-15
```

### Automatic Generation

The idea engine runs automatically every 30 minutes when the server is running.

To disable:
- Stop the server, or
- Modify `services/idea-engine/index.js` to not start scheduler

## Model Setup

### Install Ollama Models

```bash
# Reasoning models (required)
ollama pull deepseek-v3:latest
ollama pull deepseek-r1:32b
ollama pull deepseek-r1:70b

# Code models
ollama pull deepseek-coder-v2:latest
ollama pull qwen2.5-coder:32b-instruct

# General models
ollama pull qwen2.5:32b-instruct
ollama pull llama3.3:70b-instruct-q4_0

# Vision models
ollama pull qwen2.5-vl:32b

# Embeddings
ollama pull nomic-embed-text

# Lightweight
ollama pull llama3.2:1b
ollama pull phi3:mini
```

### Verify Models

```bash
# List installed models
ollama list

# Test a model
ollama run deepseek-v3 "Hello, how are you?"
```

## Speech Setup (Optional)

### Whisper (STT)

```bash
# Install whisper (Python)
pip install openai-whisper

# Or use whisper.cpp (C++)
# See: https://github.com/ggerganov/whisper.cpp
```

### Piper (TTS)

```bash
# Install piper
# See: https://github.com/rhasspy/piper
```

## Troubleshooting

### Ollama Not Running

```bash
# Start Ollama
ollama serve

# Check if running
curl http://localhost:11434/api/tags
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check environment variable
echo $DATABASE_URL
```

### Models Not Available

```bash
# Check model registry
cat packages/model-registry/models.yaml

# Verify Ollama has models
ollama list

# Test model availability
node apps/cli/index.js models --test
```

### Idea Generation Fails

1. Check if models are available: `counsel models --test`
2. Check logs for errors
3. Verify embedding service (if using)
4. Check disk space for idea storage

## Performance Tuning

### Model Selection

Edit `packages/model-registry/models.yaml` to:
- Adjust model priorities
- Change default roles
- Add/remove models

### Idea Engine Frequency

Edit `services/idea-engine/index.js`:
```javascript
// Change from 30 minutes to custom interval
engine.startScheduler(60); // Every 60 minutes
```

### Cost Controls

Set in `.env`:
```bash
MAX_DAILY_SPEND=10  # Allow $10/day
COST_SHUTDOWN_THRESHOLD=50  # Block if spending > $50
```

## Monitoring

### Logs

Server logs to console. For production:
```bash
# Redirect to file
npm start > logs/server.log 2>&1

# Or use process manager
pm2 start server.js --name ai-counsel-os
```

### Metrics

- Ideas generated: `data/ideas/ideas.jsonl`
- Daily reports: `docs/ideas/YYYY-MM-DD.md`
- Benchmarks: `data/benchmarks/` (when implemented)

## Development

### Run Tests

```bash
# Unit tests (when implemented)
npm test

# Integration tests
npm run test:integration

# Benchmarks
npm run benchmark
```

### Add New Model

1. Add to `packages/model-registry/models.yaml`
2. Create adapter in `packages/adapters/` (if needed)
3. Test: `counsel models --test`

### Add New Capability

1. Define in model registry
2. Create adapter
3. Update orchestrator routing
4. Add tests

## Production Deployment

### Railway

1. Connect GitHub repo
2. Set environment variables
3. Deploy

### Local Server

1. Use PM2 or systemd
2. Set up reverse proxy (nginx)
3. Configure SSL
4. Set up monitoring

## Support

- Architecture docs: `docs/architecture/`
- Model registry: `packages/model-registry/models.yaml`
- CLI help: `node apps/cli/index.js --help`

## Next Steps

1. ✅ Set up Ollama and install models
2. ✅ Configure database
3. ✅ Start server
4. ✅ Run idea generation
5. ⏳ Set up speech (optional)
6. ⏳ Configure premium APIs (optional, ROI-gated)
7. ⏳ Run benchmarks
