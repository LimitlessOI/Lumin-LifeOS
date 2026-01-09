# Deploy TCO to Railway - Step-by-Step Guide

**Status**: ✅ All code pushed to GitHub (commit cf6ea987)
**Time Required**: 20-30 minutes

---

## STEP 1: Create Railway Project (2 minutes)

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select: `LimitlessOI/Lumin-LifeOS`
4. Railway will automatically:
   - Detect Node.js
   - Create a service
   - Start building

**Wait for initial build to complete** (3-5 minutes)

---

## STEP 2: Set Environment Variables (10 minutes)

Go to your Railway project → **Variables** tab → Add these variables:

### 🔴 CRITICAL - Required for TCO

```bash
# Database (from Neon.tech)
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-xxxxx.us-west-2.aws.neon.tech/neondb?sslmode=require

# TCO Encryption Key (generate new one!)
TCO_ENCRYPTION_KEY=run_this_command_to_generate

# Core Auth
JWT_SECRET=your_secure_jwt_secret_at_least_32_chars
COMMAND_CENTER_KEY=your_command_center_key

# AI Providers (at least ONE required)
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-proj-xxxxx
GOOGLE_API_KEY=xxxxx

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_xxxxx  # or sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx  # or pk_test_xxxxx
# STRIPE_WEBHOOK_SECRET will be set after Step 4
```

### 🟡 OPTIONAL - Better Performance

```bash
# Free cloud models (if Ollama not available)
GROQ_API_KEY=gsk_xxxxx

# Production mode
NODE_ENV=production
```

---

## STEP 3: Generate TCO Encryption Key

**On your local machine, run**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output**:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

Copy this and set it as `TCO_ENCRYPTION_KEY` in Railway.

---

## STEP 4: Get Your Railway URL

After deployment completes:

1. Go to your Railway project → **Settings** tab
2. Find **Domains** section
3. Click **Generate Domain**
4. Copy your URL: `https://YOUR-APP-NAME.railway.app`

**Save this URL - you'll need it for Stripe webhooks**

---

## STEP 5: Run Database Migrations (5 minutes)

**Option A: Via Railway CLI (Recommended)**

```bash
# Install Railway CLI if you haven't
npm install -g @railway/cli

# Login and link to your project
railway login
railway link

# Run migrations in order
railway run psql $DATABASE_URL -f database/migrations/create_tco_tables.sql
railway run psql $DATABASE_URL -f database/migrations/create_tco_agent_tables.sql
railway run psql $DATABASE_URL -f database/migrations/add_tco_leads_and_stripe.sql
railway run psql $DATABASE_URL -f database/migrations/upgrade_tco_agent_objection_handling.sql
```

**Option B: Via Neon.tech SQL Editor**

1. Go to https://console.neon.tech
2. Select your database → **SQL Editor**
3. Copy/paste each migration file contents and run:
   - `create_tco_tables.sql`
   - `create_tco_agent_tables.sql`
   - `add_tco_leads_and_stripe.sql`
   - `upgrade_tco_agent_objection_handling.sql`

---

## STEP 6: Configure Stripe Webhook (3 minutes)

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Set endpoint URL:
   ```
   https://YOUR-APP-NAME.railway.app/api/tco/webhook/stripe
   ```
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to Railway variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

---

## STEP 7: Test Deployment (5 minutes)

### Test 1: Health Check

```bash
curl https://YOUR-APP-NAME.railway.app/api/health
```

**Expected**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-08T...",
  "ollama": "Not configured"
}
```

### Test 2: Analyzer (Lead Generation)

Visit in browser:
```
https://YOUR-APP-NAME.railway.app/tco/analyzer.html
```

**Expected**: Premium dark-themed cost analyzer loads

### Test 3: Complete Analyzer Flow

1. Adjust slider ($10,000)
2. Select providers (check OpenAI)
3. Select use case (Code Generation)
4. Select volume (Medium)
5. Click **"Analyze My Costs"**
6. See animated results with confetti 🎉
7. Enter email: `test@example.com`
8. Click **"Get My Report"**

**Check database**:
```bash
railway run psql $DATABASE_URL -c "SELECT * FROM tco_leads ORDER BY created_at DESC LIMIT 1;"
```

**Expected**: Your test lead appears

---

## STEP 8: Get Your Live URLs

Save these for sharing:

### Public URLs (Share with customers)

```
Lead Generation Tool:
https://YOUR-APP-NAME.railway.app/tco/analyzer.html

