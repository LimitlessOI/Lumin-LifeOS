<!-- SYNOPSIS: LifeOS Version Roadmap — Machine Path -->

# LifeOS Version Roadmap — Machine Path

**Authority:** `builderos-reboot/LIFEOS_VERSION_QUEUE.json` (machine queue)  
**Amendment:** `docs/products/lifeos/PRODUCT_HOME.md`  
**Last Updated:** 2026-06-16

Adam's machine Alpha: foundation pipeline PASS + acceptance command PASS. Not app usage.

## Version plan

| Ver | Mission | What it proves |
|-----|---------|----------------|
| 1.1 | Voice Rail v1 | Speak/type → LifeOS responds |
| 1.2 | Commitments v1 | Conversation → tracked commitments |
| 1.3 | Action Inbox v1 | Classify, stage, approve — no auto-build |
| 2.0 | Capture Pipeline v2 | Voice Rail → Action Inbox auto-stage |
| 2.1 | Commitment Route v2 | Approved inbox commitment → commitment tracker |
| 3.0 | Daily Mirror v3 | Mirror API snapshot acceptance |
| 3.1 | Integrity + Joy v3 | Daily check-in loop acceptance |
| 4.0 | Hub Overlay v4 | One surface linking voice + inbox + today |

## Overnight command

```bash
npm run lifeos:versions:overnight
```

Runs foundation pipeline on each queued mission in order; logs to `data/lifeos-version-overnight-log.json`.
