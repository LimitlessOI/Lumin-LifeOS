# TCO Sales Agent - World-Class Objection Handling Guide

**Status**: UPGRADED with persistence mode, objection handling, and negotiation authority
**Date**: 2026-01-08
**Version**: 2.0

---

## Overview

The TCO Sales Agent is now equipped with world-class sales capabilities:
- **8 common objections** with proven rebuttals
- **Beta framing** in all outreach (5 beta spots, negotiable pricing)
- **3-strike persistence** (never gives up before 3 follow-ups)
- **Negotiation authority** (can offer 15%, 10%, or 5% instead of 20%)
- **Full analytics** on objections and conversion rates

---

## Objection Database

The agent automatically detects and handles these objections:

### 1. Data Privacy
**Triggers**: privacy, data security, store data, gdpr, hipaa, pii
**Rebuttal**: "We're a pass-through proxy - never store prompts. NDA available."
**Urgency**: "Beta partners get first access to SOC 2 compliance docs."

### 2. Reliability
**Triggers**: downtime, reliable, uptime, fail, break, production, risk
**Rebuttal**: "Built-in failover - if we fail, auto-routes to direct API. Zero downtime risk."
**Urgency**: "Beta partners get dedicated Slack channel for instant support."

### 3. No Track Record
**Triggers**: track record, proven, case studies, references, testimonials
**Rebuttal**: "Beta program with negotiable pricing and zero risk. Only pay verified savings."
**Urgency**: "Only 5 beta spots - 3 already claimed."

### 4. Security
**Triggers**: security, hack, breach, encryption, credentials, api keys
**Rebuttal**: "AES-256-GCM encryption (bank-grade). Pass-through architecture, not a honeypot."
**Urgency**: "Beta partners get priority security reviews and compliance docs."

### 5. Too Expensive
**Triggers**: expensive, too much, cost, price, afford, budget
**Rebuttal**: "Beta pricing negotiable: 15%, 10%, even 5% (vs standard 20%). Only pay verified savings."
**Urgency**: "Beta pricing expires once we hit 5 customers."

### 6. Need Approval
**Triggers**: approval, team, boss, manager, cto, cfo, decision maker
**Rebuttal**: "Zero upfront cost = nothing to approve budget-wise. Can send one-pager or join team call."
**Urgency**: "Beta terms only available for 2 more weeks."

### 7. Think About It
**Triggers**: think about it, later, not now, busy, maybe, get back to you
**Rebuttal**: "What would you need to see to move forward today? We can address concerns now."
**Urgency**: "Beta slots are first-come, first-served. Can hold one for 48 hours."

### 8. Too Good to Be True
**Triggers**: too good, sounds fake, suspicious, scam, believe, impossible
**Rebuttal**: "Here's the math: (1) Cheaper models = 70% savings, (2) Caching = free, (3) MICRO compression = 90% tokens. We'll run a 7-day POC to prove it."
**Urgency**: "Beta partners get free POC setup (normally $500)."

---

## Beta Framing (All Outreach)

Every response includes:
- **"Looking for 5 beta partners"** - Creates urgency
- **Negotiable pricing** - "As low as 5% vs standard 20%"
- **Zero risk** - "Only pay verified savings we actually deliver"
- **Founding customer benefits** - Early access, dedicated support, logo rights

---

## Persistence Mode (3-Strike System)

The agent NEVER gives up before 3 follow-ups:

### Follow-Up #1 (24 hours later)
- Gentle reminder + beta urgency
- Example: "We're down to our last 2 beta spots. Still interested in a free audit?"

### Follow-Up #2 (48 hours after #1)
- Ask "What would change your mind?"
- Example: "What would it take to get you to try this? Technical concern or pricing?"

### Follow-Up #3 (48 hours after #2)
- Final attempt, leave door open
- Example: "This is my last message. If you ever want to revisit, I'm here. Door's always open!"

After 3 follow-ups with no conversion, the interaction is marked as `lost_after_followups` but the door is left open for future re-engagement.

---

## Negotiation Authority

The agent can offer flexible pricing:

| Tier | Rate | Conditions |
|------|------|------------|
| **Standard** | 20% | Standard customer, no special terms |
| **Beta Basic** | 15% | Beta customer, willing to provide feedback |
| **Beta Case Study** | 10% | Beta + case study + testimonial rights |
| **Beta Enterprise Logo** | 5% | Enterprise + logo rights + detailed case study + reference calls |

### How to Trigger Negotiation

```bash
curl -X POST http://localhost:3000/api/tco-agent/negotiate \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 123,
    "tier": "beta_case_study",
    "notes": "Large enterprise, willing to do video testimonial"
  }'
```

All negotiations are logged to `tco_agent_negotiations` table for review.

---

## API Endpoints

### Webhook Endpoints

```bash
# Generic social media webhook
POST /api/tco-agent/webhook/mention
{
  "platform": "twitter",
  "message": "AI API costs are killing us!",
  "username": "john_doe",
  ...
}

# Twitter-specific webhook
POST /api/tco-agent/webhook/twitter
```

