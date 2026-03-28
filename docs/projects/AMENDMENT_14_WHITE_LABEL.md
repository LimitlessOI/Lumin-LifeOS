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

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 62/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] White-label config JSON schema documented with all fields
- [x] DB table exists (`white_label_configs`)
- [ ] Config endpoints (server.js lines 10171–10198 — only ~25 lines) not yet extracted to `routes/white-label-routes.js`
- [ ] Response transformation middleware (stripping model names, costs) not yet built — confirmed as THINK (may not exist)
- [ ] Partner onboarding flow not specified: no endpoint for creating a new partner config
- [ ] Partner API key generation not designed — no schema for partner keys vs platform keys
- [ ] Stripe billing for partners not designed — no separate billing flow from direct clients
- [ ] Custom domain CNAME support requires Railway config not yet documented

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Vendasta | White-label digital marketing platform, strong agency channel | Static feature set — no AI generation, no council model, no coaching; agencies resell fixed products | We give partners AI that generates content, sites, and games — the platform produces new value continuously |
| GoHighLevel | Dominant in agency white-label SaaS, $297/mo, huge community | CRM/email focus — no AI council, no site generator, no game publisher, no life coaching layer | Our white-label includes 15 integrated modules vs GHL's 4–5; one platform replaces multiple GHL add-ons |
| Jotform White Label | Form/workflow white-label, simple pricing | Single-purpose — forms only | Not the same market; but illustrates that agencies pay for white-label tools at $39–$99/mo per seat |
| Custom development (agency builds own AI tool) | Full control, no revenue share | $200K+ to build; 12+ months; ongoing maintenance | We give agencies a production AI OS for $2,500 setup + $1,000/mo — 100x faster, 100x cheaper than custom build |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Partner leaks our architecture or model routing details to end users | Medium | Medium — competitive intelligence loss; potential contractual dispute | Mitigate: response transformer must strip all internal fields before any partner-facing response |
| GoHighLevel acquires an AI company and ships a competing integrated platform | Medium | High — largest agency white-label player adds AI council | Mitigate: our SSOT governance, self-building capability, and custom domain support are differentiators GHL cannot absorb quickly |
| Partner churns after setup fee but before generating recurring revenue | High (common in white-label) | Medium — setup fee is collected but MRR projection fails | Mitigate: require 3-month minimum commitment at signup; build partner analytics dashboard early so they can see usage |
| Data isolation failure — partner A's client data leaks to partner B | Low | HIGH — GDPR violation, trust destruction, liability | Mitigate: API key validation must include `partner_id` scoping on all DB queries; no cross-tenant reads possible |

### Gate 4 — Adaptability Strategy
White-label config is a DB row — adding a new config field (e.g., `hide_pricing_page`) requires one column migration and one check in the response transformer. If a partner needs a new API response format, we add a new `api_response_format` option to the config and a new transformer function. Partner billing is isolated from platform billing — adding revenue share calculation requires a new cron job reading from the partner's usage table without touching any direct-client billing logic. Score: 62/100 — the config schema design is good; the low score reflects how much of the implementation is currently THINK or PLANNED with no code.

### Gate 5 — How We Beat Them
GoHighLevel sells agencies a white-label CRM; LifeOS sells agencies a white-label AI operating system that generates websites, games, and videos, coaches their clients' sales teams, tracks commitments, and optimizes its own AI costs — a complete business infrastructure they could never build themselves, under their own brand, for the cost of two employee hours per month.
