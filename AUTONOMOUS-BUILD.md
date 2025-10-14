# AUTONOMOUS BUILD - REVENUE SYSTEM FIX

## PRIORITY: CRITICAL
## DEADLINE: Before human returns
## BUDGET: Max $2

---

## OBJECTIVE
Fix and verify the revenue system deployment. All code exists but isn't working.

---

## TASKS

### 1. Verify Health Endpoint
```bash
curl https://robust-magic-production.up.railway.app/healthz
```
**Expected:** `{"version":"v7-billing-integrated"}`
**If wrong:** Check Railway logs, fix deployment

### 2. Test Landing Page
```bash
curl https://robust-magic-production.up.railway.app/sales-coaching.html
```
**Expected:** HTML with "Transform Your Sales Team"
**If 404:** Fix static file serving in server.js

### 3. Test Billing API
```bash
curl -X POST https://robust-magic-production.up.railway.app/api/v1/billing/start-baseline \
  -H "Content-Type: application/json" \
  -d '{"email":"test@pod.com","baseline_commission":5000}'
```
**Expected:** `{"ok":true,"success":true}`
**If error:** Fix billing routes

### 4. Create Test Customer
Visit landing page, submit form, verify redirect to welcome.html

### 5. Create Report
File: `reports/deployment-status.md`

Document:
- Which tests passed
- What was broken
- What was fixed
- URLs for human to test

---

## SUCCESS CRITERIA
- All 4 tests pass
- Report created
- PR merged if tests pass

## AUTO-MERGE APPROVED
No human review needed if all tests pass.
