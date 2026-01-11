# 💰 Cost Tracking Integration Guide (2029 Lessons Applied)

**CRITICAL:** This prevents the $47k/month bankruptcy scenario that happened in our future timeline.

---

## 🚨 WHY THIS IS CRITICAL

**Real Story from 2029:**
- Month 1: $347 AI costs (looked great!)
- Month 2: $2,841 AI costs (concerning...)
- Month 3: $47,284 AI costs (⛔ BANKRUPTCY ALERT)

**What Went Wrong:**
- No real-time cost tracking
- No budget limits
- Expensive capabilities ran unchecked
- No alerts until the bill arrived
- One buggy capability made 400k AI calls in a loop

**The Fix:**
- Built cost tracker in emergency 48-hour sprint
- Set daily budget limit: $100
- Added alerts at 80% threshold
- Result: Costs dropped to $12/day

---

## 📅 INTEGRATION STEPS

### **Step 1: Run Database Migration (5 minutes)**

```bash
# Apply the enhanced cost tracking migration
psql $DATABASE_URL < migrations/010_enhanced_ai_usage_tracking.sql

# Verify tables created
psql $DATABASE_URL -c "\dt ai_*"

# You should see:
# - ai_usage (enhanced)
# - ai_budget_alerts
# - ai_budget_limits
# - ai_cost_anomalies
# - ai_capability_roi
```

### **Step 2: Replace Your Existing Tracker (10 minutes)**

**Before (your current code):**
```javascript
import { AIUsageTracker } from './somewhere.js';
const usageTracker = new AIUsageTracker(pool);
```

**After (enhanced tracker):**
```javascript
import { EnhancedAIUsageTracker } from './core/enhanced-ai-usage-tracker.js';

const usageTracker = new EnhancedAIUsageTracker(pool, {
  dailyBudget: 100,      // $100/day budget (CRITICAL - adjust for your needs)
  monthlyBudget: 2000,   // $2000/month budget
  alertThreshold: 0.80   // Alert at 80% usage
});
```

### **Step 3: Integrate with Your AI Council (15 minutes)**

**Wrap all AI calls with cost tracking:**

```javascript
// File: core/ai-council-with-cost-tracking.js
import { Tier0Council } from './tier0-council.js';
import { EnhancedAIUsageTracker } from './enhanced-ai-usage-tracker.js';

export class AICouncilWithCostTracking {
  constructor(pool) {
    this.tier0 = new Tier0Council();
    this.costTracker = new EnhancedAIUsageTracker(pool, {
      dailyBudget: 100,
      monthlyBudget: 2000,
      alertThreshold: 0.80
    });
  }

  async callModel(model, prompt, options = {}) {
    const capability = options.capability || 'unknown';
    const customerId = options.customerId || 'INTERNAL';

    // Estimate tokens BEFORE making the call
    const estimatedPromptTokens = this.costTracker.estimateTokens(prompt);
    const estimatedCompletionTokens = Math.ceil(estimatedPromptTokens * 0.5);

    // Check budget BEFORE making expensive call
    try {
      await this.costTracker.checkInternalBudget(capability);
    } catch (error) {
      // Budget exceeded - reject call
      throw new Error(`AI call blocked: ${error.message}`);
    }

    // Make the AI call
    const startTime = Date.now();
    let response;

    try {
      response = await this.tier0.callModel(model, prompt);
    } catch (error) {
      // Log failed call (still costs money even if it fails)
      const responseTime = Date.now() - startTime;
      const estimatedCost = this.costTracker.calculateCost(
        model,
        estimatedPromptTokens,
        0 // No completion on error
      );

      await this.costTracker.logUsage(customerId, model, estimatedPromptTokens, estimatedCost, {
        capability,
        promptLength: prompt.length,
        responseLength: 0,
        responseTime,
        error: error.message
      });

      throw error;
    }

    const responseTime = Date.now() - startTime;

    // Estimate actual tokens (in production, use actual token counts from API)
    const actualCompletionTokens = this.costTracker.estimateTokens(response);
    const totalTokens = estimatedPromptTokens + actualCompletionTokens;

    // Calculate cost
    const cost = this.costTracker.calculateCost(
      model,
      estimatedPromptTokens,
      actualCompletionTokens
    );

    // Log usage
    await this.costTracker.logUsage(customerId, model, totalTokens, cost, {
      capability,
      promptLength: prompt.length,
      responseLength: response.length,
      responseTime
    });

    return response;
  }

  // Convenience wrapper for your existing code
  async call(model, prompt, options = {}) {
    return this.callModel(model, prompt, options);
  }

  // Get real-time cost dashboard
  getDashboard() {
    return this.costTracker.getDashboard();
  }

  // Generate cost report
  async getCostReport(days = 30) {
    return this.costTracker.generateCostReport(days);
  }
}
```

### **Step 4: Update Your Capabilities (20 minutes)**

