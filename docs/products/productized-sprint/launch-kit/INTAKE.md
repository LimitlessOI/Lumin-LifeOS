<!-- SYNOPSIS: Intake brief — questions + hosting options for the Content Pack service -->

# Intake Form — Founder Voice Content Pack

The intake collects everything needed to run one MarketingOS coaching session and generate the pack.
Keep it short (Productized Sprint rule: 5-question brief). Longer forms kill conversion.

## Hosting options (pick one — fastest first)

1. **Tally.so** (recommended) — free, no code, custom redirect, email notifications. ~10 min.
2. **Google Forms** — free, responses to a sheet + email. ~10 min.
3. **Host `intake-form.html`** (in this folder) on Netlify Drop / Carrd / any static host, and point
   its `action` at a Formspree/Basin endpoint or `mailto:`. Use this if you want it on your own domain.

> Do NOT mount a new intake route in the app for this. That is a `routes/` change → governed factory
> + SENTRY (SO-001/SO-002). External form is the compliant, faster path.

## The 6 intake questions

1. **Your name + business** (and the social handle/link you post to).
2. **What do you do, in one sentence?** ("I help ___ do ___ so they can ___.")
3. **Who is your ideal customer?** (be specific — one person, not "everyone").
4. **What are the 3 questions customers always ask you?** (or the 3 objections you hear).
5. **What platforms do you want content for?** (Instagram / LinkedIn / X / Facebook — pick up to 2).
6. **Tone:** pick 2–3 words (e.g. warm, direct, funny, expert, no-BS) + one account whose vibe you like.

Optional 7th: **Upload a 2–5 min voice note** answering "tell me a story about a client you helped."
(This becomes the raw material — richer than typed answers. If they can't, you'll run a live session.)

## What happens with the answers

The intake answers map directly to the delivery run:

| Intake field | Used as |
|---|---|
| Q2/Q3/Q4 + voice note | The coaching message(s) → `POST /sessions/:id/coach` |
| Q5 platforms | Which pieces to keep/approve |
| Q6 tone + handle | Channel profile / brand voice context |

See `DELIVERY_SOP.md` for the exact run. `scripts/deliver-content-pack.mjs` accepts these as input.

## Notifications

Turn on **email on new response** (Tally/Google Forms both support this). That email is your trigger
to run delivery. Reply within 24h with "got it — your pack lands in 3–5 days."
