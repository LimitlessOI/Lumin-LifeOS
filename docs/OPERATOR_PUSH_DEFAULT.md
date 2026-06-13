# Operator push default (Adam standing order)

**Default:** After shippable work — **commit → push `main` → redeploy Railway** — without being asked.

**Hold only when Adam explicitly says:** `don't push`, `hold`, `local only`, or similar.

## Push is not optional

- Do **not** stop at "commit blocked" or "push failed" and wait for Adam.
- **Fix the blocker** (SSOT receipt, GAP-FILL tag, INTENT DRIFT line, manifest, hook error) and **retry push** until it succeeds or you hit a true external blocker (no network, no credentials) — then report the blocker with evidence.

## Typical hook fixes

| Blocker | Fix |
|---------|-----|
| SSOT violation | Update amendment Change Receipts + `@ssot` target |
| GAP-FILL required | Commit message includes `GAP-FILL:` + what tried + exact error |
| INTENT DRIFT gate | Add `INTENT DRIFT: none` or `asked X, delivered Y` |
| Pre-commit syntax | Fix the file, re-stage, retry |

## Deploy follows push

After push to `main`, trigger deploy (`npm run system:railway:redeploy` or `build-from-latest`) and verify live (`/voice-rail/health`, deploy SHA) — do not assume refresh alone updates production.

Also mirrored locally at `.cursor/rules/operator-push-default.mdc` (gitignored; this doc is SSOT for agents).
