# URGENT: Complete Revenue System Deployment

## Priority: CRITICAL
## Assigned: Bravo (Revenue Pod)
## Deadline: Complete before human returns

---

## CONTEXT
Human pushed incomplete deployment. Files exist in GitHub but service isn't serving them correctly. Need to fix and verify end-to-end flow.

## TASKS

### Task 1: Verify File Structure
**Check that these files exist and are correct:**
- `public/sales-coaching.html` (should be ~8.5 KB, purple gradient landing page)
- `public/welcome.html` (success page after signup)
- `src/routes/billing.js` (Stripe integration)
- `server.js` (should include billing router and static file serving)

**If any are missing or wrong:**
- Create/fix them using the complete code from recent commits
- Ensure `server.js` has: `app.use("/api/v1/billing", billingRouter(pool));`
- Ensure static files middleware: `app.use(express.static(path.join(__dirname, "public")));`

### Task 2: Fix Server.js If Needed
**The server.js must include:**
```javascript
// CRITICAL: Raw body for Stripe webhook BEFORE json parser
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));

// Then normal parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, "public")));

// Billing routes
import { billingRouter } from "./src/routes/billing.js";
app.use("/api/v1/billing", billingRouter(pool));

// Health check should show v7-billing-integrated
app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("SELECT NOW()");
    res.json({ 
      status: "healthy", 
      database: "connected", 
      timestamp: r.rows[0].now, 
      version: "v7-billing-integrated" 
    });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});
