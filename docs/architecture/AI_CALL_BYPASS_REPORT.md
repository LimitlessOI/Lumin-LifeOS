<!-- SYNOPSIS: AI Call Bypass Report -->

# AI Call Bypass Report

**Generated:** 2026-05-31T05:06:45.870Z
**Total hits:** 27

| File | Line | Provider | Metered | Kernel | Priority | Action |
|------|------|----------|---------|--------|----------|--------|
| `services/ai-interaction/guide-ai.js` | 5 | openai | no | no | P1 | audit |
| `services/builder-council-review.js` | 168 | anthropic | no | no | P0 | route through callCouncilMember/kernel or record unmetered exception |
| `services/builder-council-review.js` | 191 | groq | no | no | P0 | route through callCouncilMember/kernel or record unmetered exception |
| `services/builder-council-review.js` | 191 | openai-compatible | no | no | P0 | route through callCouncilMember/kernel or record unmetered exception |
| `services/builder-council-review.js` | 216 | perplexity | no | no | P0 | route through callCouncilMember/kernel or record unmetered exception |
| `services/builder-council-review.js` | 237 | groq | no | no | P0 | route through callCouncilMember/kernel or record unmetered exception |
| `services/builder-council-review.js` | 237 | openai-compatible | no | no | P0 | route through callCouncilMember/kernel or record unmetered exception |
| `services/builder-council-review.js` | 363 | cerebras | no | no | P0 | route through callCouncilMember/kernel or record unmetered exception |
| `services/builder-council-review.js` | 363 | openai-compatible | no | no | P0 | route through callCouncilMember/kernel or record unmetered exception |
| `services/council-service.js` | 1557 | openai-compatible | partial | partial-internal | P1 | audit |
| `services/council-service.js` | 1624 | anthropic | partial | partial-internal | P1 | audit |
| `services/word-keeper-transcriber.js` | 64 | openai | no | no | P1 | audit |
| `routes/tco-routes.js` | 1090 | openai | no | no | P1 | audit |
| `routes/tco-routes.js` | 1090 | openai-compatible | no | no | P1 | audit |
| `routes/tco-routes.js` | 1117 | anthropic | no | no | P1 | audit |
| `scripts/build-task.js` | 66 | openai | no | no | P2 | audit |
| `scripts/build-task.js` | 66 | openai-compatible | no | no | P2 | audit |
| `scripts/builder-daemon.js` | 79 | openai | no | no | P2 | audit |
| `scripts/builder-daemon.js` | 79 | openai-compatible | no | no | P2 | audit |
| `scripts/extract-all-ideas.js` | 52 | ollama | no | no | P2 | audit |
| `scripts/lumin-idea-generator.js` | 77 | ollama | no | no | P2 | audit |
| `scripts/run-memory-import.mjs` | 51 | anthropic | no | no | P2 | audit |
| `scripts/test-ollama-connection.js` | 83 | ollama | no | no | P2 | audit |
| `scripts/test-ollama-models.js` | 41 | ollama | no | no | P2 | audit |
| `packages/adapters/premium-api.js` | 97 | openai | no | no | P1 | audit |
| `packages/adapters/premium-api.js` | 97 | openai-compatible | no | no | P1 | audit |
| `packages/adapters/premium-api.js` | 131 | anthropic | no | no | P1 | audit |

Regenerate: `npm run ai:bypasses`
