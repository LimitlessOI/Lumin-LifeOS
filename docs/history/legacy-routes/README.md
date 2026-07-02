<!-- SYNOPSIS: Archive index for dead+broken route modules quarantined out of routes/ -->

# Legacy / dead route modules (quarantined)

These Express route modules were moved out of `routes/` because they are **both
unwired and unbuildable**: every one imports a symbol that does not exist, and
nothing in the active codebase registers or imports them. They are abandoned
half-built LifeOS *product* features (not part of the BuilderOS system spine).

They are preserved here (not deleted) so the intent is recoverable if any of
these features is ever escalated for a real build. Git history holds the full
original path/content. Files are archived with a `.js.txt` extension so they are
inert (not importable, not subject to the FILE SYNOPSIS LAW / import guards) —
strip the trailing `.txt` to restore the original module on revival.

## Evidence (captured 2026-07-02)

Discovered by importing every module under `routes/` (126 files): 123 resolved
cleanly, these 3 failed at ESM instantiation. `node --check` and `madge` do NOT
resolve named exports, so CI never flagged them.

| File (original path) | Broken import | Why dead |
|---|---|---|
| `routes/lifeos-conflict-interrupt-routes.js` | `import { requireLifeOSUser } from "./lifeos-auth-helpers.js"` — **`lifeos-auth-helpers.js` never existed** (not on `origin/main`, no git history) | 0 registration/import references anywhere in active code |
| `routes/lifeos-decision-review-routes.js` | `import { requireLifeOSUser } from "./lifeos-auth-helpers.js"` — same phantom module | 0 registration/import references anywhere in active code |
| `routes/lifeos-sleep-routes.js` | `import { requireLifeOSUser } from './lifeos-auth-routes.js'` — that file does **not** export `requireLifeOSUser` (it lives in `middleware/lifeos-auth-middleware.js`) | 0 registration/import references anywhere in active code |

## To revive one

`requireLifeOSUser` is real — it is exported from
`middleware/lifeos-auth-middleware.js`. A revival would: (1) repoint the import
to that middleware, (2) register the router in the appropriate runtime
(`startup/register-runtime-routes.js`), (3) add tests + SSOT receipts. Until
then they stay quarantined so a comprehensive route import-resolution guard can
treat "every file in `routes/` must import cleanly" as an invariant.