### Management Endpoints

```bash
# Get pending interactions for human review
GET /api/tco-agent/pending

# Approve/reject an interaction
POST /api/tco-agent/review/:id
{
  "action": "approve",  # or "reject"
  "notes": "Looks good"
}

# Test the agent
POST /api/tco-agent/test
{
  "message": "These AI API costs are insane!"
}
```

### Analytics Endpoints

```bash
# Get objection analytics (conversion rate per objection type)
GET /api/tco-agent/objections

# Get persistence stats (conversion rate per follow-up stage)
GET /api/tco-agent/persistence-stats

# Get all negotiations
GET /api/tco-agent/negotiations

# Get agent performance stats
GET /api/tco-agent/stats?start_date=2026-01-01&end_date=2026-01-31

# Get all interactions
GET /api/tco-agent/interactions?limit=50&offset=0&status=sent

# Get leads only
GET /api/tco-agent/leads
```

### Configuration

```bash
# Get current config
GET /api/tco-agent/config

# Update config
PUT /api/tco-agent/config/:key
{
  "value": true
}

# Example: Enable auto-reply
PUT /api/tco-agent/config/auto_reply
{
  "value": true
}
```

---

## Database Schema Updates

### New Fields in `tco_agent_interactions`

- `follow_up_count` (INTEGER) - Track persistence (0-3)
- `objection_type` (VARCHAR) - Which objection was detected
- `negotiated_rate` (DECIMAL) - Custom pricing if negotiated

### New Table: `tco_agent_negotiations`

Tracks all price negotiations:
- `customer_id` - Which customer
- `tier` - Which negotiation tier
- `rate` - Actual rate agreed upon
- `conditions` - What they agreed to
- `notes` - Additional context

---

## Running the Migration

To add the new database fields, run:

```bash
psql $DATABASE_URL -f database/migrations/upgrade_tco_agent_objection_handling.sql
```

---

## Usage Examples

### Example 1: Test Objection Detection

```bash
curl -X POST http://localhost:3000/api/tco-agent/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "This sounds great but I need my team to approve it first"
  }'
```

Response:
```json
{
  "success": true,
  "detection": {
    "isCostComplaint": true,
    "confidenceScore": 85,
    "keywords": ["approve", "team"]
  },
  "generatedResponse": "Totally understand. The good news is there's zero upfront cost...",
  "wouldRespond": true
}
```

### Example 2: View Objection Analytics

```bash
curl http://localhost:3000/api/tco-agent/objections
```

Response:
```json
{
  "success": true,
  "objections": [
    {
      "objection_type": "too_expensive",
      "count": 45,
      "conversion_rate": 22.5
    },
    {
      "objection_type": "need_approval",
      "count": 32,
      "conversion_rate": 18.75
    },
    ...
  ]
}
```

### Example 3: View Persistence Stats

```bash
curl http://localhost:3000/api/tco-agent/persistence-stats
```

Response:
```json
{
  "success": true,
  "stats": [
    {
      "follow_up_count": 0,
      "total_interactions": 150,
      "conversions": 20,
      "conversion_rate": 13.33
    },
    {
      "follow_up_count": 1,
      "total_interactions": 80,
      "conversions": 15,
      "conversion_rate": 18.75
    },
    {
      "follow_up_count": 2,
      "total_interactions": 40,
      "conversions": 8,
      "conversion_rate": 20.0
    },
    {
      "follow_up_count": 3,
      "total_interactions": 10,
      "conversions": 2,
      "conversion_rate": 20.0
    }
  ],
  "message": "Shows how many conversions happen at each follow-up stage"
}
```

---

## Sales Tactics Implemented

The agent uses world-class sales tactics:

1. **Mirroring** - Acknowledges their concern first, using their language
2. **Acknowledge Before Rebutting** - Never dismisses concerns, validates them first
3. **Social Proof** - References other customers when available
4. **Urgency** - "Only 5 beta spots", "Beta closes this week"
5. **Micro-Commitments** - "Can I send you a one-pager?" (easier to say yes)
6. **Risk Reversal** - "Zero cost", "Only pay verified savings"
7. **Questioning** - "What would change your mind?" (uncovers real objections)
8. **Door Always Open** - Even after 3 follow-ups, stays friendly

---

## Key Principles

1. **NEVER give up before 3 follow-ups** - Persistence is key
2. **Always acknowledge concerns first** - Empathy before solutions
3. **Use beta framing in every message** - Creates urgency
4. **Offer micro-commitments** - Make it easy to say yes
5. **Track everything** - Data-driven sales optimization
6. **Leave door open** - Even "lost" leads can come back

---

## Next Steps

1. **Run the migration** to add new database fields
2. **Test objection handling** with sample messages
3. **Review analytics** to see which objections convert best
4. **Adjust rebuttals** based on conversion data
5. **Monitor persistence stats** to optimize follow-up timing

---

**The agent is now ready to NEVER give up on qualified leads.**
