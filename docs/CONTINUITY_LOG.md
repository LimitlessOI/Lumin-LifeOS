# Continuity Log
> This file is the running continuity reference for every conversation and action. It is always checked before responding.

## Update 2026-01-30 #1
- Hardware: MacBook Pro M2 Max, 32 GB RAM, 2 TB SSD running server-only mode; machine doubles as development host but being stripped down for LifeOS server.
- Models: Ollama hosts gemma2:27b-instruct-q4_0, deepseek variants (coder v2, v3, r1 70b/32b, coder 33b/6.7b, latest), qwen2.5 variants, qwen3-coder, llama3.3/3.2 70b/vision/1b, llava 7b, codestral, gpt-oss 20b/120b, phi3 mini, qllama reranker, nomic embed.
- Tools: ffmpeg missing, puppeteer present, playwright absent; python modules ok with only `piper` available.
- Priorities: real estate ideas (#1 Ad+Creative Pack, #2 Follow-Up & Script Assistant, #3 Showing Packet/CMA Snapshot). Auto-builder to work on 10 ideas, currently recycling one task; re-prioritize the queue to hit more ideas.
- Expectations: Always grade models, capture strengths/weaknesses, keep log for council. Use SSOT addendum for instructions, ensure brutal honesty, mention unknowns, track third-party solutions.
- Processes: lifeos server under PM2 via `npx pm2 start server.js --name lifeos --env production`, `pm2 save`; plan to run `sudo env PATH=$PATH:/Users/adamhopkins/.nvm/versions/node/v22.21.0/bin /Users/adamhopkins/Projects/Lumin-LifeOS/node_modules/pm2/bin/pm2 startup launchd -u adamhopkins --hp /Users/adamhopkins`. Monitor via `/api/v1/tools/status`, `pm2 logs lifeos`.
