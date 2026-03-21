# Thread Reality Plan (2026-01-26)

## Missing capability list for reliable self-building
1. Deterministic patch/verification tools > use `apply_patch` with hashes and record diffs (currently manual edits in overlay).
2. Strict JSON wrapper + schema validation for the website audit route (phase requirement) to avoid the “No JSON object found” 502.
3. Proof bundle writer that logs diffs/logs/verifier output (our `docs/THREAD_REALITY/outputs/` folders serve as the start of this).
4. `/api/v1/tools/status` endpoint (already exists) needs to report Ollama tags, ffmpeg, whisper/piper/coqui presence, etc.
5. Vision endpoint stub (`/api/v1/vision/analyze`) plus model selection logic for media I/O foundations.
6. STT/TTS/video tool detection stubs (ffmpeg, whisper, piper/coqui, puppeteer/playwright) for next-phase automation.

## Task list (ordered)
1. Stabilize backend: start Node server so health/auto-builder/website-audit endpoints are reachable. Acceptance: `curl -I` against `/healthz`, `/auto-builder/status`, `/overlay/command-center.html` succeed without connection refused; proof: updated `docs/THREAD_REALITY/outputs/<timestamp>` after server start.
2. Harden website audit route with strict JSON wrapper and schema validation to prevent `No JSON object found`. Acceptance: `curl -s http://localhost:8080/api/v1/website/audit` returns JSON even when audit logic errors; proof: new smoke test output showing `jsonOnly` response.
3. Expand overlay to include runbook for deterministic patching, proof bundles, and tool status improvements. Acceptance: new sections in `command-center.html/js`, proof recorded in `PROOF.md`. Proof: `docs/THREAD_REALITY/outputs/20260126T015544Z/PROOF.md`.
4. Wire self-programming mode to sanitized instructions (already introduced, needs test). Acceptance: `curl -X POST /api/v1/system/self-program` with `instruction` works and overlay logs the response; proof: record response in `outputs/` directory.

## Verifiers
- `curl` commands listed above for health, overlay asset, tool/builder statuses.
- `npm test` (currently failing because server is down). Rerun once backend is live.
- `node --check public/overlay/command-center.js` (pass, see outputs file).

## Next proof artifacts
- `docs/THREAD_REALITY/outputs/<timestamp>/` already contains `node-check`, `npm-test`, and `curl` logs; append new entries after server comes up.
