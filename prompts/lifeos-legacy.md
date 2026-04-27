# Domain: Legacy Core

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md)

**Last updated:** 2026-04-19  
**SSOT:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`  
**Owning routes:** `routes/lifeos-legacy-routes.js`  
**Owning service:** `services/lifeos-legacy-core.js`  
**Mounted at:** `/api/v1/lifeos/legacy`

---

## What this lane now ships

- Trusted contacts:
  - `GET /trusted-contacts`
  - `POST /trusted-contacts`
  - `DELETE /trusted-contacts/:id`
- Dead-man switch cadence:
  - `GET /check-in-cadence`
  - `PUT /check-in-cadence`
- Time-capsule messages:
  - `GET /time-capsule`
  - `POST /time-capsule`
- Digital will:
  - `GET /digital-will`
  - `PUT /digital-will`
- Legacy completeness score:
  - `GET /completeness`

DB:
- `legacy_trusted_contacts`
- `legacy_messages` (with `deliver_at`)
- `digital_wills`
- `lifeos_users.legacy_check_in_cadence_days` + `legacy_last_check_in_at`

---

## Next approved task

Add minimal overlay UI (`public/overlay/lifeos-legacy.html`) to create contacts,
set cadence, write/schedule time-capsule messages, edit digital will, and show
completeness score.
