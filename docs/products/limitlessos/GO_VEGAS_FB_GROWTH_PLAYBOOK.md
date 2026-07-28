<!-- SYNOPSIS: How to revive Go Vegas FB group so Meta recommends it — signals, contest rules, daily ops -->

# Go Vegas Facebook Growth Playbook

**Group:** https://www.facebook.com/groups/govegas (~16k, long idle)  
**Goal:** Meta recommends this group again — activity chip **31+**, conversations in feed, member invites compounding.  
**Machine SSOT:** `config/go-vegas-network-playbook.js`  
**Last Updated:** 2026-07-23

Label uncertainty: **KNOW** = Meta Transparency / stated product behavior. **THINK** = strong industry consensus. **GUESS** = unproven tactic.

---

## Contest scoring (best post → free website)

**Comments win.** That’s what Meta optimizes for (“meaningful social interactions”), not vanity likes.

| Signal | Points | Why |
|--------|-------:|-----|
| Comment (incl. replies in thread) | **5** | KNOW/THINK: comment predictions are first-class in group feed ranking |
| Share | **3** | THINK: distribution beyond current members |
| Reaction (like/love/etc.) | **1** | Passiveive / weaker MSI |

**Public rule (paste in announce):**  
Score = `(comments × 5) + (reactions × 1) + (shares × 3)`. Tie → most comments. Window = calendar day Pacific. Winner next morning.

Do **not** say “like and comment for a chance to win” as engagement bait — Meta demotes that. Frame as transparent judging for a real prize.

---

## What Meta actually needs (deep dive)

### 1) Eligibility & volume — KNOW
From [Meta Transparency — Individual Group Feed](https://transparency.meta.com/features/explaining-ranking/fb-individual-group-feed/):

- Group must meet **integrity** criteria.
- Group must have had **at least 20 posts in the past day** to be eligible for ranked Individual Group Feed (enough inventory to rank).

**Our floor: 31+ owned posts/day** (founder) — clears Meta’s 20 and targets the **31+** activity chip members see when a group is recommended. Idle “10+” looked dead; 31+ looks alive.

Also aim **~20 member posts/day** (contests, rec-asks, card days) so it’s not 100% staff.

### 2) Conversation > broadcast — KNOW / THINK
Meta ranks by predicting: will you **comment**, **react**, **engage meaningfully**, dwell.

- A post with **40 comments** beats **200 likes + silence** (THINK — repeated across 2025–26 practitioner + Meta MSI doctrine).
- **Back-and-forth** (comment → reply → reply) is the strongest pattern.
- **First ~60 minutes** after post: reply to every early comment (THINK). Admin reply = notification loop = more comments = more distribution.

### 3) Formats that get recommended — THINK
| Format | Role |
|--------|------|
| Open questions (no link) | Highest comment rate |
| Native polls | Cheap, high participation |
| Native photo / short native video | Dwell + share; upload in-app |
| Recognition / “who do you trust” | Names + stories = threads |
| Member-to-member asks | Not admin broadcast |

**Kill / demote risk:**
- External link as the post body (put link in **first comment** if needed)
- Engagement bait (“like if you agree”)
- Spam / repeated promo → hurts **group quality score** (THINK — admin insights)
- Dumping AI articles with no question

### 4) Quality & integrity — THINK
Admin Insights → watch reports, hidden posts, spam. Low quality → fewer recommendations even if you post a lot.  
Moderate fast. Kick link-spammers. Keep promo sparse (admin highlights with a **question**, not flyers).

### 5) Badges & social proof — THINK
Enable Conversation Starter / Rising Star / New Member badges. Assign **Group Experts**. Welcome new members within 24h (comment on their first post). Active-looking members → more invites → more recommendations.

### 6) Discovery surfaces — THINK
Recommendations compete with Feed, Reels, Marketplace. Signals that help:
- High **active members** (posted/commented/reacted in 28 days), not just headcount
- Consistent daily activity (revive from idle = **never go dark again**)
- Members inviting friends who then engage
- Cross-post best threads to a Page (with permission) + local LV pages/stories
- Pin: “What this group is + how to win free site + rules”

### 7) Membership hygiene — THINK
Don’t approve 500 blank requests in one dump (creates lurkers). Membership questions (“What business? What city?”). Batch approvals. Prefer people who answer.

### 8) Idle-group revival sequence (next 14 days)
1. **Day 0–1:** Pin rules + contest + “we’re back.” Post 31+ same day (spread hours).
2. **Every day:** recognition Q + rec-ask + poll + contest announce + specialty value from product accounts + LV pulse.
3. **First hour:** Adam or mod replies on every hot thread.
4. **Day 2+:** Announce contest winners publicly; tag winner; build free site (proof).
5. **Week 1:** DM 50 quiet-but-real past posters: “We’re firing this up again — one comment helps.”
6. **Ongoing:** Soft-open businesses named in rec threads; Best Of on `/go-vegas`.

---

## Daily stack toward 31+ (owned) + 20 members

| Block | Count | Who |
|------|------:|-----|
| Adam discussion / recognition / LV | ~12 | Adam |
| Product accounts (SiteBuilder, Social, …) | ~20 | Brand personalities |
| Contest + sub-promo + rec-asks | included above | Mix |
| Member posts (stimulated) | ~20 aim | Members |

Spread across the day — don’t dump 31 at 8am.

---

## Soft growth loops (already in product)

1. **Recognition** → Superior Place email → join + Best Of (`/go-vegas`)
2. **Rec-ask** → “X from Go Vegas thought we could help” + free spec + score vs competitors
3. **Best post contest** → free website (comment-weighted score)
4. **Member exclusives / cards / intros** → sticky reasons to return

---

## Automation (what we automate vs what stays human)

| Layer | Automated now | Your time |
|-------|---------------|-----------|
| Daily 31+ post pack | `npm run go-vegas:daily-pack` → `data/go-vegas-daily-packs/YYYY-MM-DD.md` | Approve / light edit / paste (~15–25 min) or hand to VA |
| Contest + recognition + rec-ask copy | Included in pack | Paste |
| Recognition / soft-open emails | Draft functions in playbook (paste business name → we fill) | Send |
| Spec site build | Site Builder pipeline | Trigger when warm |
| Live comments / defuse / mod | **Not** automated (needs real humans) | Hosts / agents / you |
| FB Graph auto-post into group | **Blocked / unreliable** without Meta app + often disallowed | Don’t depend on it |

**Principle:** Automate the brain and the queue. Keep a human finger on Send so Meta and the room stay happy.

## Admin checklist (weekly)

- [ ] Insights: posts/day ≥ 31 most days; active members trending up  
- [ ] Quality: reports/spam down  
- [ ] Top posts = questions/polls, not links  
- [ ] Contest ran ≥ 3× this week  
- [ ] ≥ 5 recognition outreaches  
- [ ] ≥ 3 soft-opens from rec threads  
- [ ] New members welcomed  
- [ ] Badges on  

---

## Sources

- Meta Transparency: [Facebook Individual Group Feed](https://transparency.meta.com/features/explaining-ranking/fb-individual-group-feed/) (≥20 posts/past day eligibility; comment/react prediction signals)
- Meta Transparency: Feed ranking / MSI philosophy (comments & conversation over passive consumption)
- Practitioner consensus 2025–26: comments ≫ likes; native > external links; first-hour replies; group quality score
