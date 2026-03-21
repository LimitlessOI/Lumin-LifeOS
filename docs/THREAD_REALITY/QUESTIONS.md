# Thread Reality Questions (2026-01-26)

## A) User Questions (decision blockers)
1. The overlay changes assume the backend is running. Should I restart the Node server via `npm run dev` or another command before rerunning tests and curl checks? (Safe default: `npm run dev` + `npm test` after it listens.)

## B) System Questions (answerable via commands)
1. Once the server is up, confirm the builder state via `curl -s http://localhost:8080/api/v1/auto-builder/status` and ensure `builder` object is non-null and `builds.total > 0` if there are active builds.
2. When the server is listening, rerun `npm test` and `curl -I http://localhost:8080/overlay/command-center.html` to prove the overlay assets serve correctly.

## C) Council Questions (risks, missing tools, strict JSON)
1. Are there any governance objections to exposing the `/api/v1/system/self-program` mode directly in the overlay? If so, what guardrails (extra confirmation, dry-run) should we build?
2. Does the council want strict JSON proofs stored alongside these changes, or is the existing `docs/THREAD_REALITY/outputs/20260126T015544Z/PROOF.md` sufficient? (If not, wrap future outputs in a JSON envelope as required.)
