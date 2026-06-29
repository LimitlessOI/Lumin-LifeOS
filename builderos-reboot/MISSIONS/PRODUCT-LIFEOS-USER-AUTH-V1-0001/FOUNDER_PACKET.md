<!-- SYNOPSIS: Founder Packet — LifeOS Consumer Auth v1 -->

# Founder Packet: LifeOS Consumer Auth v1

**Mission ID:** PRODUCT-LIFEOS-USER-AUTH-V1-0001  
**Product:** LifeOS (consumer app)  
**SSOT:** docs/projects/AMENDMENT_21_LIFEOS_CORE.md

## WHAT

Build the LifeOS user auth system — the #1 consumer product gap. Users currently have no accounts. After this blueprint:
- Users can sign up and log in via the LifeOS app overlay
- JWT auth: access token (15m) + refresh token (7d)
- Tier enforcement: Free / Core / Pro / Elite gates on premium routes
- Lumin knows who you are when you chat — not a guest

## PASS

Machine runs `npm run lifeos:user-auth:v1-acceptance` — all steps pass. Machine alpha walkthrough confirms login flow works end-to-end. Founder reviews async.

## SEQUENCE

1. DB migration (lifeos_users + lifeos_refresh_tokens tables)
2. Register + login endpoints with Zod validation + bcrypt
3. Tier guard middleware wired to premium routes
4. Login UI in lifeos-app.html overlay
5. Lumin account identity (chair route gets JWT sub as user_id)
6. Acceptance test + machine alpha walkthrough

## NOTE

Machine builds per BLUEPRINT.json steps. Machine does its own alpha after each step. Founder never waits.


## Problem
Mission PRODUCT-LIFEOS-USER-AUTH-V1-0001 requires a machine path from founder intent to Alpha. Prior attempts stopped on first gate FAIL instead of looping to repair.

## Desired Outcome
Founder reaches Point B: acceptance command PASS and founder success test satisfied on production.

## FOUNDER SUCCESS TEST
Run the mission acceptance command; confirm the product behavior matches founder packet intent.
