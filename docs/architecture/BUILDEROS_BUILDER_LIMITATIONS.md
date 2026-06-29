<!-- SYNOPSIS: BUILDEROS BUILDER LIMITATION REGISTRY -->

# BUILDEROS BUILDER LIMITATION REGISTRY

**Status:** `LIVE — updated from confirmed failures`
**Owner:** Adam
**Verifier:** OIL
**Last Updated:** 2026-05-25
**Purpose:** Document what the Builder can and cannot do reliably, with confirmed evidence. Cold agents MUST read this before attempting any builder call for existing large files.

---

## Summary

The BuilderOS builder (Railway council AI via `POST /api/v1/lifeos/builder/build`) is a powerful tool for generating new files from specifications. It has a confirmed failure mode for surgical edits on large existing files: it generates stub files instead of making the targeted change.

| Builder Task Type | Reliability | Evidence |
|---|---|---|
| New markdown documentation files | ✅ HIGH — except docs/ is outside safe-scope | Multiple sessions |
| New service files (`services/*.js`) | ✅ HIGH | Many successful commits across sessions |
| New route files (`routes/*.js`) | ✅ HIGH | Multiple sessions |
| New migration files (`db/migrations/*.sql`) | ✅ HIGH | Multiple sessions |
| New scripts (`scripts/*.mjs`) | ✅ HIGH | Multiple sessions |
| New config files (`config/*.js`) | ✅ HIGH | Multiple sessions |
| Surgical edits to existing files > 150 lines | ❌ UNRELIABLE — generates stubs | Confirmed 2026-05-25 (3 files) |
| Surgical edits to existing files 50–150 lines | ⚠️ MODERATE — works sometimes | Prior sessions mixed results |
| Complete rewrites of large files | ❌ HIGH RISK — generates truncated output | Multiple documented incidents |
| Files in startup/, middleware/, core/ | ❌ BLOCKED — builder safe-scope policy | config/builder-safe-scope.js |
| Files in docs/ | ❌ BLOCKED — builder safe-scope policy | config/builder-safe-scope.js |
| Files in server.js | ❌ BLOCKED — builder safe-scope policy | config/builder-safe-scope.js |

---

## 1. What Builder Does Well

### New Files

The builder reliably creates new files from a well-structured spec. The spec should include:
- Exact file path (in allowed scope: routes/, services/, config/, db/migrations/, prompts/, public/overlay/, scripts/)
- File purpose and what it exports
- Function signatures with input/output shape
- External dependencies and imports
- Key business rules (3–7 bullet points)

**Do:** Use builder for any new file in allowed paths.
**Do:** Verify the output by checking the committed file line count (should match spec complexity).
**Do:** Verify `node --check` on all committed JS files.

### Documentation in Allowed Paths

The builder can update `prompts/*.md` files reliably. If documentation must live in `docs/`, it must be written directly (GAP-FILL — docs/ is outside builder safe-scope).

---

## 2. Confirmed Failure: Surgical Edits to Large Existing JS Files

### What Happens

When the builder is asked to make targeted additions (e.g., "add 3 new parameters to this function") to a JS file that is >150 lines, it generates a stub file containing only ~30 lines of placeholder code. The file content is completely wrong — not a partial edit, but a replacement with non-functional stub code.

### Evidence (2026-05-25)

Builder was called for 3 files with task: "add `sessionId`/`cycleId` parameter propagation." All 3 returned `ok:true, committed:true`. All 3 produced stubs:

| File | Original Lines | Builder Output Lines | Status |
|---|---|---|---|
| `services/self-repair-executor.js` | 534 | 34 | ❌ STUB — reverted |
| `services/self-repair-deploy-scheduler.js` | 196 | 25 | ❌ STUB — reverted |
| `services/autonomous-telemetry-session.js` | 281 | 75 | ❌ STUB — reverted |

All 3 commits were reverted (commits f85264b, 7da86e5, d7f5fba). GitHub restored to clean state via revert commit d7def10e.

### Prior Incidents

This failure mode was documented in AMENDMENT_12 receipts across multiple prior sessions:
- `builder produced CJS require() syntax + truncated on retry`
- `builder output truncated`
- `GAP-FILL: builder returns garbage for multi-file coordinated slice`
- `GAP-FILL: builder returned JS function stubs not full HTML`
- `builder committed:true but output was garbage`

---

## 3. Safe Scope Policy

The builder enforces an explicit allowlist of writable paths. This is defined in `config/builder-safe-scope.js`.

### Allowed paths (builder CAN write):
```
routes/
services/
config/
db/migrations/
prompts/
public/overlay/
scripts/
```

### Blocked paths (builder CANNOT write):
```
server.js
startup/
middleware/
core/
.env
.github/
CLAUDE.md
docs/constitution/NORTH_STAR_SSOT.md
docs/SSOT_COMPANION.md
```

