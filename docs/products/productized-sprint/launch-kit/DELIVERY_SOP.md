<!-- SYNOPSIS: Delivery runbook — produce a content pack via the live MarketingOS engine -->

# Delivery SOP — Founder Voice Content Pack

This is the exact, repeatable process to deliver a paid pack using the **live** MarketingOS engine.
No new code. The loop below is the same one SENTRY Layer A/B verified on production (2026-07-10).

## Prereqs (KNOW)

- Live base URL: `https://lumin-web-production-e3a9.up.railway.app`
  (⚠️ the shell env `PUBLIC_BASE_URL` is stale — `robust-magic-production…` returns "Application not
  found". Use the lumin-web URL above until that env is fixed.)
- `COMMAND_CENTER_KEY` present in the shell env (used as `x-command-key`).
- Node 20+ (global `fetch`).

## The loop (what the engine does)

```
POST /api/v1/marketing/consent            → consent_record_id   (consent-first, required)
POST /api/v1/marketing/sessions           → session_id          (needs consent_record_id + owner_id)
POST /api/v1/marketing/sessions/:id/coach → AI coach turn(s)    (feed the founder's story/answers)
POST /api/v1/marketing/sessions/:id/extract → hooks/stories/objections/offer/CTA
POST /api/v1/marketing/sessions/:id/generate → draft content pieces (Instagram/LinkedIn/X/FB)
PATCH /api/v1/marketing/content/:id       → approve the good pieces (status: approved)
GET  /api/v1/marketing/sessions/:id/export?owner_id=… → downloadable pack (approved pieces only)
```

## Option A — one command (recommended)

Use the delivery helper (allowed hand-written script, `scripts/`):

```bash
# from repo root
node scripts/deliver-content-pack.mjs \
  --owner "client-slug" \
  --brief path/to/brief.json \
  --out ./deliveries/client-slug
```

`brief.json` is built from the intake answers (see `INTAKE.md`). Example:

```json
{
  "name_business": "Jane Doe — Vegas Realtor",
  "one_liner": "I help Vegas families relocate with a calm, honest process.",
  "ideal_customer": "Out-of-state families moving to Henderson for schools",
  "questions_objections": "Is now a good time to buy? Can I trust an agent? What about rates?",
  "platforms": ["instagram", "linkedin"],
  "tone": "warm, direct, no-BS · @thebrokebrokeragent",
  "story": "Optional: paste the transcript of their voice note here for richer output."
}
```

The script runs consent→session→coach→extract→generate, **dedupes** the drafts, lets you approve (all
or a subset via `--pick`), then exports the pack to `--out`. It prints the session id and saves the
raw export + `drafts.json`.

### Building a FULL (~30 unique) pack

KNOW (verified live, see `FINDINGS.md` F1): one session on one story yields only ~3 unique posts. To
build a Full Pack, run the script **once per theme** and combine the exports:

```bash
for t in "buying-vs-renting" "school-districts" "interest-rates" "first-time-buyers" "relocation-story" "market-myth"; do
  node scripts/deliver-content-pack.mjs --owner client-slug \
    --message "$(cat themes/$t.txt)" \
    --out ./deliveries/client-slug/$t
done
```

Each `themes/*.txt` is a distinct 2–4 sentence story/angle in the founder's voice (pull these from the
intake + voice note). Then concatenate the `content-pack-*.txt` files and dedupe. ~6 themes × ~3
unique ≈ ~18–24 unique posts; add a couple hand-tweaks to reach 30. Do NOT try to squeeze 30 unique
posts out of a single one-story call.

## Option B — live coaching session (higher quality)

1. Host a 20–30 min Zoom/phone call. Ask the intake questions + dig for **one specific client story**.
   Use the MarketingOS coaching prompts (the coach flags "that was the hook").
2. Feed the founder's answers as `coach` turns (the script accepts multiple `--message` turns, or edit
   `brief.story`). More real detail = more authentic output.
3. Review drafts, approve the strongest 15–30, export.

## Curate before you send (do the human part)

The engine drafts; **you approve**. Per MarketingOS Principle #1 (authenticity), reject anything that
sounds like default-AI. Approve pieces that clearly came from the founder's own words. This 15–30 min
of judgment is the value the client pays for.

## Package & deliver

1. Take the exported `.txt` pack. Optionally paste into a clean Google Doc / Notion with:
   - a 30-day calendar layout (one post/day), and
   - a 1-paragraph "how to use this" note.
2. Send via the delivery email in `OUTREACH_TEMPLATES.md`. Ask for a testimonial + a referral.

## Honesty / limits (say this to the client if asked)

- KNOW: We generate + curate + deliver a content pack. **We do not auto-post** to your accounts and we
  **do not track analytics** yet — you (or your VA) paste the posts. Auto-posting + analytics are on the
  roadmap (platform build). Setting that expectation up front avoids a bad surprise.
- Audio upload inside the app is currently blocked (`STORAGE_R2_UNVERIFIED`); use a live call or paste
  the transcript of a voice note as text. Text path is fully live.
