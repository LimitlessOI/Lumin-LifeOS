<!-- SYNOPSIS: Site Builder go-to-market plan — therapists & psychiatry, via MarketingOS. Cold, not warm-network. -->

# Site Builder GTM Plan — Therapists & Psychiatry (via MarketingOS)

**Author:** Devin (conductor) · **Date:** 2026-07-10 · **Status:** DRAFT for founder review
**Founder constraint (verbatim intent):** Do NOT peddle to friends / industry contacts in Las Vegas. Start with **therapists and psychiatry** (private-pay mental health). Acquisition is **cold, systematized through MarketingOS**, not warm referral.

---

## 0. Honest preconditions (KNOW / THINK)

Before any of this makes money, two P0 product blockers from the sellability audit must be closed. Every idea below is gated on them:

- **KNOW — Preview persistence is broken.** Preview sites live in the container filesystem (`public/previews`), no Railway volume. Every redeploy (368 commits in the last 24h) wipes them → emailed preview links and checkout 404. The "free preview site" hook — which most ideas below depend on — does not survive to the buyer today. **Fix in flight.**
- **KNOW — Async build hangs.** 4 prospects stuck `building` 2h+. No live preview currently exists to sell.
- **KNOW — `GOOGLE_PLACES_KEY` is ABSENT** in Railway (`docs/ENV_LIVE_INVENTORY.json`). Automated therapist discovery via Google Places is blocked until Adam adds it. Manual/Psychology-Today scrape is the fallback until then.
- **KNOW — Email infra is live**: `POSTMARK_SERVER_TOKEN`, `EMAIL_FROM`, `EMAIL_PROVIDER`, `SITE_BASE_URL`, Stripe keys all present.

**Compliance note for mental-health outreach:** therapists are HIPAA-covered and highly compliance-sensitive. Cold email must be CAN-SPAM clean (physical address, one-click unsubscribe, honest subject), must NOT imply we have any patient data, and must NOT fabricate reviews/testimonials. The system already fails closed on suppression + labels illustrative testimonials — keep that gate ON for this vertical.

---

## 1. Why therapists / psychiatry is the right first vertical

- **Private-pay, cash-based practices** (especially psychiatry, ketamine/TMS clinics, group practices, LCSW/LMFT solo) actively market for clients and can pay.
- Their existing websites are frequently **Psychology Today profiles + a weak Wix/Squarespace page** — high `opportunityScore`, exactly what Site Builder's scorer is built to find.
- **Booking/POS commission fit is strong**: Jane App is *the* dominant EHR/booking for therapy (~$50/referral) → recurring affiliate revenue layered on top of publish + care plan.
- Clear pain: **"clients can't find you / can't book you online"** — a concrete, non-generic hook the AI cold email can personalize from their real site.

**Ideal first buyer:** a **solo or 2–5 person private-pay therapy/psychiatry practice** with a Psychology-Today-only or dated website, no online booking, in a metro we can saturate (Las Vegas first, then expand). Owner-operator who answers their own email.

---

## 2. The MarketingOS-powered machine (what actually runs this)

The plan uses these existing system surfaces (not generic tactics):

| Capability | System surface | State |
|---|---|---|
| Discover therapist prospects | `services/go-vegas-outreach.js` (Google Places) + `scripts/site-builder-prospect-discovery.mjs` | Blocked on `GOOGLE_PLACES_KEY`; manual list works now |
| Score worst sites first | `services/site-builder-opportunity-scorer.js` (`/api/v1/sites/analyze`) | Live |
| Build free preview + scorecard | `services/site-builder.js`, `/api/v1/sites/prospect` | Live but P0 persistence bug |
| Cold email w/ preview link | `services/prospect-pipeline.js` + Postmark | Live (gated on preview persist) |
| Multi-touch follow-up | `scripts/site-builder-follow-up-cron.mjs` (day-3/day-7) | Live |
| Outreach campaigns (bulk, multi-channel) | `POST /api/v1/outreach/campaign` (`outreach-crm-routes.js`) | Live |
| Organic content (posts/hooks/scripts/ads/lead-magnet copy) | MarketingOS `services/socialmediaos-content-generator.js`, `marketing-content-engine.js` | Live (Phase 1) |
| View/reply tracking → warm-lead alerts | preview pixel + Postmark inbound webhook | Live |
| Pipeline analytics | `/api/v1/sites/dashboard`, `npm run site-builder:report` | Live |

**The core loop:** discover → score worst-first → auto-build a free preview + competitor scorecard → cold email the link personalized to their real pain → track opens/views → warm-lead alert → follow-up → $49 publish → $97/mo care plan → Jane App affiliate + à-la-carte upsells. MarketingOS supplies the *content* (email variants, social proof posts, ad copy, lead magnets) that feeds every channel.

---

## 3. Funnel math (bootstrap baseline assumptions)

