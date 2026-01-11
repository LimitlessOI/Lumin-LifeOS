# 🚀 TCO TOP 5 - IMPLEMENTATION PLAN (APPROVED)

**Date:** January 11, 2026
**Status:** ✅ APPROVED BY AI COUNCIL
**Decision:** Unanimous vote to proceed
**Timeline:** 4 weeks to $10K MRR

---

## ✅ COUNCIL DECISION

The AI Council has voted to implement all 5 ideas in this exact order:

1. **Query Deduplication Ledger** (Week 1)
2. **Per-Request Transparency Popup** (Week 1)
3. **Quality Watermark Protocol** (Week 2)
4. **TCO as a Service Tiering** (Weeks 3-4)
5. **Savings Insurance Premium** (Week 4)

**Rationale:**
- Build trust first (Weeks 1-2) → Makes sales easier
- Monetize trust later (Weeks 3-4) → Revenue follows naturally
- Each feature compounds the previous one
- Low-effort high-impact features first

---

## 📅 WEEK-BY-WEEK PLAN

### WEEK 1: Trust Foundation (Jan 11-17)
**Goal:** Show customers radical transparency

#### Feature 1: Query Deduplication Ledger
**Days:** 3 days (Mon-Wed)

**Tasks:**
- [ ] Create `tco_query_ledger` table in database
- [ ] Add query hashing function (SHA-256)
- [ ] Check for duplicates before charging
- [ ] Log every unique query with signature
- [ ] Test with 100 sample requests

**SQL Schema:**
```sql
CREATE TABLE tco_query_ledger (
  ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES tco_customers(id),
  original_cost DECIMAL(10,6) NOT NULL,
  actual_cost DECIMAL(10,6) NOT NULL,
  savings DECIMAL(10,6) NOT NULL,
  model_used VARCHAR(100),
  quality_score INTEGER,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_hash ON tco_query_ledger(query_hash);
CREATE INDEX idx_ledger_customer ON tco_query_ledger(customer_id);
```

**Success Metric:** 0 duplicate charges in production

---

#### Feature 2: Per-Request Transparency Popup
**Days:** 4 days (Wed-Sat)

**Tasks:**
- [ ] Design transparency card UI component
- [ ] Add to TCO proxy response metadata
- [ ] Show: Original cost, Actual cost, Savings, Model, Quality
- [ ] Add "View Full Trace" link
- [ ] Add "Report Issue" button
- [ ] A/B test with 10 pilot customers

**Response Format:**
```json
{
  "choices": [...],
  "usage": {...},
  "tco_transparency": {
    "original_provider": "openai",
    "original_model": "gpt-4",
    "original_cost": 0.00420,
    "actual_provider": "ollama",
    "actual_model": "deepseek-r1:32b",
    "actual_cost": 0.00000,
    "savings": 0.00420,
    "savings_percent": 100.0,
    "quality_score": 98,
    "confidence": "high",
    "routing_reason": "Easy request - routed to free tier",
    "trace_id": "trace_abc123"
  }
}
```

**Success Metric:** 8/10 pilot customers say "this makes me trust TCO more"

---

### WEEK 2: Fraud Prevention (Jan 18-24)
**Goal:** Make savings claims irrefutable

#### Feature 3: Quality Watermark Protocol
**Days:** 10 days (Mon-Wed next week)

**Tasks:**
- [ ] Design watermark schema (JSON structure)
- [ ] Add cryptographic signing (HMAC-SHA256)
- [ ] Embed watermark in every response
- [ ] Create verification endpoint `/api/tco/verify`
- [ ] Test with external auditor
- [ ] Update sales deck with "auditable claims"

**Watermark Format:**
```json
{
  "tco_watermark": {
    "version": "1.0",
    "request_id": "req_abc123",
    "customer_id": "cust_001",
    "timestamp": "2026-01-18T14:30:00Z",
    "original": {
      "provider": "openai",
      "model": "gpt-4",
      "cost": 0.00420
    },
    "actual": {
      "provider": "ollama",
      "model": "deepseek-r1:32b",
      "cost": 0.00000
    },
    "savings": 0.00420,
    "quality_score": 98,
    "difficulty": "easy",
    "signature": "hmac-sha256:a3f2b1c4d5e6..."
  }
}
```

**Verification Endpoint:**
```javascript
POST /api/tco/verify
{
  "watermark": {...}
}

Response:
{
  "valid": true,
  "verified_at": "2026-01-18T14:35:00Z",
  "message": "Watermark signature verified. Savings claim is authentic."
}
```

**Success Metric:** External auditor confirms watermark is cryptographically sound

---

### WEEKS 3-4: Revenue Capture (Jan 25 - Feb 7)
**Goal:** Turn trust into revenue

#### Feature 4: TCO as a Service Tiering
**Days:** 7 days (Week 3)

**Tasks:**
- [ ] Define tier limits in database
- [ ] Create `tco_subscription_tiers` table
- [ ] Build upgrade flow UI
- [ ] Integrate Stripe billing
- [ ] Create tier enforcement middleware
- [ ] Test with 3 pilot customers (1 per tier)

