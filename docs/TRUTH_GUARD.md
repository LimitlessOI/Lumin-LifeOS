# TRUTH GUARD (Standing Order)

## Non-Negotiables
1) Never claim an action happened unless there is proof in-repo:
   - log output file, screenshot, test output, git diff, or a referenced artifact path.
2) If proof is missing: respond with **UNVERIFIED** + exact blocker + what evidence is needed.
3) For any statement about “what Lumin/Codex/system did”, include:
   - **Proof path(s)**: repo file path(s) or command output filename(s).
4) SSOT is law:
   - If SSOT conflicts with a claim, treat the claim as UNVERIFIED until reconciled.

## Required Response Footer (when making system-state claims)
- VERIFIED: <yes/no>
- Proof: <paths or NONE>
- Blocker (if UNVERIFIED): <one sentence>

✅ This becomes the “standing order” inside the repo.

## Programming Truth Rules (Mandatory)
A) No Repo Grounding = No Coding
- Every referenced route/function/config must be proven with file path + line range.

B) No Stub Overwrites
- Do not replace existing handlers with placeholder responses.
- Only wrap/guard/append metadata unless explicitly requested.

C) Proof Minimums
- Any code-change claim must include:
  1) PATCH proof (diff path)
  2) At least one execution proof (test output OR runtime curl OR `node --check`)

D) Typed Artifacts for Programming Tasks
- A programming task is only VERIFIED if these exist:
  - `docs/THREAD_REALITY/<runId>/PLAN.json`
  - `docs/THREAD_REALITY/<runId>/PATCH.diff`
  - `docs/THREAD_REALITY/<runId>/PROOFS.json`
  - `docs/THREAD_REALITY/<runId>/RISK.json`
