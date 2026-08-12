<!-- SYNOPSIS: Founder capture -- picking the MTG cataloger back up cold, finding that the catalogue was mispriced rather than merely incomplete, 2026-08-11. -->

# The MTG catalogue was priced wrong, not just incompletely (2026-08-11)

## Context

Adam handed the MTG card cataloging work over mid-stream: *"i had been
working on a system to upload bulk photos of my magic the gathering cards
and ran out of useage for claude. i need to have you pick that up for me."*
No further direction — the ask was to take it from wherever it actually was.

Captured per SO-004 because what the pickup found changes the trustworthiness
of a real asset (his card collection's stated value), not just the state of
some code.

## What the previous session had left open, versus what was actually true

The last receipts closed with worry that the upload tool was broken. Checking
real production data first rather than reading the receipts as truth: it was
**working**. `GET /recent-activity` showed 366 cards catalogued across 6 real
batches earlier that day, nearly all `done`. The prior session's fixes had
landed.

The real problem was one nobody had looked for, because the pipeline
*appeared* to succeed.

## The finding: 32 cards were reported worthless because they were never priced

Scryfall's `set` filter takes a set **code** (`drk`). The vision model returns
what is physically printed on the card — a set **name** ("The Dark"). So every
lookup with a set 404'd and silently fell back to name-only fuzzy matching. And
name-only fuzzy returns an arbitrary default printing, which for older cards is
routinely an **MTGO digital-only set** (Masters Edition IV, Vintage Masters)
that has no paper price at all.

Reproduced against the live API before changing anything: `Zombie Master` →
Masters Edition IV, `usd: null`. Its real paper printings run **$0.49 to
$149.97**.

The important part is not the 32 nulls. It is that **every other price was
produced the same way** — an old Tempest card could have been priced off a
modern reprint. The catalogue looked complete and was quietly unreliable.

## The design decision underneath the fix

When the set cannot be pinned down, there is no honest single number. The
system now reports the median across real paper printings **plus the true
min/max spread**, and flags the card for review. The rule that matters: a
review-flagged card is never routed to `bulk_lot`. Guessing low on a card whose
top printing is worth $150 is the one failure mode that actually loses money;
guessing high just costs a few minutes of looking.

## Two failures found by watching, not by declaring done

Both worth recording because each looked like success first.

1. The first reprice run over 368 real rows reported **353 failures in 45
   seconds** — and the code could not say why, because it counted failures
   without recording a single error message. The cause had to be inferred from
   wall-clock timing (roughly one request per row = every first call rejected):
   Scryfall throttling Railway's datacenter IP. Fixed with backoff, a lookup
   cache, and — the real lesson — actual error reporting.
2. With backoff in place, failures went to zero and the job then **stalled dead
   at 249/368** while still reporting `running: true`. `fetch` has no default
   timeout and every call is serialized, so one hung connection blocked
   everything behind it forever. Fixed with a per-request timeout and a
   heartbeat that lets a wedged job be superseded.

## Verified outcome

Full reprice on production: 368/368 repriced, 0 failed. Unpriced cards
**43 → 5**, and those 5 are genuine photo-identification failures, not pricing
failures. Total estimated value $2,779.35 → $2,960.40, with 19 cards correctly
flagged for review rather than silently misvalued.

## Named honestly for Adam, not buried

The collection's single largest line item — `Lightning Bolt / lea` at **$2,480**
(4 × $620 Alpha) — came from a **CSV import with no photo attached** and is very
likely a leftover test row. It is 84% of the collection's stated total. Until
Adam confirms or deletes it, the headline number should not be trusted, and
saying otherwise would be exactly the kind of confident-but-hollow reporting
this system is supposed to refuse.