Customer Dashboard (after signup):
https://YOUR-APP-NAME.railway.app/tco/dashboard.html
```

### API Endpoints

```
TCO Proxy (The Product):
POST https://YOUR-APP-NAME.railway.app/api/tco/proxy

Customer Signup:
POST https://YOUR-APP-NAME.railway.app/api/tco/signup

Sales Agent Webhook:
POST https://YOUR-APP-NAME.railway.app/api/tco-agent/webhook/mention
```

### Admin Endpoints

```
Pending Leads:
GET https://YOUR-APP-NAME.railway.app/api/tco-agent/pending

Objection Analytics:
GET https://YOUR-APP-NAME.railway.app/api/tco-agent/objections

Persistence Stats:
GET https://YOUR-APP-NAME.railway.app/api/tco-agent/persistence-stats
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Railway project created
- [ ] All environment variables set
- [ ] TCO_ENCRYPTION_KEY generated
- [ ] Database migrations run
- [ ] Stripe webhook configured
- [ ] Health check passes
- [ ] Analyzer loads
- [ ] Test lead captured in database
- [ ] URLs saved for sharing

---

## 🚨 TROUBLESHOOTING

### "COMMAND_CENTER_KEY environment variable is required"
- Set `COMMAND_CENTER_KEY` in Railway variables

### "Database connection failed"
- Check `DATABASE_URL` is correct
- Verify SSL mode: `?sslmode=require`
- Test connection in Neon.tech dashboard

### "TCO Encryption failed"
- Regenerate `TCO_ENCRYPTION_KEY` with crypto.randomBytes(32)
- Ensure it's 64 characters (hex string)

### Analyzer doesn't load
- Check Railway deployment logs for errors
- Verify static files are being served
- Test: `curl https://YOUR-URL/tco/analyzer.html`

### Stripe webhook fails
- Verify webhook URL matches Railway domain
- Check `STRIPE_WEBHOOK_SECRET` is set correctly
- Look at Stripe Dashboard → Webhooks → Recent deliveries

---

## 📊 MONITORING

After deployment, monitor:

1. **Railway Logs**: Check for errors
   ```
   railway logs
   ```

2. **Database**: Check for incoming leads
   ```bash
   railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM tco_leads;"
   ```

3. **Stripe Dashboard**: Monitor checkout sessions

---

## 🎉 YOU'RE LIVE!

Once all checks pass:

1. **Share the analyzer**: Send `/tco/analyzer.html` to potential customers
2. **Set up social media webhooks**: Point them to `/api/tco-agent/webhook/mention`
3. **Monitor leads**: Check `/api/tco-agent/pending`
4. **Track revenue**: Watch `tco_leads` convert to `tco_customers`

**Revenue starts flowing** when first customer signs up! 💰

---

## 📚 NEXT STEPS

After successful deployment:

1. **Test customer signup flow** end-to-end
2. **Review sales agent stats**: `/api/tco-agent/stats`
3. **Set up monitoring alerts** (Railway has built-in alerts)
4. **Share analyzer link** on social media
5. **Connect social media webhooks** for autonomous agent

---

## 🔗 USEFUL LINKS

- **Railway Dashboard**: https://railway.app/project/YOUR_PROJECT_ID
- **Neon Database**: https://console.neon.tech
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Deployment Docs**: RAILWAY_DEPLOYMENT.md
- **Status Report**: TCO_SYSTEM_STATUS_REPORT.md
- **Sales Agent Guide**: docs/TCO_SALES_AGENT_GUIDE.md

---

**Need help?** Check Railway logs: `railway logs --tail`
