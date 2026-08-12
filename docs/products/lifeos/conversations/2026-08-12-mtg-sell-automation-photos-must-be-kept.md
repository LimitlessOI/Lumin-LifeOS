<!-- SYNOPSIS: Founder correction -- MTG photos are sell inventory; system owns listing/selling. -->

# Photos are inventory; the system sells them (2026-08-12)

## Founder, verbatim

*"Throw the image away? Holy shit! Yeah, I need this to be able to be automated, and you're gonna sell them? That's what we're doing There's too many for me to manage, and you're going to list them, sell them, manage, get the most amount of money for them. That's your job."*

## What this locks

1. Upload photos are **assets**, not disposable vision inputs. Discarding buffers is a product failure.
2. The system's job for this collection is end-to-end: catalog → crop → list → sell → manage → maximize net.
3. Adam will keep uploading; the pipeline must keep up without him babysitting listings.

## What shipped immediately

- Durable photo storage (`mtg_card_photos`) — DB until R2 is on
- Per-card crop boxes from vision → listing JPEGs
- `sell_status` / sell-queue foundation

## What is not yet live (named honestly)

Automated posting to TCGPlayer/eBay, order fulfillment, and payouts. Those need seller accounts + marketplace APIs. Photos+crops+queue are the prerequisite so that work has something to sell.
