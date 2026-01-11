# ⚡ QUICK START: Integrate Overnight Build

**Time to integrate:** ~5 minutes

---

## ✅ STEP 1: Run Database Migration (2 minutes)

```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration
\i migrations/004_sales_coaching_tables.sql

# Verify tables were created
\dt

# You should see these NEW tables:
# - sales_call_recordings
# - coaching_clips
# - sales_technique_patterns
# - coaching_sessions
# - self_programming_enhancements
# - code_review_history

# Exit psql
\q
```

---

## ✅ STEP 2: Add Routes to server.js (1 minute)

### 2a. Add import at the top of server.js

Find the import section (around line 44) and add:

```javascript
import { registerBoldTrailCoachingRoutes } from './routes/boldtrail-coaching-routes.js';
```

### 2b. Register routes

Find where other routes are registered (around line 6594) and add:

```javascript
// Register BoldTrail coaching routes
registerBoldTrailCoachingRoutes(app, pool, callCouncilWithFailover, requireKey);
```

---

## ✅ STEP 3: Restart Server (30 seconds)

```bash
# Stop current server (Ctrl+C if running)

# Start server
node server.js

# You should see:
# ✅ [ROUTES] BoldTrail Coaching routes registered

# Server is ready!
```

---

## ✅ STEP 4: Test It Works (2 minutes)

### Test 1: Start a Recording

```bash
curl -X POST http://localhost:8080/api/v1/boldtrail/start-recording \
  -H "x-command-key: local-dev-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": 1,
    "recording_type": "phone_call"
  }'

# Expected response:
# {
#   "ok": true,
#   "call_id": "call_1736506200_abc123",
#   "recording_id": 1,
#   "message": "Recording started"
# }
```

### Test 2: Stop and Analyze Recording

```bash
curl -X POST http://localhost:8080/api/v1/boldtrail/stop-recording \
  -H "x-command-key: local-dev-key-12345" \
  -H "Content-Type": application/json" \
  -d '{
    "call_id": "call_1736506200_abc123",
    "transcript": "Agent: Hello, this is John from Realty Inc. How can I help you? Client: Hi, I am looking for a 3 bedroom house. Agent: Great! Let me interrupt you there... Client: I was just saying... Agent: Sorry, anyway, we have lots of houses.",
    "duration": 120
  }'

# Expected response:
# {
#   "ok": true,
#   "analysis": {
#     "overall_score": 6.5,
#     "techniques_detected": {
#       "good": [...],
#       "poor": [
#         {
#           "technique": "Interrupting Client",
#           "severity": "high",
#           "example": "Let me interrupt you there..."
#         }
#       ]
#     },
#     "coaching_suggestions": [
#       "Let the client finish their thoughts before responding",
#       ...
#     ]
#   }
# }
```

### Test 3: Get Bad Habits

```bash
curl "http://localhost:8080/api/v1/boldtrail/technique-patterns/1?pattern_type=bad_habit" \
  -H "x-command-key: local-dev-key-12345"

# Expected response:
# {
#   "ok": true,
#   "bad_habits": [
#     {
#       "technique_name": "Interrupting Client",
#       "frequency": 1,
#       "last_detected": "2026-01-10T..."
#     }
#   ]
# }
```

---

## ✅ STEP 5: Use in BoldTrail UI (1 minute)

### Option A: Test via Browser

```
1. Open: http://localhost:8080/boldtrail?key=local-dev-key-12345
2. Click Settings tab
3. Enter your email and name
4. Click "Save Settings"
5. You'll see a floating 🎯 button (bottom right)
6. Click it to open Sales Coaching overlay
7. Click "Start Recording"
8. Should see recording timer start
```

### Option B: Direct API Usage

The coaching overlay automatically calls the new endpoints when you:
- Click "Start Recording" → calls `/api/v1/boldtrail/start-recording`
- Click "Stop Recording" → calls `/api/v1/boldtrail/stop-recording`
- Click "✓ Mark Good Moment" → calls `/api/v1/boldtrail/mark-moment`
- Click "⚠ Mark for Coaching" → calls `/api/v1/boldtrail/mark-moment`

---

## 🎯 DONE!

You now have:
- ✅ Sales call recording and analysis
- ✅ Bad habit tracking
- ✅ Real-time coaching suggestions
- ✅ Coaching clip management
- ✅ Multi-model code review system
- ✅ Auto-test generation system

---

## 🚀 NEXT: Use the New Capabilities

### Use Code Review in Self-Programming

Add to your self-programming function:

```javascript
import { MultiModelCodeReview } from './core/multi-model-code-review.js';

const reviewer = new MultiModelCodeReview(callCouncilWithFailover);

// After generating code, before deploying:
const review = await reviewer.reviewCode(generatedCode, {
  filePath: targetFile,
  purpose: instruction
});

if (review.approved && review.overallScore >= 8.0) {
  // Deploy
  fs.writeFileSync(targetFile, generatedCode);
} else {
  // Fix issues and regenerate
  console.log('Issues:', review.criticalIssues);
}
```

### Use Test Generation

```javascript
import { AutoTestGenerator } from './core/auto-test-generator.js';

const testGen = new AutoTestGenerator(callCouncilWithFailover);

const tests = await testGen.generateTests(functionCode);
// Write tests to file
fs.writeFileSync('tests/myFunction.test.js', formatTests(tests));
```

---

## 📚 Full Documentation

See `docs/OVERNIGHT_BUILD_REPORT_2026-01-10.md` for complete documentation.

---

**That's it! Everything is ready to use.** 🎉
