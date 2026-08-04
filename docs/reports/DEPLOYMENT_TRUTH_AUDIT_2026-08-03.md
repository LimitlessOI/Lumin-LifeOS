<!-- SYNOPSIS: Phase 8 deployment-truth audit for the Taloa architecture (2026-08-03). Audit deliverable. -->

# Deployment Truth Audit (Phase 8) — 2026-08-03

**Production:** https://lumin-web-production-e3a9.up.railway.app · **Audited local ref:** `38dba2a0` (origin/main).

## Read-only production probes
| Probe | Result | Meaning |
|---|---|---|
| `GET /health` | 200, `{ok:true, database:ok, truth_spine_applied:true}` | App is up; truth-spine live. |
| `GET /api/v1/lifeos/system/health` | 404 "Cannot GET" | The canonical health path advertised in `/health` body does not answer via GET (routing quirk). |
| `GET /api/v1/institutional-constellation` | **404** | No Taloa constellation route in production. |
| `POST /api/v1/confidence-architecture` | **404** | Route is mounted at HEAD (`startup/register-runtime-routes.js`) but 404s in prod → **production likely trails origin/main**, or mount is conditional. |
| `/version`, `/api/version`, `/git-sha`, `/api/v1/build`, etc. | 404 | **No deployed-commit SHA is exposed.** |

## Distinctions (per audit standard)
- **Local:** engine files present at `38dba2a0`.
- **Committed:** yes.
- **Pushed:** yes (HEAD == origin/main).
- **Deployed:** **cannot be positively confirmed** — no SHA endpoint; and a route present in HEAD (`confidence-architecture`) 404s in prod, which is affirmative evidence that deployed ≠ HEAD.
- **Runtime-reachable in prod:** **No** for every Taloa engine (constellation 404; and per Phase 2, none are on any route anyway).
- **Behaviorally proven in prod:** **No.**

## Conclusion (F-11, P2)
Production is a healthy LifeOS app running the truth-enforcement spine. **None of the Taloa constitutional-learning architecture is reachable in production**, and the one Taloa-adjacent route that HEAD mounts is not answering — so even "committed == deployed" fails for that route. Deploy receipts (if any) prove at most a commit hash, not that the intended constitutional behavior is live. Recommendation: expose a `deployed_sha` on `/health` so deployment truth is checkable, then re-verify each engine via a real production endpoint once wired.

*All probes were read-only GET/POST with empty/benign bodies. No SMS, calls, writes, or state changes were performed. `COMMAND_CENTER_KEY` was available but not needed for these unauthenticated safe probes.*
