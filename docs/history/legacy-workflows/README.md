<!-- SYNOPSIS: index of archived (disabled) GitHub Actions workflows and why each was retired -->
# Legacy Workflows Archive

These GitHub Actions workflow files were moved out of `.github/workflows/` (which
disables them — Actions only runs top-level files in that directory). They are kept
here for history. Every one referenced a project structure or npm script that no
longer exists, ran on the deprecated Node 14 runner, and could therefore only ever
fail — producing permanent false-red checks on `main` and every PR.

| File | Job(s) | Why retired |
|------|--------|-------------|
| `ci.yml` | `build` | Ran `npm test` in `frontend/` and `backend/services/code-review/` — neither directory exists in the repo. Node 14. |
| `ci-cd.yml` | `build` | Node 14 duplicate of real CI; `Deploy to Railway` step was a bare `echo`. Deploy is handled by `railway-deploy.yml`. |
| `env-validation.yml` | `validate-env` | Ran `npm run validate-env` — no such script in `package.json`. Node 14. |

Active CI lives in `.github/workflows/` — notably `ssot-compliance.yml` (governance
gates), `smoke-test.yml` (syntax + tests), `pre-deploy-check.yml`, and
`railway-deploy.yml`.

To restore any of these, fix the underlying reference (recreate the directory/script,
bump the Node version) and move the file back into `.github/workflows/`.
