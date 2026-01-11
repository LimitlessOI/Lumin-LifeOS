# ⚡ Quick Integration - Enhanced Safe AI Council

**Goal:** Enhance your existing `safeAICouncil` function with 2029 lessons in 15 minutes.

---

## 🎯 TWO INTEGRATION OPTIONS

### **Option 1: Drop-in Replacement (5 minutes)**
Keep your exact function signature, add tracking.

### **Option 2: Full Class Version (15 minutes)**
More features, better organization.

---

## ⚡ OPTION 1: DROP-IN REPLACEMENT (EASIEST)

**Before (your current code):**
```javascript
const safeAICouncil = async (model, prompt, customerId, tier = 'free_tier') => {
  await usageTracker.checkLimit(customerId, tier);

  const startTime = Date.now();
  try {
    const response = await tier0.queryModelStream(model, prompt);
    const tokens = prompt.length + response.length;
    const cost = 0;

    await usageTracker.logUsage(customerId, model, tokens, cost);
    return response;
  } catch (error) {
    console.error(`AI call failed: ${error.message}`);
    throw new Error('AI service temporarily unavailable');
  }
};
```

**After (enhanced with 2029 lessons):**
```javascript
import { createSafeAICouncilFunction } from './core/enhanced-safe-ai-council.js';

// Initialize enhanced version
const safeAICouncil = createSafeAICouncilFunction(tier0, pool, {
  dailyBudget: 10,      // $10/day for paid APIs (if you add them later)
  monthlyBudget: 200    // $200/month for paid APIs
});

// Use EXACTLY the same as before
const response = await safeAICouncil(
  'deepseek',
  'Review this code: ...',
  'customer123',
  'free_tier'
);

// NEW: Get stats whenever you want
const stats = safeAICouncil.getStats();
console.log(stats);
// {
//   totalCalls: 1234,
//   successfulCalls: 1220,
//   failedCalls: 14,
//   successRate: 98.87,
//   avgResponseTime: 234,
//   budget: { daily: { used: 0, remaining: 10 } }
// }
```

**That's it!** Your existing code works unchanged, but now tracks:
- ✅ Success/failure rates
- ✅ Response times
- ✅ Budget status
- ✅ Cost per capability (when you add metadata)

---

## 🚀 OPTION 2: FULL CLASS VERSION (RECOMMENDED)

More features, better for integrating with your 20 capabilities.

### **Step 1: Initialize (5 minutes)**

```javascript
import { Tier0Council } from './core/tier0-council.js';
import { createEnhancedSafeAICouncil } from './core/enhanced-safe-ai-council.js';

// Initialize Tier 0 (your existing Ollama setup)
const tier0 = new Tier0Council();

// Initialize enhanced safe AI council
const safeAI = createEnhancedSafeAICouncil(tier0, pool, {
  dailyBudget: 10,      // $10/day for paid APIs (conservative)
  monthlyBudget: 200,   // $200/month for paid APIs
  alertThreshold: 0.80  // Alert at 80% budget
});

console.log('✅ Enhanced Safe AI Council initialized');
```

### **Step 2: Create Wrapper for Capabilities (5 minutes)**

```javascript
// Create wrapper that your capabilities expect
export const aiCouncilWrapper = async (model, prompt, options = {}) => {
  return safeAI.call(model, prompt, options);
};

// Export for dashboard/monitoring
export const getAIDashboard = () => safeAI.getDashboard();
export const getAICostReport = (days) => safeAI.getCostReport(days);
export const checkAIHealth = () => safeAI.checkHealth();
```

### **Step 3: Initialize Your Capabilities (5 minutes)**

```javascript
import { createSelfHealingSystem } from './core/self-healing-code.js';
import { MultiModelCodeReviewer } from './core/multi-model-code-review.js';
import { SecurityScanner } from './core/security-scanner.js';
import { AutoTestGenerator } from './core/auto-test-generator.js';
import { PredictiveRefactoring } from './core/predictive-refactoring.js';

// Initialize with tracked AI council
const selfHealing = createSelfHealingSystem(aiCouncilWrapper, pool);
const codeReviewer = new MultiModelCodeReviewer(aiCouncilWrapper, pool);
const securityScanner = new SecurityScanner(aiCouncilWrapper, pool);
const testGenerator = new AutoTestGenerator(aiCouncilWrapper, pool);
const refactoringPredictor = new PredictiveRefactoring(aiCouncilWrapper, pool);

console.log('✅ All capabilities initialized with tracked AI council');
```

### **Step 4: Update Capability Calls (Optional but Recommended)**

Add capability tracking inside each capability:

**Example - Self-Healing Code:**
```javascript
// In core/self-healing-code.js
async analyzeError(errorData) {
  const prompt = `Analyze this error: ${errorData.message}`;

  // BEFORE (no tracking)
  const response = await this.aiCouncil('deepseek', prompt);

  // AFTER (with capability tracking)
  const response = await this.aiCouncil('deepseek', prompt, {
    capability: 'self-healing-code',
    customerId: 'INTERNAL',
    tier: 'internal'
  });

  return this.parseFixSuggestion(response);
}
```

**Example - Code Review:**
```javascript
// In core/multi-model-code-review.js
async reviewWithDeepSeek(code, context) {
  const prompt = `Review this code:\n${code}`;

  const response = await this.aiCouncil('deepseek', prompt, {
    capability: 'multi-model-code-review',
    customerId: 'INTERNAL',
    tier: 'internal'
  });

  return this.parseReview(response);
}
```

---

## 📊 MONITORING DASHBOARD

Add endpoints to monitor your AI usage:

