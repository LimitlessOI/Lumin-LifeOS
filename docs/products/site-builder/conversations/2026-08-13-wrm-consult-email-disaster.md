<!-- SYNOPSIS: Founder session — WRM consults never emailed Sherry. -->

# 2026-08-13 — WRM consult email disaster

**Date:** 2026-08-13  
**Source:** Cursor  
**Product:** site-builder (Well Rounded Momma live site)

## Founder

> my wifes wellroundedmomma site is not sending the consolts results to her she tested it and it never came and now we are in a disaster that keeps getting worse. i need this fixed use the new overlay and make it so it goes to my wifes emali wich is Maternity@wellroundedwoman.com.

Later: login info is in Railway; he will provide the one-time code when overlay Gmail first-login asks.

## KNOW (live)

- Form posts to `/api/v1/wrm/consult` and stores leads. Email does not send.
- 10 real unsent consults (`emailed=false`), including Blaine Reyes (2026-08-12, likely Sherry's test).
- Error: `Request does not contain a valid Server token.` Postmark canceled; fallback only ran on "pending approval".
- Default inbox was `maternity@wellroundedmomma.com`. Required inbox: `Maternity@wellroundedwoman.com`.

## Decision

Send consults to `Maternity@wellroundedwoman.com`. Use overlay Gmail for catch-up. Server path must fall through Postmark → Resend/SMTP so new form submits do not wait on an agent.
