# Inner supervisor — self-audit protocol (builder trains its own reviewer)

**SSOT lane:** LifeOS Core — `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`  
**Use with:** `POST /api/v1/lifeos/builder/task` + `mode: "review"` and `files[]` containing the artifact under review plus this file; or **`npm run lifeos:builder:inner-review`** (wraps the same HTTP path).

**Purpose:** Move supervision *into* the builder stack: every serious slice can be gated by an explicit **think** pass (cheap review model via `council.builder.review`) before or after codegen, without inventing APIs or pretending a human graded it.

---

## What “inner supervisor” means here

Not a separate product — a **repeatable critique pass** bundled with TSOS rules:

1. **Ground truth** — Injected `files[]` bodies override naive task wording (same as epistemic laws on `/task`).
2. **Drift detector** — Call out divergence from SSOT / domain prompts / amendments when those are in context.
3. **Honest gates** — If the implementation cannot satisfy the spec without guessing, flag **confidence** low in `---METADATA---` JSON and name what is missing.

---

## When to run (efficiency — do not waste tokens)

| Situation | Run inner review? |
|-----------|---------------------|
| Large `/build` to `routes/`, `services/`, overlays | **Yes** — one review pass |
| Tiny config / one-line SSOT typo | Optional |
| `execution_only` codegen after frozen plan | **Yes** once on the emitted file |

**Two-call discipline (stretch tokens):** `mode: plan` → tighten spec → `mode: code` + `execution_only: true` → **inner review** on result only when files are new or risky.

---

## Review output contract (`mode: review`)

The reviewer MUST:

1. List **FINDINGS** (bugs, edge cases, drift, security/safety).
2. List **PASS** bullets for things that are explicitly OK with evidence from files.
3. State **RECOMMENDATION**: `approve` | `revise` | `blocked` | `needs_human`.
4. End with ---METADATA--- and JSON:

```json
{
  "target_file": null,
  "insert_after_line": null,
  "confidence": 0.85,
  "recommendation": "revise",
  "risk_notes": ["short bullet if any"]
}
```

Do not fabricate CI or Railway results; if unsure, lower confidence and say **UNKNOWN**.

---

## Relationship to Conductor / human supervisor

This protocol **reduces** how often Adam must adjudicate commits: the system produces a structured review artifact. Humans (or gates) remain sovereign for risky paths — see gate-change presets and **`docs/TSOS_SYSTEM_LANGUAGE.md`** for machine-visible receipts.