**Note:** `docs/` (excluding SSOT documents) is not in the blocked list but is also not in the allowed list. The builder will reject attempts to write to `docs/` with error `"Target file is outside the Builder safe-scope policy"`. All docs in `docs/` require GAP-FILL direct authoring.

---

## 4. Mitigations for Large-File Edits

When a surgical edit is needed on a large existing file and the builder cannot be used safely, apply one of these mitigations:

### Mitigation 1 — Extract to New Helper File

**When:** The change adds new logic that can be self-contained.
**How:** Create a new file (`services/my-feature-guard.js`) with the new logic. Import it from the large file with a 2-line addition (`import { x } from './my-feature-guard.js'` + call `x()` at the right spot).
**Builder risk for new file:** LOW. **Builder risk for 2-line edit:** MEDIUM (may still stub if file is large).
**Fallback:** GAP-FILL for the 2-line import addition.

### Mitigation 2 — Wrapper Function

**When:** The change adds parameters to an existing exported function.
**How:** Create a new exported function in a new file that wraps the existing function and adds the new parameters. Update callers to use the wrapper.
**Builder risk:** LOW for new wrapper file.

### Mitigation 3 — Exact Diff Patch (Direct Edit)

**When:** No other mitigation applies and the change is ≤20 lines.
**How:** Read the full file first. Make the exact targeted edit with the Edit tool. Document the change as GAP-FILL in the amendment receipt with: exact file, exact lines changed, why builder could not be used.
**Pre-commit:** `node --check <file>` must pass.

### Mitigation 4 — Split-Phase Approach

**When:** A capability requires changes across multiple large files.
**How:** Never do all files at once. Phase A changes file 1. Phase B changes file 2. Each phase is independently verified before the next.

---

## 5. How to Detect Stub Output

The builder stub failure is detectable before trusting the committed file. After any builder commit:

```bash
# Check that committed file is not a stub
git show HEAD:<target_file> | wc -l
```

If line count is less than 100 for a file that was previously >150 lines — this is a stub. **Do not deploy. Revert immediately.**

Revert procedure:
```bash
git revert HEAD --no-commit  # stage the revert
# add receipt to AMENDMENT_12 Change Receipts
git commit -m "revert: builder stub for <file> — <reason>"
git push origin main
```

---

## 6. Builder Preflight (Always Run Before Any Build Call)

```bash
npm run builder:preflight
```

Exit 0 = builder reachable, key aligned, GitHub token present, council live.
Exit 1 = builder unreachable — HALT product hand-authoring until fixed.
Exit 2 = key mismatch — set local COMMAND_CENTER_KEY to match Railway value.

After every successful builder commit, verify:
1. `git log --oneline -1` shows expected commit message
2. `git show HEAD:<target_file> | wc -l` matches expected size
3. `node --check <target_file>` passes

---

## 7. Builder Capability Decision Tree

```
Need to write or change a file?
├── Is it a NEW file in routes/, services/, config/, db/migrations/, prompts/, scripts/?
│   └── YES → Use builder. Verify line count after commit.
├── Is it a file in docs/, startup/, middleware/, core/, server.js?
│   └── YES → Builder CANNOT write here. Direct edit required. Document as GAP-FILL.
├── Is it an EXISTING file > 150 lines with a surgical change (< 20 lines changed)?
│   ├── Can change be extracted into a new helper file? → Create new file via builder + 2-line import (GAP-FILL if needed)
│   ├── Can change be a wrapper function in a new file? → Create wrapper via builder
│   └── Must edit large file directly? → Direct edit (Edit tool). GAP-FILL receipt required.
├── Is it an EXISTING file 50–150 lines?
│   └── Try builder. Verify immediately. Revert and GAP-FILL if stub detected.
└── Is it a complete rewrite of an existing file?
    └── HIGH RISK — builder may truncate. Prefer: write to temp file → verify → replace.
```

---

## 8. GAP-FILL Documentation Standard

Every direct file edit that bypasses the builder must document:

```
GAP-FILL: <what was tried with builder> — <exact HTTP status or error> — <why no other builder path existed>
```

Examples of acceptable GAP-FILL claims:
- `GAP-FILL: builder safe-scope blocks docs/ directory — docs/architecture/ not in SAFE_WRITE_PATHS`
- `GAP-FILL: builder POST /build returned ok:true committed:true but output was 34-line stub vs 534-line original — reverted commit f85264b`
- `GAP-FILL: startup/register-schedulers.js in BLOCKED_WRITE_PATHS; direct edit required for scheduler registration`

Examples of **unacceptable** GAP-FILL claims (too vague):
- `GAP-FILL: builder doesn't work`
- `GAP-FILL: multi-file slice`
- `GAP-FILL: builder not used`

---

## Change Receipts

| Date | What | Why |
|---|---|---|
| 2026-05-25 | File created | Documented confirmed builder stub failure on 3 large JS files (self-repair-executor.js 534→34 lines, self-repair-deploy-scheduler.js 196→25 lines, autonomous-telemetry-session.js 281→75 lines). All reverted. Registry establishes limits + mitigations for all future build sessions. |