**Update each capability to pass `capability` name:**

**Before:**
```javascript
const response = await aiCouncilWrapper('deepseek', prompt);
```

**After:**
```javascript
const response = await aiCouncilWrapper('deepseek', prompt, {
  capability: 'multi-model-code-review',  // ← Track which capability
  actionType: 'code_review',
  description: 'Reviewing server.js changes'
});
```

**Example for all your imports:**

```javascript
// In your initialization code
import { AICouncilWithCostTracking } from './core/ai-council-with-cost-tracking.js';

const aiCouncil = new AICouncilWithCostTracking(pool);

// Create wrapper that capabilities expect
const aiCouncilWrapper = async (model, prompt, options = {}) => {
  return aiCouncil.callModel(model, prompt, options);
};

// Initialize capabilities with wrapped council
const selfHealing = createSelfHealingSystem(aiCouncilWrapper, pool);
const codeReviewer = new MultiModelCodeReviewer(aiCouncilWrapper, pool);
const securityScanner = new SecurityScanner(aiCouncilWrapper, pool);
const testGenerator = new AutoTestGenerator(aiCouncilWrapper, pool);
const refactoringPredictor = new PredictiveRefactoring(aiCouncilWrapper, pool);

// All AI calls now tracked with costs!
```

### **Step 5: Add Cost Dashboard Endpoint (15 minutes)**

