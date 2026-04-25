# TSOS system language — Conductor ↔ machinery channel

**Authority:** `docs/SSOT_NORTH_STAR.md` → **Article II §2.14**. This file is the **normative lexicon** (tokens, line grammar, templates). **Operational detail:** `docs/SSOT_COMPANION.md` → **§0.5H**.

**Purpose:** Messages on the **machine channel** must stay **receipt-parsable**, **auditable**, and **non-ambiguous**. CC (Command Center / governance authors) extends this file by **Article VII** constitutional path or Companion change-control — not ad-hoc synonyms in product copy.

---

## Dual channel (do not merge)

| Channel | Law | Audience |
|--------|-----|----------|
| **Human report** | North Star **§2.11b**; Companion **§0.5G** | Adam / operator — **plain language**, grades, evidence, residue risk |
| **Operator ask** | North Star **§2.15**; Companion **§0.5I** | Clear session instruction → **comply or HALT**; **no** silent substitute; **INTENT DRIFT** in **§2.11b** if deviated |
| **Machine channel** | North Star **§2.14**; this doc | Conductor ↔ **runtime** (builder HTTP, probes, redeploy/env scripts, `[TSOS-MACHINE]` logs) |

**Sheriff:** North Star **§2.13.2** — the Conductor **rejects** machine-channel artifacts that violate this doc (unmarked load-bearing claims, invented tokens, or casual English mixed into tagged machine lines). **Instruction drift** (§2.15) is a **§2.11b** / receipts problem, not a `[TSOS-MACHINE]` token.

---

## Scope — **must** use this language

Use **only** the vocabulary and line shapes below when you produce:

1. **First line** of **receipt-grade** CLI/script output for: `npm run builder:preflight`, `npm run system:railway:redeploy`, `npm run env:certify`, or any script explicitly documented as machine-channel.
2. **Summaries inside** `POST /api/v1/lifeos/builder/*` JSON fields (`task`, operator-facing `spec` one-liners) **when** the send is for **audited automation**, not creative product prose.
3. **Internal logs** explicitly prefixed **`[TSOS-MACHINE]`**.

## Scope — **must not** force this language

- **§2.11b** end-of-slice reports to Adam  
- Amendment markdown, user therapeutic copy, marketing, onboarding narratives  
- Council **debate prose** (still requires **KNOW / THINK / GUESS / DON’T KNOW** per §2.6 — but not the `[TSOS-MACHINE]` line format)

---

## Epistemic prefix (load-bearing claims)

The **first** token of a machine-channel line (after `[TSOS-MACHINE]` if present) **shall** be one of:

| Token | Meaning |
|-------|--------|
| `KNOW:` | Verified this session (HTTP status, verifier exit 0, file read on disk). |
| `THINK:` | Inference; **one** short rationale in the same line or the next. |
| `GUESS:` | Low confidence; line **must** include `NEXT=` pointing to a verify step. |
| `DONT_KNOW:` | Explicit unknown; line **must** include `NEXT=` (question or probe). |

---

## State tokens (closed set)

Use **only** these literals for `STATE=` (no natural-language synonyms in machine lines):

`HALT` · `PASS` · `FAIL` · `BLOCKED` · `PREFLIGHT_OK` · `PREFLIGHT_FAIL` · `RECEIPT` · `DEPLOY_DRIFT` · `AUTH_FAIL` · `GAP_FILL`

---

## Verb tokens (closed set)

Use **only** these for `VERB=`:

`BUILD` · `EXECUTE` · `PROBE` · `REVIEW` · `REDEPLOY` · `HALT_REQUEST`

---

## Canonical one-line format

```text
[TSOS-MACHINE] <EPISTEMIC> STATE=<STATE_TOKEN> VERB=<VERB_TOKEN> | <one short fact> | NEXT=<VERB_TOKEN or HALT_REQUEST or plain minimal action>
```

**Example (builder 404):**

```text
[TSOS-MACHINE] KNOW: STATE=FAIL VERB=PROBE | GET /api/v1/lifeos/builder/domains HTTP 404 | NEXT=REDEPLOY then PROBE
```

**Example (preflight pass):**

```text
[TSOS-MACHINE] KNOW: STATE=PREFLIGHT_OK VERB=PROBE | builder domains+ready OK | NEXT=BUILD
```

---

## Compact builder task prefix (optional first line of `task`)

When the Conductor sets a **`task`** string for `/builder/build`, the **first line** may be a single compact control line (no spaces inside angle segments):

```text
TSOS|VERB=BUILD|DOMAIN=<domain_key>|TARGET=<path>|INTENT=system-build|EP=KNOW
```

Second and following lines may be human-readable **spec** for the council **inside** the same `task` field only if the **first** line remains exactly in this form.

---

## Copy-paste templates

### A — Auth failure

```text
[TSOS-MACHINE] KNOW: STATE=AUTH_FAIL VERB=PROBE | x-command-key rejected | NEXT=HALT_REQUEST operator supplies key
```

### B — GAP_FILL required (platform broken)

```text
[TSOS-MACHINE] KNOW: STATE=BLOCKED VERB=PROBE | builder unreachable ECONNREFUSED | NEXT=GAP_FILL platform route or URL
```

### C — Receipt line after successful commit

```text
[TSOS-MACHINE] KNOW: STATE=PASS VERB=BUILD | POST /builder/build committed:true | NEXT=RECEIPT SSOT row
```

---

## CC / author checklist (structure for compliance)

- [ ] **Closed sets** above are exhaustive for **new** machine lines; new tokens require a **dated** row in **Lexicon changelog** below + North Star / Companion sync.
- [ ] **Scope split** is explicit in every upstream doc that mentions “TSOS language” (no conflation with §2.11b).
- [ ] **≥ 3** copy-paste templates ship with every revision (expand A–C rather than inventing informal examples in chat).
- [ ] **Sheriff rules** are testable: “missing `KNOW:` on a verifier claim,” “`STATE=` missing,” “synonym instead of token.”

---

## Lexicon changelog

| Date | Change |
|------|--------|
| 2026-04-22 | **§2.15** row in **Dual channel** (operator ask vs human report vs machine). |
| 2026-04-22 | Initial ratification: lexicon + templates + checklist; North Star **§2.14** + Companion **§0.5H**. |
