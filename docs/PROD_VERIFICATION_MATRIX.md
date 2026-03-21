# Production verification matrix

**Purpose:** Single source of truth for “what works in prod.” All Phase 3 verification results land here. No drift; every row has status, date, command/endpoint, and evidence.

**How to use:** When you run a verification, add or update the row. Set status to ✅ working / ❌ broken / N/A (with reason, e.g. “trial expired”). Link or path to screenshot/log.

| Item | Status | Date tested | Endpoint / command | Evidence (path or link) |
|------|--------|-------------|--------------------|-------------------------|
| Railway ↔ Ollama tunnel | _pending_ | - | e.g. POST /api/v1/chat (free model) | - |
| Groq fallback (cost shutdown) | _pending_ | - | e.g. GET /api/v1/chat with MAX_DAILY_SPEND=0, Ollama off | - |
| Overlay UI | _pending_ | - | Load overlay, trigger status or chat | - |

**Note:** If Railway trial is expired, set Railway row to **N/A** and in Evidence put: “Railway trial expired as of YYYY-MM-DD; verification not run.”
