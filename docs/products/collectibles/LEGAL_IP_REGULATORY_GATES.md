<!-- SYNOPSIS: Collectibles legal, IP, and regulatory gates -->

# Collectibles — Legal / IP / Regulatory Gates

Builders must treat gate status as hard manufacturing blockers for gated surfaces. V1 personal Vault (user photos of own cards + factual metadata) is designed to proceed under ordinary product law; counsel review still applies before public marketing claims.

## Gate legend

| Status | Meaning |
|---|---|
| GREEN | Allowed to manufacture under current blueprint assumptions |
| YELLOW | Allowed only behind feature flag + counsel checklist |
| RED | Forbidden until explicit grant / license / regulated partner |

---

## 1. Funds custody

| Topic | Gate | Rule |
|---|---|---|
| Teloa holding customer funds | RED | Never. Use licensed payment/held-funds adapter. |
| Marketplace settlement | YELLOW→GREEN when provider contracted | Domain state ≠ provider state |

**Founder lock:** Teloa does not hold customer funds.

---

## 2. IP — canonical imagery, rules, Arena adapters

| Topic | Gate | Rule |
|---|---|---|
| User’s own photos of owned objects in private Vault | GREEN | Core V1 |
| Third-party canonical card images in Vault | YELLOW | Only with IpPermissionGrant or provider license terms allowing it; else use user photos / neutral placeholder |
| Rules text / game logic reproduction | RED without grant | |
| Third-party Arena adapter (e.g. copyrighted TCG) | RED until IpPermissionGrant.status=granted | Ownership of physical card ≠ IP permission |
| Original/lawful test game on Universal Tabletop | GREEN for V7 success proof | Required proof path |
| Publisher withdraws permission | Immediate adapter disable | Twins remain; play sessions using that adapter stop |

---

## 3. Custody / insurance marketing

| Topic | Gate |
|---|---|
| Optional partner custody workflow engineering | YELLOW (V6) |
| Marketing “insured vault” / fiduciary claims | RED until counsel + partner contracts |
| Insurance data packages to licensed partners | YELLOW (V9) |

---

## 4. Contests / prizes / tournaments

| Topic | Gate |
|---|---|
| Store events without prizes | GREEN (V5/V8) |
| Prize tournaments | RED/YELLOW by jurisdiction — Contest/gaming legal gate required per jurisdiction before enable |
| Verified Physical Ownership format | YELLOW |

---

## 5. Lending / pawn / financing

| Topic | Gate |
|---|---|
| Teloa direct lending | RED unless separate regulated-business blueprint |
| Referral to licensed partners with jurisdiction filter | YELLOW (V9) |
| Collateral information package | YELLOW — accurate packaging, no credit decision by Teloa |

---

## 6. Content / publicity

| Topic | Gate |
|---|---|
| Private reveal recording for owner | GREEN with notice |
| Partner/network/public clips | Requires ContentRights grant; revoke/takedown supported |
| Rights implied by purchase/custody/tx | Forbidden |

---

## 7. Privacy / surveillance

| Topic | Gate |
|---|---|
| Host HUD privacy filter | GREEN mandatory |
| Selling location/threshold data | RED |

---

## 8. Manufacturing checklist (gated versions)

Before enabling a YELLOW/RED surface in production:

1. IpPermissionGrant or partner license row exists and is `granted`/`active`.
2. Jurisdictions listed and enforced in code.
3. Reality test proves disabled path when grant withdrawn.
4. Counsel checklist receipt attached to mission (external to this repo OK; reference id required).