**Tier Definitions:**
```javascript
const tiers = {
  starter: {
    name: "Starter",
    price: 0,
    commission: 0,
    limits: {
      tokens_per_month: 10000,
      models: ["ollama_deepseek", "ollama_qwen", "ollama_llama"],
      features: ["basic_routing", "savings_tracking"]
    }
  },
  pro: {
    name: "Pro",
    price: 49, // per month
    commission: 0.20, // 20% of savings
    limits: {
      tokens_per_month: null, // unlimited
      models: ["all_tier0", "gpt-3.5-turbo", "gemini-flash"],
      features: ["basic_routing", "quality_guarantee", "multi_region"]
    }
  },
  enterprise: {
    name: "Enterprise",
    price: 10000, // custom, min $10K/yr
    commission: 0.15, // 15% of savings
    limits: {
      tokens_per_month: null,
      models: ["all_models"],
      features: ["all_features", "white_label", "dedicated_support", "sla_99.99"]
    }
  }
};
```

**Success Metric:** 5 Pro upgrades + 1 Enterprise deal closed

---

#### Feature 5: Savings Insurance Premium
**Days:** 3 days (Week 4)

**Tasks:**
- [ ] Legal review of "insurance" language
- [ ] Add insurance option to checkout (+2% fee)
- [ ] Build refund calculation logic
- [ ] Create insurance claims process
- [ ] Test with 1 enterprise customer

**Insurance Logic:**
```javascript
// Customer opted into insurance (+2% fee)
const totalCommission = savings * 0.22; // 20% + 2% insurance

// At end of month, check performance
if (actualSavingsPercent < 85) {
  const shortfall = (85 - actualSavingsPercent);
  const refundAmount = Math.min(
    totalCommission * 0.50, // Max 50% of fees
    shortfall * targetSavings * 0.02 // Based on shortfall
  );

  await issueRefund(customer, refundAmount);
  await sendEmail(customer, `Insurance refund: $${refundAmount}`);
}
```

**Success Metric:** 2 enterprise customers opt into insurance

---

## 💰 REVENUE PROJECTIONS

### Week 1 (Trust Foundation)
- No revenue impact yet
- Trust metrics improve
- Pilot customers give feedback

### Week 2 (Watermark)
- 3 enterprise demos booked
- Sales cycle shortens by 30%

### Week 3 (Tiering)
- 5 Pro upgrades: 5 × $49 = **$245 MRR**
- 1 Enterprise: **$833 MRR** ($10K/yr)
- **Total: $1,078 MRR**

### Week 4 (Insurance)
- 2 insurance adoptions: +2% on $2K = **$40 MRR**
- **Total: $1,118 MRR**

### Month 2 Projection
- 20 Pro customers: **$980 MRR**
- 3 Enterprise: **$2,500 MRR**
- **Total: $3,480 MRR**

### Month 3 Projection
- 50 Pro customers: **$2,450 MRR**
- 10 Enterprise: **$8,333 MRR**
- **Total: $10,783 MRR** 🎯

**Target: $10K MRR by end of Week 12**

---

## 📊 SUCCESS METRICS

### Week 1 KPIs
- [ ] 0 duplicate charges in ledger
- [ ] 8/10 pilot customers trust transparency
- [ ] 0 billing disputes

### Week 2 KPIs
- [ ] Watermark verified by auditor
- [ ] 3 enterprise demos booked
- [ ] Sales deck updated

### Week 3 KPIs
- [ ] 5 Pro tier upgrades
- [ ] 1 Enterprise deal closed
- [ ] **$1,000+ MRR**

### Week 4 KPIs
- [ ] 2 insurance adoptions
- [ ] 0 refunds issued (savings > 85%)
- [ ] **$1,118 MRR total**

---

## 🚨 RISKS & MITIGATIONS

### Risk 1: Legal issues with "insurance" language
**Mitigation:** Legal review before launch, call it "savings guarantee" instead if needed

### Risk 2: Customers don't trust the watermark
**Mitigation:** Get independent auditor to verify, publish verification report

### Risk 3: Enterprise customers hesitate on pricing
**Mitigation:** Offer 1-month free trial with full features, prove savings first

### Risk 4: Refunds eat into revenue
**Mitigation:** Only offer insurance if confident in 90%+ savings rate

---

## 🛠️ TECHNICAL DEPENDENCIES

### Required Before Week 1:
- [ ] Stripe account set up
- [ ] Legal review of insurance language
- [ ] 10 pilot customers recruited
- [ ] Audit trail logging enabled

### Required Before Week 2:
- [ ] Cryptography library (crypto.createHmac)
- [ ] Secret key for HMAC signatures (env var)
- [ ] External auditor contact

### Required Before Week 3:
- [ ] Stripe subscription tiers configured
- [ ] Upgrade flow UI designed
- [ ] Email templates (welcome, upgrade, invoice)

---

## 📞 NEXT IMMEDIATE ACTIONS

### TODAY (Right Now):
1. ✅ **Approve this plan** - DONE
2. **Choose deployment target:**
   - [ ] Build locally first, deploy to Railway later
   - [ ] Deploy to Railway now (you have env file open)
   - [ ] Build and test simultaneously

3. **Start Week 1 Feature 1:**
   - [ ] Create `tco_query_ledger` table
   - [ ] Test query hashing
   - [ ] Deploy to production

**Which do you want to do first?**

A. Start building Week 1 features NOW (local development)
B. Deploy current TCO system to Railway FIRST, then build
C. Do both in parallel (risky but fast)

---

**Council Decision: APPROVED ✅**
**Timeline: 4 weeks**
**Target: $10K MRR**
**Risk Level: Medium**
**Confidence: High**

Ready to build? 🚀