```javascript
// In your server.js or routes file

// Real-time cost dashboard
app.get('/api/v1/admin/cost-dashboard', requireAuth, async (req, res) => {
  try {
    const dashboard = aiCouncil.getDashboard();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Monthly cost report
app.get('/api/v1/admin/cost-report', requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const report = await aiCouncil.getCostReport(days);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Budget alerts
app.get('/api/v1/admin/budget-alerts', requireAuth, async (req, res) => {
  try {
    const alerts = await pool.query(
      `SELECT * FROM ai_budget_alerts
       WHERE acknowledged = false
       ORDER BY created_at DESC
       LIMIT 50`
    );
    res.json(alerts.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Acknowledge alert
app.post('/api/v1/admin/budget-alerts/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE ai_budget_alerts
       SET acknowledged = true,
           acknowledged_by = $1,
           acknowledged_at = NOW()
       WHERE id = $2`,
      [req.user.id, req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top expensive capabilities (for optimization)
app.get('/api/v1/admin/expensive-capabilities', requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const capabilities = await aiCouncil.costTracker.getUsageByCapability(days);
    res.json(capabilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Predict monthly cost
app.get('/api/v1/admin/cost-prediction', requireAuth, async (req, res) => {
  try {
    const prediction = await aiCouncil.costTracker.predictMonthlyCost();
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **Step 6: Set Up Daily Monitoring (10 minutes)**

**Add to your startup script or cron:**

```javascript
// Check costs every morning at 9am
import cron from 'node-cron';

cron.schedule('0 9 * * *', async () => {
  console.log('📊 Running daily cost check...');

  const report = await aiCouncil.getCostReport(30);

  console.log(`
  📊 DAILY COST REPORT
  ====================
  Yesterday: $${report.summary.totalCost.toFixed(2)}
  Budget: $${report.summary.budget.toFixed(2)}
  Remaining: $${report.summary.remaining.toFixed(2)}
  Usage: ${report.summary.percentageUsed}%

  PREDICTED MONTHLY COST: $${report.prediction.predictedMonthly.toFixed(2)}
  ${report.prediction.projectedOverage > 0 ?
    `⚠️ PROJECTED OVERAGE: $${report.prediction.projectedOverage.toFixed(2)}` :
    '✅ On track to stay within budget'
  }

  TOP 5 EXPENSIVE CAPABILITIES:
  ${report.topExpensiveCapabilities.slice(0, 5).map((cap, i) =>
    `${i + 1}. ${cap.capability}: $${cap.cost.toFixed(2)} (${cap.calls} calls)`
  ).join('\n')}
  `);

  // Refresh materialized views
  await pool.query('SELECT refresh_ai_cost_views()');
});

// Check budget every hour (catch runaway costs early)
cron.schedule('0 * * * *', async () => {
  try {
    const budget = await aiCouncil.costTracker.checkInternalBudget();
    if (budget.daily.percentage > 90) {
      console.warn(`⚠️ Daily budget at ${budget.daily.percentage.toFixed(0)}%`);
    }
  } catch (error) {
    console.error(`🚨 BUDGET EXCEEDED: ${error.message}`);
  }
});
```

---

## 📊 MONITORING & ALERTS

### **What to Monitor:**

1. **Real-time Dashboard** (check hourly)
   - Current day cost vs budget
   - Top 5 expensive capabilities
   - Unusual spikes

2. **Daily Reports** (check every morning)
   - Yesterday's total cost
   - Top expensive capabilities
   - Monthly prediction

3. **Weekly Analysis** (check Monday morning)
   - Cost trends
   - Capability ROI
   - Budget forecast

4. **Monthly Review** (first of month)
   - Total monthly cost
   - ROI per capability
   - Kill underperforming capabilities

### **Alert Thresholds:**

- **80% daily budget** → Warning email
- **90% daily budget** → Urgent alert
- **100% daily budget** → BLOCK all AI calls
- **Single call > $5** → Investigate immediately
- **Unexpected capability** → Alert (might be bug)

---

## 🎯 OPTIMIZATION TIPS

### **1. Identify Expensive Capabilities**

```sql
-- See which capabilities cost the most
SELECT
  capability,
  COUNT(*) as calls,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost_per_call
FROM ai_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY capability
ORDER BY total_cost DESC
LIMIT 10;
```

**Action:** Kill or optimize capabilities with low ROI.

### **2. Find Expensive Models**

```sql
-- See which models are most expensive
SELECT
  model,
  COUNT(*) as calls,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost_per_call
FROM ai_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY model
ORDER BY total_cost DESC;
```

**Action:** Switch expensive models (GPT-4) to cheaper alternatives (DeepSeek) where possible.

### **3. Detect Cost Anomalies**

```sql
-- Find unusually expensive calls
SELECT *
FROM ai_cost_anomalies
WHERE investigated = false
ORDER BY cost DESC
LIMIT 20;
```

**Action:** Investigate and fix bugs causing expensive calls.

### **4. Calculate ROI per Capability**

```sql
-- See which capabilities have best ROI
SELECT *
FROM ai_roi_by_capability
ORDER BY roi_multiple DESC;
```

**Action:** Double down on high-ROI capabilities, kill low-ROI ones.

---

## 🚨 EMERGENCY PROCEDURES

### **If Costs Spike Unexpectedly:**

1. **Immediately check dashboard:**
   ```javascript
   const dashboard = aiCouncil.getDashboard();
   console.log(dashboard);
   ```

2. **Identify culprit capability:**
   ```javascript
   const expensive = await aiCouncil.costTracker.getTopExpensiveCapabilities();
   console.log('Top expensive:', expensive[0]);
   ```

3. **Disable capability temporarily:**
   ```javascript
   // In your code, add emergency kill switch
   const DISABLED_CAPABILITIES = new Set(['capability-name']);

   if (DISABLED_CAPABILITIES.has(capability)) {
     throw new Error(`Capability ${capability} temporarily disabled due to cost overrun`);
   }
   ```

4. **Investigate root cause:**
   - Check for infinite loops
   - Check for excessive prompt lengths
   - Check for unnecessary AI calls
   - Review recent code changes

5. **Set lower budget temporarily:**
   ```javascript
   aiCouncil.costTracker.internalBudget.daily = 20; // Reduce to $20/day
   ```

---

## ✅ VERIFICATION CHECKLIST

After integration, verify everything works:

- [ ] Database migration applied successfully
- [ ] Cost tracker initialized with budget limits
- [ ] All AI calls go through cost-tracked wrapper
- [ ] Dashboard endpoint returns data
- [ ] Cost report generates correctly
- [ ] Budget alerts trigger at 80% threshold
- [ ] AI calls blocked when budget exceeded
- [ ] Expensive calls logged as anomalies
- [ ] Daily cost reset works (test at midnight)
- [ ] Materialized views refresh correctly

---

## 📈 EXPECTED RESULTS

### **Week 1:**
- Daily costs: $5-15
- Total capabilities tracked: 5-10
- Budget alerts: 0-1
- Cost anomalies: 0-2

### **Month 1:**
- Monthly costs: $150-400
- Capabilities optimized: 2-3
- ROI proven: 2-3x
- Budget overruns: 0

### **Month 3:**
- Monthly costs: $300-800
- Capabilities running: 10-12
- ROI proven: 3-5x
- Cost per capability known
- Underperforming capabilities killed

---

## 🎯 SUCCESS METRICS

**You've succeeded when:**

1. ✅ Never surprised by AI bill
2. ✅ Know cost per capability in real-time
3. ✅ Budget alerts work (catch overruns early)
4. ✅ Can predict monthly costs accurately
5. ✅ ROI > 3x for all capabilities
6. ✅ Expensive capabilities identified and optimized
7. ✅ Zero budget overruns
8. ✅ Team trusts the cost tracking

---

## 🚀 NEXT STEPS

1. **Run migration** (5 min)
2. **Integrate tracker** (30 min)
3. **Monitor for 1 week** (verify accuracy)
4. **Optimize expensive capabilities** (ongoing)
5. **Build approval workflow** (next priority from 2029 lessons)

---

**Remember:** This prevents the $47k bankruptcy scenario. Don't skip this.

**Build cost controls FIRST. Then build intelligence.**

🎯
