# AMENDMENT 14 — White-Label Platform
**Status:** BUILDING
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

---

## WHAT THIS IS
The entire LimitlessOS platform packaged as white-label for other agencies, brokerages, or software companies. They get the AI council, outreach, CRM, coaching, and site builder under their own brand. We run the infrastructure, they own the client relationship.

**Mission:** Sell the engine, not just the car. One white-label client = 10–100x the revenue of one direct client.

---

## REVENUE MODEL
| Revenue Stream | Amount | Notes |
|---------------|--------|-------|
| White-label setup fee | $2,500–$10,000 | One-time per partner |
| Monthly platform fee | $1,000–$5,000/mo | Per white-label partner |
| Per-seat fee | $50–$150/seat/mo | For partners reselling to their clients |
| Revenue share | 10–20% | Of partner's client revenue |

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `server.js` (lines 10171–10198) | White-label config endpoints — NEEDS EXTRACTION |

### DB Tables
| Table | Purpose |
|-------|---------|
| `white_label_configs` | Per-client branding configuration |

### White-Label Config Fields
```json
{
  "client_id": "unique partner ID",
  "brand_name": "Their Brand Name",
  "hide_tiers": true,        // Hide Tier 0/1 model names
  "hide_models": true,       // Hide which AI models are used
  "hide_costs": true,        // Hide our cost structure
  "hide_architecture": true, // Hide internal system details
  "custom_domain": "ai.theirdomain.com",
  "custom_logo": "https://...",
  "api_response_format": "standard"
}
```

### Custom Domain Support
- Partner gets subdomain: `ai.theircompany.com`
- Requires CNAME DNS record pointing to Railway domain
- All API responses strip internal branding

---

## CURRENT STATE
- **KNOW:** `white_label_configs` table exists in DB
- **KNOW:** Config endpoints exist in server.js (minimal — ~25 lines)
- **THINK:** The actual response transformation (stripping model names etc.) may not be fully implemented
- **DON'T KNOW:** Whether any white-label partners are active

---

## REFACTOR PLAN
1. Extract to `routes/white-label-routes.js`
2. Add response middleware that reads white-label config and transforms API responses
3. Build partner onboarding flow: create config → generate API key → send welcome email
4. Add partner analytics dashboard — usage, seats, revenue
5. Add Stripe integration for partner billing (separate from direct client billing)
6. Create white-label demo instance for sales demos

---

## NON-NEGOTIABLES (this project)
- White-label configs must never expose our internal model names, costs, or architecture to end users
- Each white-label partner gets isolated API key — one key cannot access another partner's data
- Partners cannot modify the SSOT North Star — they inherit all ethical constraints
- Partner clients must retain their data rights (export, delete) even through white-label layer