```javascript
// In server.js or routes file

// Real-time AI dashboard
app.get('/api/v1/admin/ai-dashboard', requireAuth, (req, res) => {
  const dashboard = getAIDashboard();
  res.json(dashboard);
});

// Output:
// {
//   stats: {
//     totalCalls: 5234,
//     successfulCalls: 5220,
//     failedCalls: 14,
//     successRate: 99.73,
//     avgResponseTime: 234,
//     totalCost: 0
//   },
//   budget: {
//     today: {
//       calls: 234,
//       cost: 0,
//       budget: 10,
//       remaining: 10,
//       percentageUsed: 0
//     }
//   },
//   topExpensive: []  // Empty because all calls are free!
// }

// AI health check
app.get('/api/v1/admin/ai-health', requireAuth, async (req, res) => {
  const health = await checkAIHealth();
  res.json(health);
});

// Output:
// {
//   healthy: true,
//   tier0Status: 'operational',
//   message: 'Free Ollama models working'
// }

// 30-day cost report
app.get('/api/v1/admin/ai-cost-report', requireAuth, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const report = await getAICostReport(days);
  res.json(report);
});
```

---

## 🧪 TESTING

### **Test 1: Basic Call (Free Model)**
```javascript
const response = await aiCouncilWrapper('deepseek', 'Say hello', {
  capability: 'test',
  customerId: 'TEST',
  tier: 'internal'
});

console.log(response); // Should work
console.log(safeAI.getStats()); // Check stats updated
```

### **Test 2: Failed Call**
```javascript
try {
  // Use non-existent model
  await aiCouncilWrapper('nonexistent-model', 'Test', {
    capability: 'test',
    customerId: 'TEST'
  });
} catch (error) {
  console.log('✅ Error caught correctly:', error.message);
  console.log(safeAI.getStats()); // failedCalls should increase
}
```

### **Test 3: Dashboard**
```javascript
const dashboard = safeAI.getDashboard();
console.log(JSON.stringify(dashboard, null, 2));

// Should show:
// - Total calls
// - Success rate
// - Average response time
// - Budget status (should be $0 cost, all free!)
```

### **Test 4: Health Check**
```javascript
const health = await safeAI.checkHealth();
console.log(health);

// Should show:
// { healthy: true, tier0Status: 'operational', message: 'Free Ollama models working' }
```

---

## 📈 MONITORING QUERIES

### **See Usage by Capability:**
```sql
SELECT
  capability,
  COUNT(*) as calls,
  SUM(CASE WHEN cost = 0 THEN 1 ELSE 0 END) as free_calls,
  SUM(CASE WHEN cost > 0 THEN 1 ELSE 0 END) as paid_calls,
  SUM(cost) as total_cost,
  AVG(response_time) as avg_response_time
FROM ai_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY capability
ORDER BY calls DESC;
```

### **See Success Rates:**
```sql
SELECT
  capability,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE error IS NULL) as successful_calls,
  COUNT(*) FILTER (WHERE error IS NOT NULL) as failed_calls,
  (COUNT(*) FILTER (WHERE error IS NULL)::float / COUNT(*)::float * 100) as success_rate
FROM ai_usage
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY capability
ORDER BY success_rate ASC;
```

### **See Response Times:**
```sql
SELECT
  capability,
  AVG(response_time) as avg_ms,
  MIN(response_time) as min_ms,
  MAX(response_time) as max_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_ms
FROM ai_usage
WHERE created_at > NOW() - INTERVAL '7 days'
  AND response_time > 0
GROUP BY capability
ORDER BY avg_ms DESC;
```

---

## ✅ VERIFICATION CHECKLIST

After integration, verify:

- [ ] Database migration applied (`010_enhanced_ai_usage_tracking.sql`)
- [ ] Enhanced safe AI council initialized
- [ ] All AI calls go through tracked wrapper
- [ ] Stats updating after each call
- [ ] Dashboard endpoint returns data
- [ ] Health check passes
- [ ] Cost report generates
- [ ] Success rate tracked correctly
- [ ] Response times tracked
- [ ] All calls show cost = $0 (free Ollama)

---

## 🎯 NEXT STEPS

1. **Integrate** (15 min using Option 2)
2. **Test** (5 min - run all 4 tests)
3. **Monitor** (1 week - watch dashboard)
4. **Optimize** (ongoing - improve slow capabilities)

Then you're ready to build all 20 capabilities with full cost visibility!

---

## 💡 PRO TIPS

### **Tip 1: Always Pass Capability Name**
```javascript
// ❌ Bad: No capability tracking
const response = await aiCouncilWrapper('deepseek', prompt);

// ✅ Good: Track which capability
const response = await aiCouncilWrapper('deepseek', prompt, {
  capability: 'code-review',
  customerId: 'INTERNAL'
});
```

### **Tip 2: Check Dashboard Daily**
```javascript
// Add to your morning routine
const dashboard = safeAI.getDashboard();
console.log(`
📊 DAILY AI USAGE:
Calls: ${dashboard.stats.totalCalls}
Success Rate: ${dashboard.stats.successRate}%
Avg Response Time: ${dashboard.stats.avgResponseTime.toFixed(0)}ms
Cost: $${dashboard.budget.today.cost.toFixed(2)}
`);
```

### **Tip 3: Monitor Free Model Health**
```javascript
// Check hourly (or in cron)
const health = await safeAI.checkHealth();
if (!health.healthy) {
  console.error('⚠️ Free Ollama models degraded!');
  // Alert your team
}
```

### **Tip 4: Use Descriptive Capability Names**
```javascript
// ❌ Bad: Generic name
capability: 'code'

// ✅ Good: Specific name
capability: 'multi-model-code-review'

// ✅ Good: With action
capability: 'self-healing-code-fix-generator'
```

---

**That's it! Your free-first AI strategy now has full tracking and monitoring.**

**Choose Option 1 for quick start, Option 2 for full features.**

🚀