Conservative planning numbers (THINK — to be replaced by real data after 100 sends):
- Cold email: 30–45% open, 1–3% positive reply, 0.5–1.5% → $49 publish.
- $49 publish → 25–40% attach $97/mo care plan.
- Publish buyer → 30–50% eventually set up Jane App (~$50 affiliate each).
- **Per 1,000 qualified therapist prospects:** best ~15 publishes + 5 care plans; worst ~5 publishes + 1 care plan.

---

## 4. The 25 marketing ideas (each with best / worst case)

Format: **Idea — what MarketingOS/system automates — Best case — Worst case.**

### A. Cold outbound (system's core strength)

**1. Free-preview cold email to Psychology Today therapists (flagship).**
System: scrape PT + practice site → build free preview + scorecard → personalized cold email with their live pain points → link.
- Best: 40% open, 2% book a call, first $49 publishes within week 1; becomes the primary revenue engine.
- Worst: preview links 404 (if P0 not fixed) or land in spam/compliance flags → 0 conversions, domain reputation damaged.

**2. "Your competitor's site vs yours" scorecard email.**
System: `competitor-benchmark.js` scores 3 local competitors 1–10 → head-to-head scorecard page → email.
- Best: high emotional trigger ("Dr. X ranks above you") drives 3–5% reply, strong close rate.
- Worst: comes off as insulting/aggressive to a caring-profession audience → unsubscribes, brand damage.

**3. LinkedIn DM outreach to practice owners.**
System: MarketingOS generates personalized DM openers from their profile; manual/assisted send.
- Best: therapists active on LinkedIn, 10–15% reply, high trust channel → warm calls.
- Worst: LinkedIn rate-limits/bans the account for automation → channel lost, wasted setup.

**4. Postmark bulk campaign to a purchased/compiled therapist list (CAN-SPAM compliant).**
System: `POST /api/v1/outreach/campaign` with templated + A/B subjects.
- Best: scale to 500/day, steady 1% conversion → predictable pipeline.
- Worst: list is stale/low-quality, high bounce → Postmark flags sender, deliverability tanks.

**5. Voicemail drop + SMS follow-up to practices with public numbers.**
System: Twilio (`TWILIO_*` present) drops a ringless VM + SMS after email view.
- Best: multi-touch lifts reply 2–3x; "saw you opened our site preview" feels personal.
- Worst: TCPA/consent violation risk for cold SMS to businesses → complaints, legal exposure.

**6. Handwritten-style direct mail with a QR to the live preview.**
System: MarketingOS writes the copy; print/mail via a print API (manual Phase 0).
- Best: physical novelty cuts through; 5–8% scan rate; premium feel matches the profession.
- Worst: high cost per piece ($1–3), slow, hard to attribute → negative ROI at small scale.

**7. "We already built it" re-engagement to non-openers.**
System: follow-up cron day-3/day-7 with new subject variant + urgency (preview expires in 30 days).
- Best: recovers 20–30% of non-openers into opens; cheap incremental conversions.
- Worst: repeated contact triggers spam complaints → suppression list grows, sender score drops.

### B. Local / vertical-specific

**8. Las Vegas therapy-practice saturation campaign.**
System: `go-vegas-outreach.js` discovers all LV mental-health practices → sequenced invites.
- Best: own the metro; word-of-mouth among a tight local professional community compounds.
- Worst: `GOOGLE_PLACES_KEY` absent → discovery blocked; manual list too small to matter.

**9. Partner with Jane App / SimplePractice as a "website partner."**
System: we're already an affiliate; MarketingOS drafts the partnership pitch.
- Best: they list us / co-market → warm inbound therapist leads at near-zero CAC.
- Worst: they ignore a tiny new partner; no traction; time sunk.

**10. Group-practice / multi-provider land-and-expand.**
System: build a preview for the practice + a mini bio page per provider (upsell).
- Best: one close = 5–10 provider pages + higher care-plan tier; big ACV.
- Worst: long committee sales cycle; decision stalls; cash-flow-negative wait.

**11. Ketamine/TMS/psychedelic-assisted clinics (high-margin cash niche).**
System: niche-tuned scorecard + compliance-safe copy.
- Best: these clinics spend heavily on marketing; $997+ closer tiers land; fast payback.
- Worst: heavy ad/medical-claim regulation; we must avoid claims → thin messaging, low differentiation.

**12. "Psychology Today is not enough" positioning campaign.**
System: MarketingOS lead magnet + email series on why a PT profile caps their growth.
- Best: names the exact pain; therapists self-identify; strong inbound opt-ins.
- Worst: PT is "good enough" in their mind → low perceived need, weak response.

### C. Content / organic (MarketingOS content engine)

