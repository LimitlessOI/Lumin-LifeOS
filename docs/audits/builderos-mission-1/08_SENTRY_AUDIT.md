<!-- SYNOPSIS: 8. SENTRY Audit -->


# 8. SENTRY Audit

## 8.1 SENTRY files
| SENTRY File | Role |
|---|---|
| builderos-reboot/scripts/founder-memory-sentry-proof.mjs | verification |
| builderos-reboot/scripts/run-sentry-checks.mjs | verification |
| builderos-reboot/scripts/sentry-behavior-proof.mjs | verification |
| scripts/deliberation-sentry-probe-cleanup.mjs | verification |
| scripts/deliberation-sentry-regression-harness.mjs | verification |
| scripts/sentry-chair-governance-audit.mjs | verification |
| scripts/sentry-prealpha-gate.mjs | verification |
| scripts/sentry-site-builder-prealpha-gate.mjs | verification |
| services/builderos-sentry-job-audit.js | service |
| services/self-repair-sentry-canary.js | service |
| services/sentry-findings-to-improvement-feed.js | service |
| services/sentry-system-audit.js | service |
| docs/SENTRY_PREALPHA_DOCTRINE.md | verification |
| builderos-reboot/CLAUDE_CODE_SENTRY_REVIEW_PROMPT.md | verification |
| builderos-reboot/CODEX_SENTRY_REVIEW_PROMPT.md | verification |
| builderos-reboot/SENTRY_AUDIT_REPORT.md | verification |
| builderos-reboot/SENTRY_CHECK_RESULT.json | verification |

## 8.2 Independence assessment
- SENTRY lives in the same repo and is invoked by the same `npm run` commands as the builder.
- No separate CI pipeline or independent agent is required to approve.
- SENTRY can be bypassed by skipping preflight, using env bypass flags, or calling builder route directly.

## 8.3 Runtime differences
`scripts/sentry-prealpha-gate.mjs` uses Playwright against live deployed app; not enforced pre-deploy.
Recent passes were achieved by manual fixes, not gate enforcement.

## 8.4 Dead/optional verification paths
- Factory SENTRY `factory-staging/factory-core/sentry/run-verification.js` is not wired into production builder route per harness audit.
- `builderos-reboot/SENTRY_AUDIT_REPORT.md` exists but not machine-enforced.