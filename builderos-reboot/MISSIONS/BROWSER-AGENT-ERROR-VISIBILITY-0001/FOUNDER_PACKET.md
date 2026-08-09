<!-- SYNOPSIS: Founder Packet — fix swallowed error visibility in the browser-agent executeAction catch block. -->

# Founder Packet — Browser Agent Error Visibility

**Mission ID:** `BROWSER-AGENT-ERROR-VISIBILITY-0001`
**Locked:** 2026-08-09 (found live while diagnosing a stuck real Etsy login attempt — every failed action reported `error: {}`, a real Error object silently serializing to nothing)
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.

## Priority

Blocking real debugging of a real Etsy-signup revenue attempt in progress. `executeAction`'s catch block returns the raw `Error` object; `Error` instances have no enumerable own properties, so `JSON.stringify` (every API response) renders it as `{}` — every browser-agent failure this session and prior has been reported with zero diagnostic detail.

## Desired outcome

`executeAction`'s catch block returns `error.message` (or `String(error)` as fallback) instead of the raw `Error` object, so every future failure is actually diagnosable from the API response.

## FOUNDER SUCCESS TEST

A thrown error inside `executeAction` (e.g. an invalid selector) now returns a real, non-empty message string in the response instead of `{}`.

## Acceptance command

```bash
npm run browser-agent:error-visibility:acceptance
```

## Explicitly out of scope

Any other change to `executeAction` or the browser-agent loop.
