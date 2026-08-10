<!-- SYNOPSIS: Founder Packet — sensitive-content redaction for the drive channel. -->

# Founder Packet — Drive Channel Sensitive Content Filter

**Mission ID:** `DRIVE-SENSITIVE-CONTENT-FILTER-0001`
**Locked:** 2026-08-10 (Adam: "we will need to show that we are blocking out sensitive informations or embarising images or porn site historys i know apple dose that" -> "Can we simply not even acknowledge it? ... essentially, even if we see it, we just redact it and don't record it. Delete it from our memories. It's, like, not seeing it ever.")

## Priority

The drive channel (and the new Android AccessibilityService driver) can
observe ANYTHING on the screen it's driving -- there is currently zero
filtering before that content reaches an AI model prompt, gets persisted to
the session's steps log, or shows in the drive UI. Adam's explicit
requirement: sensitive content (explicit/adult material, PII-shaped data)
must be redacted at the source and never stored anywhere downstream --
functionally as if it was never observed, not just hidden in the UI.

## Desired outcome

A new module that redacts sensitive text/elements BEFORE they leave the
observation step, applied once at the single real chokepoint
(`services/extension-drive-bridge.js`'s `toObservation`) so every downstream
consumer (model prompt, DB log, UI) only ever sees the redacted version.

## FOUNDER SUCCESS TEST

Given observation text/elements containing an explicit-content domain,
explicit keywords, or PII-shaped patterns (SSN/credit-card), the module
returns a redacted version with the sensitive content replaced by a fixed
marker, never the original.

## Acceptance command

```bash
npm run drive-sensitive-content-filter:acceptance
```

## Known, stated limitation (be honest about it)

This is heuristic v1 -- domain/keyword/pattern matching for the clearest
cases, not a full content classifier. Document this limitation in the file
itself; do not claim complete coverage.
