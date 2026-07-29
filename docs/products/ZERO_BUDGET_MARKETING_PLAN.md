<!-- SYNOPSIS: Zero-budget, limited-email marketing plan for launching products once market ready. -->
<!-- @ssot docs/products/INDEX.md -->

# Zero-Budget Marketing Plan

**Constraints:** no paid ads, no paid influencer deals, no email blast tools, and very few direct emails.  
**Goal:** get the first 10–100 paying customers for SocialMediaOS, then Site Builder, then LifeOS premium, using only organic reach, founder network, and product-led loops.

---

## Strategy summary

1. **Lead with the product that is already 90% ready** — SocialMediaOS pack sales.
2. **Turn every customer into a case study and a distribution channel** — "I made this with SMOS".
3. **Use Adam's existing content, network, and real-estate/creator communities** instead of cold lists.
4. **Build in public** so prospects see the product improve in real time.
5. **Drive traffic to a single, simple call-to-action**: `/marketing` → start session → buy $49 pack.

---

## 1. SocialMediaOS launch — first 30 days

### A. Product-led viral loop (free marketing)
- **Public "made with SMOS" badge** — every exported piece gets an optional watermark/link back to `/marketing`.
- **One free teardown per creator** — Adam (or the system) DMs a creator: "I turned your last 3 posts into a 7-day content pack. Here's the first piece free. Want the rest? $49."
- **Share-before-you-buy** — the pack preview page shows 3 pieces unlocked and a locked "full pack" CTA; no email required to preview.
- **Referral credit** — "Give a friend 20% off, get 20% off your next pack." Tracked by `handle` or `ref` code.

### B. Platform-native outreach (no cold email blast)
- **Instagram / TikTok / X DMs** — target micro-creators (1k–50k followers) in real estate, coaching, fitness, and local business niches.
- **Voice note + Loom** — send a 30-second personalized video showing a content piece made from their profile, not a text pitch.
- **Comment-to-DM** — leave thoughtful comments on creator posts, then DM the free teardown.
- **LinkedIn voice messages** — for B2B / real estate agents; same personalized approach.

### C. Founder network and communities
- **Real estate agent groups** — Adam's existing network; offer a free "30-day listing content pack" in exchange for a case study.
- **GoVegas network** — local business owners need content; offer a free pack, then $49 follow-up.
- **Lumin University / coaching circles** — early students are ideal SMOS users.

### D. Content engine
- **Daily "before/after" posts** — show raw transcript/idea on the left, SMOS-generated posts on the right.
- **"Content pack in 60 seconds" videos** — screen recording of the SMOS flow.
- **Creator spotlight** — interview paying customers, repost their SMOS content.
- **Niche teardown threads** — "I analyzed the top 10 real estate creator accounts; here's what they do right and wrong."

---

## 2. Site Builder launch — second product

### A. Use SMOS customers as prospects
- **SMOS customers need websites** — add an upsell chip in SMOS dashboard: "Want a landing page for this content? $99 Site Builder preview."
- **Case study funnel** — every public preview site is a live demo; share them as "we built this in 10 minutes" posts.

### B. Local business community
- **Chamber of Commerce / BNI** — free 5-minute site audit, paid $99 preview.
- **Agent meetups** — same offer, focused on single-property listing microsites.

### C. SEO long game
- **Rank for "AI website for [niche]"** — use the public preview directory (if indexed) as a content moat.
- **Comparison landing pages** — "AI site builder vs Wix for real estate agents."

---

## 3. LifeOS / LifeRE paid tiers — third

### A. Convert engaged founder-UI users
- **Usage-triggered offer** — after 7 days of active commitments/check-ins, show "Upgrade to Pro for $9/mo".
- **Result-based pitch** — "You hit 12 of 14 commitments this month. Pro unlocks full analytics and coaching."

### B. Niche communities
- **r/realestate, r/productivity, r/getdisciplined** — answer questions, share wins, offer free trial.
- **LifeRE for agents** — partner with brokerages for a 30-day team pilot.

---

## 4. Limited-email rules

- **No bulk cold email lists.**
- **No newsletter tool until 100+ opted-in subscribers.**
- **Use email only for:** password reset, purchase receipt, pack delivery, and 1:1 founder follow-ups.
- **Transactional email provider** (Resend/SES) handles resets and receipts.
- **Personal Gmail/Outlook** for the first 50 founder-initiated outreach messages, manually tracked in a simple sheet.

---

## 5. Metrics and weekly rhythm

### Track
- `/marketing` landing unique visitors (Plausible or Railway logs)
- Session starts → consent → pack generate → checkout click → payment completion
- Cost to acquire one $49 customer (should be $0 in this phase)
- Creator DM response rate and close rate
- SMOS-made content shares (watermark clicks)

### Weekly cadence
- **Monday:** pick 20 creators to research and personalize.
- **Tuesday–Wednesday:** send 10–15 voice/Loom DMs.
- **Thursday:** post 3 before/after content pieces from SMOS itself.
- **Friday:** review metrics, kill worst channel, double down on best.

---

## 6. 90-day milestone plan

| Week | Goal | Channel |
|---|---|---|
| 1–2 | First 5 paid SMOS packs | Founder DMs + free teardowns |
| 3–4 | 20 paid packs + 2 case studies | SMOS watermark shares + creator spotlights |
| 5–8 | 50 paid packs + first Site Builder upsell | SMOS dashboard upsell + local business groups |
| 9–12 | 100 paid packs + 5 Site Builder sales + 10 LifeOS Pro trials | Referral loop + SEO content + community answers |

---

## 7. Creative engine connection

The marketing plan must feed the product, not just promote it:
- **Competitor teardowns** go into `competitor_intelligence` memory for the creative engine.
- **Creator DM responses** become training data for personalization prompts.
- **Successful pack hooks** are logged as `winning_patterns`.
- **Failed campaigns** are logged with `failure_reason` so the system stops repeating them.
- **Every post we make** is also a test of the creative engine; results improve the engine.

---

## Truth summary

- **KNOW:** SMOS is the first product to market because it has a live checkout and SENTRY pass.
- **KNOW:** No paid ads and no bulk email means distribution depends on Adam's network and personalized creator outreach.
- **THINK:** A "free teardown" offer will convert better than a generic sales pitch because it proves the product before asking for money.
- **GUESS:** The best first niche is real estate agents / small service businesses because Adam already has access and they have high lifetime value.
- **DON'T KNOW:** Which exact message or niche will convert until we send the first 20 personalized teardowns and measure replies.
