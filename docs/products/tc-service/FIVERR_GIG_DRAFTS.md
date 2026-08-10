<!-- SYNOPSIS: Draft Fiverr gig listings for the lifeosautomate account -- for founder review before publishing, not auto-published. -->

# Fiverr Gig Drafts — `lifeosautomate`

**Status:** DRAFT ONLY. Nothing here is published or committed to a client.
Publishing a gig is a real business/pricing decision (Adam reviews and
approves before anything goes live). Written from capabilities actually
built and proven tonight (2026-08-10), not aspirational marketing.

**New-seller pricing note:** a zero-review account converts better priced
conservatively at first (undercut established sellers, build 5-star reviews
fast, raise prices after ~10 real completed orders). Prices below reflect
that, not the real value of the work.

---

## Gig 1 — Browser task automation (I'll automate any repetitive web task)

**Category:** Programming & Tech → Scripting & Automation

**Title:** I will automate any repetitive browser or web task with a custom script

**Description:**
> I build custom automation for repetitive browser/web tasks — form filling,
> data entry, account setup flows, scraping public data, monitoring a page
> for changes and alerting you, or chaining multiple sites together into
> one workflow. Built on a real, working automation engine (not a template)
> that observes the actual page state and adapts, rather than a brittle
> fixed-click script that breaks the moment a site changes its layout.
>
> Tell me the task in plain language and I'll tell you honestly whether
> it's automatable before you pay for anything.

**What's real evidence for this claim:** the drive-channel/browser-agent
system built and proven tonight — real account signups completed
end-to-end (Fiverr itself), real email composed and sent via a driven
Gmail session, a self-correcting stuck-detection system that hands off to
a human only when a task genuinely needs one (a verification code, a
CAPTCHA) instead of failing silently.

**Suggested pricing (3 tiers):**
- Basic — $15: a single-page task (e.g. one form, one repeated action), delivered in 2 days
- Standard — $40: a multi-step flow (e.g. signup + profile setup), delivered in 3 days
- Premium — $90: a recurring/monitoring task or multi-site workflow, delivered in 5 days

---

## Gig 2 — Custom API / backend integration (Node.js/Express)

**Category:** Programming & Tech → Backend Development

**Title:** I will build a custom Node.js/Express API or integrate two services together

**Description:**
> I build small, focused backend services — a REST API for your app, a
> webhook that connects two tools you already use, a data-sync job between
> two systems that don't talk to each other natively. Real production
> patterns: proper error handling, no silent failures, tested against the
> real APIs before I call it done (not just "looks right in a mock").

**What's real evidence for this claim:** tonight alone included wiring a
real Postmark→SMTP email fallback with proper timeout handling after a
live failure, a self-bootstrapping database-backed command queue with
atomic claim semantics (no race conditions under concurrent access,
verified with a real test), and reusing an existing binary-safe GitHub
commit API correctly for image uploads.

**Suggested pricing (3 tiers):**
- Basic — $25: a single endpoint or webhook, delivered in 2 days
- Standard — $75: a small API (3-5 endpoints) or a two-service integration, delivered in 4 days
- Premium — $150: a more involved integration with its own data storage, delivered in 7 days

---

## Gig 3 — Android app feature (Capacitor / native plugin)

**Category:** Programming & Tech → Mobile App Development

**Title:** I will add a native Android feature to your Capacitor/hybrid app

**Description:**
> If your app is built on Capacitor (or a similar hybrid framework) and
> needs a real native capability the web layer can't reach — camera/gallery
> access, biometric login, a background service, accessibility-based
> automation — I build it as a proper native plugin, not a hacky WebView
> workaround.

**What's real evidence for this claim:** built and shipped tonight, each
independently CI-compiled against a real Android SDK: a MediaStore-based
photo-gallery plugin, a BiometricPrompt-based fingerprint/PIN gate, and a
foreground background-service plugin that polls a remote queue
independent of the app's UI being open.

**Suggested pricing (3 tiers):**
- Basic — $30: a small, well-scoped native plugin method, delivered in 3 days
- Standard — $80: a full native capability (e.g. a permission-gated feature end to end), delivered in 5 days
- Premium — $180: multiple integrated native features, delivered in 10 days

---

## Before publishing any of these (founder checklist)

- [ ] Confirm pricing feels right for real Adam-hours, not just competitive
- [ ] Confirm delivery-time estimates are realistic given everything else on the plate
- [ ] Add or edit a short intro video / profile photo if desired (Fiverr conversion improves a lot with these — optional, not required to publish)
- [ ] Only publish the gigs you're actually comfortable taking real orders for right now