**13. Founder-led LinkedIn content (Adam's real voice via SocialMediaOS coach).**
System: coaching session → content pack → daily posts on helping practices get found.
- Best: builds authority; inbound DMs from practice owners; compounding organic reach.
- Worst: slow ramp (months); no near-term revenue; attention cost.

**14. Short-form video: "I rebuilt this therapist's site in 2 minutes."**
System: MarketingOS scripts + b-roll list; screen-record the real build.
- Best: demo virality; proof-driven; drives preview requests at scale.
- Worst: video production overhead; flops in algorithm; time-negative.

**15. SEO comparison/landing pages ("best website builder for therapists").**
System: `marketing-content-engine.js` generates SEO pages; Site Builder hosts them.
- Best: durable organic inbound for high-intent search; compounds for years.
- Worst: SEO takes 6–12 months; competitive keyword; no short-term cash.

**16. Free lead magnet: "Therapist Website Scorecard" (self-serve).**
System: `/api/v1/sites/analyze` behind an email gate → instant grade + upsell.
- Best: viral self-serve tool; therapists share scores; huge top-of-funnel + emails.
- Worst: tire-kickers who never buy; server/AI cost per scan with low conversion.

**17. YouTube: "How therapists get more clients online" channel.**
System: MarketingOS YouTube outlines/titles/thumbnails (Phase 6).
- Best: evergreen authority; each video a lead source.
- Worst: Phase 6 not built; long horizon; high effort.

**18. Email newsletter for therapists (practice-growth tips).**
System: MarketingOS content calendar → weekly value email; soft Site Builder CTA.
- Best: nurtures the whole list; trust → conversions over time; low cost.
- Worst: low open rates; unsubscribes; slow to monetize.

### D. Paid / partnership / referral

**19. Meta/Google ads to a "free therapist website preview" landing page.**
System: MarketingOS ad copy + landing copy (Phase 8); Stripe checkout.
- Best: scalable, measurable CAC; pour money in once funnel converts.
- Worst: mental-health ad policy restrictions + high CPCs burn budget before product-market fit.

**20. Sponsor therapist podcasts / associations (state LCSW/APA chapters).**
System: MarketingOS drafts sponsorship + a co-branded offer.
- Best: trusted-channel endorsement → high-intent leads; credibility with a skeptical audience.
- Worst: sponsorship fees with weak tracking; hard to attribute ROI.

**21. Referral/affiliate program for therapists ("refer a colleague, both get a free month").**
System: track referrals in `prospect_sites`; MarketingOS referral copy.
- Best: professional networks refer within trust circles; low-CAC compounding growth.
- Worst: therapists protective of competitive advantage → few referrals.

**22. Reseller deal with therapy billing/EHR consultants & VAs.**
System: MarketingOS partner kit; they resell Site Builder to their client base.
- Best: each partner brings a book of practices; leveraged distribution.
- Worst: partners underdeliver; support burden; margin split hurts unit economics.

**23. Facebook-group value-drop (therapist entrepreneur / private-practice groups).**
System: MarketingOS posts + free scorecard offer where self-promo is allowed.
- Best: warm, high-intent communities; free-tool posts get strong engagement.
- Worst: banned for self-promo; moderators remove; account flagged.

### E. Product-led / trust

**24. Public "before/after" gallery of rebuilt therapist sites.**
System: auto-generate a showcase page from real (consented) builds.
- Best: undeniable social proof; shortens sales cycle; shareable.
- Worst: no consented real examples yet → thin/illustrative gallery reads as fake.

**25. "Publish free, pay only when you love it" risk-reversal offer.**
System: build + host preview free; charge $49 only at publish (already the model).
- Best: removes all buyer risk; maximizes top-of-funnel and trust for a cautious audience.
- Worst: heavy free-build AI/hosting cost with low publish conversion → cost sink until funnel tightens.

---

## 5. Recommended sequencing (what to actually turn on, in order)

1. **Close P0s** (preview persistence + build-hang) — nothing ships until a preview survives a redeploy.
2. **Ideas 1, 2, 7, 16, 25** — the free-preview cold email loop + self-serve scorecard lead magnet. This is the system's core competency and cheapest to run.
3. **Ideas 4, 5** — scale outbound (email bulk + Twilio multi-touch) once idea 1 shows a real conversion.
4. **Ideas 9, 21, 22** — partnerships/referral for low-CAC compounding once we have proof + testimonials.
5. **Ideas 13–19** — organic + paid for durable pipeline, after unit economics are proven.

**First 30-day target (bootstrap):** 300 qualified therapist prospects contacted, ≥1 paid $49 publish + ≥1 $97/mo care plan = first real revenue receipt, first consented before/after for the gallery.

---

## 6. What the system can automate right now vs. needs a human

- **Automatable now:** scoring, preview build, cold email + A/B subjects, follow-up cron, view/reply tracking, warm-lead alerts, all content generation (email/social/ads/lead-magnet copy), pipeline reporting.
- **Needs founder/human:** `GOOGLE_PLACES_KEY` (discovery), the actual sales call/close, partnership outreach sign-off, compliance sign-off on mental-health copy, and the P0 code fixes (in flight through the governed build system).
