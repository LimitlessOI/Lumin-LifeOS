# Thread Reality Root Causes (2026-01-26)

## 1. `GET /api/v1/auto-builder/status` right now returns `builder:null` and `builds.total=0`
- **Symptom:** Endpoint is unreachable (connection refused) because the local Node process is not running; therefore no builder data can be returned.
- **Evidence:** curl against `/healthz`/train fails (see `outputs/20260126T015544Z/curl-healthz.txt`).
- **Fix options (ranked):**
  1. Start the Express server (`npm run dev` or `node server.js`) so the builder service can populate `builds` data.
  2. Once running, inspect `server.js` lines 14100+ where the builder status is assembled to ensure a valid `builder` object is returned.
- **Verification:** rerun `curl -s http://localhost:8080/api/v1/auto-builder/status` and confirm `builder` is not null and `builds.total` reflects ongoing work.

## 2. Website audit failures (“No JSON object found...” / 502)
- **Symptom:** Our overlay cannot reach `/api/v1/website-audit` when the stack is offline, so the JSON body never arrives and the client interprets the failure as “No JSON object found.”
- **Evidence:** smoke tests that hit `/api/v1/website/audit` fail with `fetch failed` because nothing is listening (see `outputs/20260126T015544Z/npm-test.txt`).
- **Fix options:**
  1. Bring the server online and check `routes/website-audit-routes.js` to ensure the audit route handles JSON (add strict wrapper if needed).
  2. Add a local strict-JSON wrapper in the audit route so the overlay always gets valid structured data, even when the backend has partial failures.
- **Verification:** After restart, rerun the smoke test or `curl -s http://localhost:8080/api/v1/website/audit` with a simple payload and confirm a JSON response.

## 3. Self-program endpoint rejecting objective-only requests
- **Symptom:** The overlay now sends `instruction` payloads, but when only `objective` is provided the endpoint responds `400` because it expects `instruction` or file instructions (`server.js:14632-14790`).
- **Fix options:**
  1. Enhance the overlay to translate objectives into instructions (already done) and include JSON wrapper with explicit `instruction`/`objective` metadata.
  2. Verify server-side normalization (`server.js` around line 14680) works as expected by running `curl -X POST /api/v1/system/self-program` with both `objective` and `instruction`.
- **Verification:** Send a dry-run payload (`jsonOnly: true`) and confirm the response contains sanitized `instruction`, then flip to `autoDeploy` once stable.
