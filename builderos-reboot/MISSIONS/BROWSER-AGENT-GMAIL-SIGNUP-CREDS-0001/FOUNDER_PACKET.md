<!-- SYNOPSIS: Founder Packet — GMAIL_SIGNUP envCreds branch for reading the system inbox. -->

# Founder Packet — Browser Agent GMAIL_SIGNUP Creds

**Mission ID:** `BROWSER-AGENT-GMAIL-SIGNUP-CREDS-0001`
**Locked:** 2026-08-09 (Adam: "on railway has the systems email address and all login info so use that not mine")

## Priority

Fiverr's email-verification code isn't being found by the IMAP-based checker. Need to check the real system inbox (`GMAIL_SIGNUP_EMAIL`/`GMAIL_SIGNUP_APP_PASSWORD`, already stored in Railway) directly, using only the system's own credentials, never the founder's personal ones.

## Desired outcome

A `GMAIL_SIGNUP` envCreds branch in `routes/general-browser-agent-routes.js`, matching the exact existing `ETSY`/`EBAY` pattern -- injects real credentials server-side, never exposes them to the caller.

## FOUNDER SUCCESS TEST

A goal run with `envCreds: "GMAIL_SIGNUP"` logs into the real system Gmail account without the caller ever seeing the password.

## Acceptance command

```bash
npm run browser-agent-gmail-signup-creds:acceptance
```
