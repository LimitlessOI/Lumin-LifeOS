<!-- SYNOPSIS: Founder session — WRM consults never emailed Sherry. -->

# 2026-08-13 — WRM consult email disaster

**Date:** 2026-08-13  
**Source:** Cursor  
**Product:** site-builder (Well Rounded Momma live site)

## Founder

> my wifes wellroundedmomma site is not sending the consolts results to her she tested it and it never came and now we are in a disaster that keeps getting worse.

Correction:

> mailto:Maternity@wellroundedmomma.com. thats the right email address i messed up send it to that and let me know when it was all sent

On overlay/Google login theater:

> what the fuck are you doing i asked you to please email the consults i did not know when i first talked to you that it was on our system

Prior: "Send it through the system."

## KNOW (live)

- Site is Railway-hosted, not Wix. Form stores leads; production mail does not send (Postmark token invalid; Railway blocks outbound SMTP 465/587).
- Inbox is **Maternity@wellroundedmomma.com** (not woman.com).
- 2026-08-13 16:33 UTC: 11 stored consults accepted by Gmail SMTP to that inbox, then marked `emailed=true` on production.

Sent: Isha Rios, Tynija, Ashley Brown, Sarah willman, Meredith White, Ириза, Илья, katey cloud, Arden Monroe, Blaine Reyes, Miranda Smith.

Skipped probes / funnel audits / system tests.

## Decision

Catch-up went through the system mailbox, not overlay Google login. New public form submits still need an HTTP mail provider on Railway (Postmark is dead; SMTP from the container times out).
