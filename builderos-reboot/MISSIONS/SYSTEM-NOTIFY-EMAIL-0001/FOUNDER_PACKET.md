<!-- SYNOPSIS: Founder Packet — minimal system-to-founder email notify route. -->

# Founder Packet — System Notify Email

**Mission ID:** `SYSTEM-NOTIFY-EMAIL-0001`
**Locked:** 2026-08-10 (Adam: "I can't send anything to the Android. I have to see the URL or better yet have the system email the URL to Adam@Hopkins.org.")

## Priority

Adam is on Apple, the target device is Android -- AirDrop/native share can't
bridge them. He needs the system to email him the real `/install` download
link directly, using production's own already-configured Postmark
credentials (confirmed present via `/api/v1/railway/managed-env/status`),
never routed through or exposed to the local machine.

## Desired outcome

A small, reusable, `requireKey`-gated route that sends a plain-text email
via Postmark using the server's own env vars (`POSTMARK_SERVER_TOKEN`,
`EMAIL_FROM`). Narrow, general-purpose (any future "notify the founder by
email" need reuses this instead of a one-off script), not Fiverr/Android-specific.

## FOUNDER SUCCESS TEST

`POST /api/v1/system/notify/email {to, subject, text}` with real Postmark
creds configured returns `{ok:true, message_id}` and Adam receives a real
email.

## Acceptance command

```bash
npm run system-notify-email:acceptance
```
