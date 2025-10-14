# AUTONOMOUS BUILD TASK - REVENUE SYSTEM

## PRIORITY: CRITICAL
## DEADLINE: Complete before human returns from travel
## ASSIGNED: Any available pod

---

## OBJECTIVE
Fix and deploy the complete revenue system (sales-coaching + billing) that exists in the codebase but isn't working correctly.

---

## CONTEXT
Human pushed files but system isn't serving them. The code exists in:
- `/public/sales-coaching.html` (purple gradient landing page)
- `/public/welcome.html` (success page)
- `/src/routes/billing.js` (Stripe integration)
- `server.js` (should have billing routes)

**Current Issue:** Health endpoint shows old version, landing page returns 404.

---

## TASKS (Execute in Order)

### Task 1: Verify Current State (5 min)
```bash
# Check what version is deployed
curl https://robust-magic-production.up.railway.app/healthz

# Should return: {"version":"v7-billing-integrated"}
# If it doesn't, server.js didn't deploy correctly
```

**Action:** If version is wrong, investigate Railway deployment logs and fix any errors.

---

### Task 2: Test Static File Serving (2 min)
```bash
# Try to access the landing page
curl https://robust-magic-production.up.railway.app/sales-coaching.html

# Should return HTML content with "Transform Your Sales Team"
# If 404 or 502, static file serving is broken
```

**Action:** If broken, verify in `server.js`:
- `app.use(express.static(path.join(__dirname, "public")));` exists
- It's placed BEFORE route handlers
- `public/` directory exists in deployed code

---

### Task 3: Test Billing API (2 min)
```bash
# Test baseline signup
curl -X POST https://robust-magic-production.up.railway.app/api/v1/billing/start-baseline \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","baseline_commission":5000}'

# Should return: {"ok":true,"success":true}
# If error, billing routes aren't connected
```

**Action:** If broken, verify in `server.js`:
- Billing routes are imported and mounted
- Database `customers` table exists
- No CORS issues blocking requests

---

### Task 4: Create Test Customer (1 min)
**Once endpoints work, create a test customer:**

Visit: `https://robust-magic-production.up.railway.app/sales-coaching.html`
- Fill form with test data
- Submit
- Should redirect to `/welcome.html`
- Verify database record created

---

### Task 5: Document & Report (5 min)
**Create:** `reports/revenue-system-status.md`
```markdown
# Revenue System Deployment Status

## Test Results
- [ ] Health endpoint shows v7-billing-integrated
- [ ] Landing page loads (sales-coaching.html)
- [ ] Welcome page loads (welcome.html)
- [ ] Baseline signup API works
- [ ] Test customer created in database

## Issues Found
[List any problems discovered]

## Fixes Applied
[List what you changed to make it work]

## URLs
- Landing: https://robust-magic-production.up.railway.app/sales-coaching.html
- Health: https://robust-magic-production.up.railway.app/healthz

## Next Steps for Human
1. Test the landing page yourself
2. Set up Stripe webhook (requires Stripe dashboard access)
3. Share landing page to start collecting real signups
```

---

## SUCCESS CRITERIA
- ✅ All 5 test checkboxes pass
- ✅ Report file created and committed
- ✅ System ready for human to test on return

---

## AUTHORIZATION
This task is **auto-merge approved** if all tests pass. No human review needed.

Create PR with:
- Title: "fix: revenue system deployment"
- All fixes needed to make tests pass
- Report file documenting results

**Estimated Time:** 15-30 minutes
**Budget:** Max $2 for OpenAI calls if needed

---

## NOTES
- Human is traveling with limited internet
- This is revenue-critical - prioritize above other tasks
- If blocked, document blocker in report and move to next task
- Don't wait for human approval - merge if tests pass
