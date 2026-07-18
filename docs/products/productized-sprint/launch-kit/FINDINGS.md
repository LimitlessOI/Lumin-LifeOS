<!-- SYNOPSIS: Live delivery findings + solution-mandatory fixes for the MarketingOS generate path -->

# Delivery Findings (live, 2026-07-10)

Recorded from a real end-to-end run of `scripts/deliver-content-pack.mjs` against production
(`https://lumin-web-production-e3a9.up.railway.app`). Labeled KNOW/THINK. Every finding carries a
`proposed_solution` per SO-002 (solution-mandatory). These fixes are **platform builds** — they go
through the governed factory + SENTRY, NOT hand-authored.

## F1 — One `generate` call yields few UNIQUE posts (duplication) — HIGH

- **KNOW:** A single session with one story produced **15 draft pieces but only 3 unique** (1 per
  platform, all on the same theme), i.e. the same 3 posts repeated 5×. Verified via `drafts.json`.
- **KNOW (root cause):** `routes/marketing-session-routes.js` `POST /sessions/:id/generate` loops
  `for (const extraction of extractions)` and inserts exactly **one piece per extraction** with no
  platform fan-out and no dedupe. Near-identical extractions → near-identical pieces.
- **Impact on offer:** The "30 posts" Full Pack is NOT met by one run. Honest per-session yield is a
  handful of unique angles.
- **proposed_solution (factory build, `routes/marketing-session-routes.js` generate handler):**
  1. Fan each extraction out across the requested platforms (`instagram|linkedin|x|facebook`) with
     platform-specific prompts (length/format/CTA differ per platform).
  2. Add an anti-duplication directive to the generation prompt: pass the already-generated hooks and
     instruct "produce content distinct from these."
  3. Dedupe by normalized `content_text` hash before `INSERT INTO marketing_content_pieces`.
  4. Accept a `count`/`platforms` param so a run can target N unique pieces.
  - Interim (service): the delivery script dedupes and the SOP runs multiple themed sessions to reach
    a fuller pack.

## F2 — Extraction diversity depends on transcript richness — MEDIUM

- **THINK:** With one short story, `extract` returned repetitive extractions, which fed F1. Richer,
  multi-story transcripts should yield more distinct extractions.
- **proposed_solution:** Coaching flow should require ≥3 distinct stories/themes before `extract`
  (enforce in `services/marketing-coach.js` / the session UI), and `extract` should de-duplicate
  extractions by `raw_text` similarity.

## F3 — Stale `PUBLIC_BASE_URL` breaks scripts — MEDIUM (env, not code)

- **KNOW:** Shell `PUBLIC_BASE_URL=https://robust-magic-production.up.railway.app` returns
  "Application not found"; live app is `https://lumin-web-production-e3a9.up.railway.app`. `builder:preflight`
  and SENTRY scripts that read `PUBLIC_BASE_URL` fail on this.
- **proposed_solution:** Set `PUBLIC_BASE_URL` to the lumin-web URL in Railway/shell env
  (`POST /api/v1/railway/env/bulk` per the SELF-EXECUTION rule, founder-approved). The delivery script
  already guards against the stale value.

## F4 — Audio intake blocked — KNOWN

- **KNOW:** `STORAGE_R2_UNVERIFIED` — audio upload path excluded until `STORAGE_*` set on Railway.
- **proposed_solution:** Provision Cloudflare R2 bucket + set `STORAGE_PROVIDER=r2`, `STORAGE_ENDPOINT`,
  `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL`. Until
  then, deliver via live call or pasted transcript (text path is fully live).

---

These findings are the self-fix fuel for the queued platform build (see the MarketingOS mission specs
authored alongside this kit). Do not hand-patch the generate route; queue F1/F2 to the factory.
