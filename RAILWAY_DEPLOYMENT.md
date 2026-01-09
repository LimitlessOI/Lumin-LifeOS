# Railway Deployment Checklist for TCO

**Date**: 2026-01-08
**Status**: Ready to Deploy

---

## ✅ Pre-Deployment Verification

- [x] All TCO routes properly mounted in server.js
- [x] TCO tracker initialized
- [x] TCO Sales Agent initialized with follow-up scheduler
- [x] Static files (public/tco/) served correctly
- [x] Code pushed to GitHub (7 TCO commits)
- [x] Database migrations ready

---

## 🚀 Railway Deployment Steps

### 1. Connect GitHub Repository

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select: `LimitlessOI/Lumin-LifeOS`
4. Railway will automatically detect Node.js and create a service

### 2. Configure Environment Variables

Go to your Railway project → Variables → Add all required variables:

#### **REQUIRED - Database** (Priority 1)
```bash
DATABASE_URL=postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require
```
👉 **Get this from Neon.tech dashboard** (copy full connection string)

#### **REQUIRED - Core Secrets** (Priority 1)
```bash
JWT_SECRET=your_secure_random_string_min_32_chars
COMMAND_CENTER_KEY=your_command_center_api_key
```

#### **REQUIRED - AI Providers** (Priority 1)
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-proj-xxxxx
GOOGLE_API_KEY=xxxxx
```

#### **REQUIRED - TCO Encryption** (Priority 1)
```bash
TCO_ENCRYPTION_KEY=your_32_byte_hex_string
```
Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

#### **REQUIRED - Stripe** (Priority 2)
```bash
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

#### **OPTIONAL - Additional AI Providers**
```bash
GROQ_API_KEY=xxxxx
COHERE_API_KEY=xxxxx
DEEPSEEK_API_KEY=xxxxx
TOGETHER_API_KEY=xxxxx
```

#### **OPTIONAL - Mode Settings**
```bash
SANDBOX_MODE=false
DATABASE_URL_SANDBOX=postgresql://... (only if SANDBOX_MODE=true)
NODE_ENV=production
PORT=3000  # Railway sets this automatically
```

### 3. Run Database Migrations

**Option A: Via Railway CLI**
```bash
railway login
railway link
railway run psql $DATABASE_URL -f database/migrations/create_tco_tables.sql
railway run psql $DATABASE_URL -f database/migrations/create_tco_agent_tables.sql
railway run psql $DATABASE_URL -f database/migrations/add_tco_leads_and_stripe.sql
railway run psql $DATABASE_URL -f database/migrations/upgrade_tco_agent_objection_handling.sql
```

**Option B: Via Neon.tech SQL Editor**
1. Go to Neon.tech dashboard
2. Open SQL Editor
3. Run each migration file in order (copy/paste contents)

### 4. Configure Stripe Webhooks

After deployment, set up Stripe webhook endpoint:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://YOUR-RAILWAY-URL.railway.app/api/tco/webhook/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret → add to Railway env vars as `STRIPE_WEBHOOK_SECRET`

### 5. Verify Deployment

After Railway deploys, test these endpoints:

```bash
# Health check
curl https://YOUR-URL.railway.app/api/health

# TCO routes
curl https://YOUR-URL.railway.app/api/tco/test

# Static files
curl https://YOUR-URL.railway.app/tco/analyzer.html
```

---

## 🗄️ Database Migrations (In Order)

Run these migrations on your production database:

1. **create_tco_tables.sql** - Core TCO tables (customers, requests, savings)
2. **create_tco_agent_tables.sql** - Sales agent tables (interactions, config, stats)
3. **add_tco_leads_and_stripe.sql** - Lead capture + Stripe integration
4. **upgrade_tco_agent_objection_handling.sql** - Objection handling + negotiations

**Migration Commands**:
```bash
# If using Neon.tech database
psql "postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require" -f database/migrations/create_tco_tables.sql
psql "postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require" -f database/migrations/create_tco_agent_tables.sql
psql "postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require" -f database/migrations/add_tco_leads_and_stripe.sql
psql "postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require" -f database/migrations/upgrade_tco_agent_objection_handling.sql
```

---

## 📋 Environment Variables Reference

### Critical TCO Variables

| Variable | Purpose | Where to Get It |
|----------|---------|-----------------|
| `DATABASE_URL` | PostgreSQL connection | Neon.tech dashboard |
| `TCO_ENCRYPTION_KEY` | Encrypt customer API keys | Generate with crypto.randomBytes(32) |
| `STRIPE_SECRET_KEY` | Process payments | Stripe Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures | Stripe Dashboard → Webhooks |
| `ANTHROPIC_API_KEY` | AI council member | Anthropic Console |
| `OPENAI_API_KEY` | AI council member | OpenAI Dashboard |
| `GOOGLE_API_KEY` | AI council member | Google Cloud Console |

### Generate TCO Encryption Key

**On macOS/Linux**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output**:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

Copy this to Railway as `TCO_ENCRYPTION_KEY`

---

## 🔐 Security Checklist

Before going live:

- [ ] All API keys are stored in Railway env vars (NOT in code)
- [ ] `TCO_ENCRYPTION_KEY` is generated and set
- [ ] Stripe webhook secret is configured
- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] `NODE_ENV=production` is set
- [ ] CORS is configured for your domain
- [ ] Rate limiting is enabled (already in server.js)

---

## 🧪 Post-Deployment Testing

### Test Lead Generation Flow
```bash
# 1. Visit analyzer
https://YOUR-URL.railway.app/tco/analyzer.html

# 2. Complete analysis and submit email
# 3. Check database for lead:
psql $DATABASE_URL -c "SELECT * FROM tco_leads ORDER BY created_at DESC LIMIT 1;"
```

### Test TCO Proxy
```bash
curl -X POST https://YOUR-URL.railway.app/api/tco/proxy \
  -H "Content-Type: application/json" \
  -H "X-TCO-API-Key: YOUR_CUSTOMER_API_KEY" \
  -d '{
    "provider": "openai",
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "tco_mode": "optimized"
  }'
```

### Test Sales Agent Webhook
```bash
curl -X POST https://YOUR-URL.railway.app/api/tco-agent/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "These AI API costs are killing us!"
  }'
```

---

## 📊 Monitoring

After deployment, monitor:

1. **Railway Logs**: Check for startup errors
2. **Database Connections**: Verify pool doesn't exhaust
3. **API Response Times**: Monitor `/api/health` endpoint
4. **Lead Capture**: Check `tco_leads` table for new entries
5. **Sales Agent**: Check `tco_agent_interactions` for activity

---

## 🚨 Troubleshooting

### "Database connection failed"
- ✅ Check `DATABASE_URL` is set correctly
- ✅ Verify SSL mode: `?sslmode=require`
- ✅ Check Neon.tech database is active

### "TCO Encryption failed"
- ✅ Check `TCO_ENCRYPTION_KEY` is 64-character hex string (32 bytes)
- ✅ Regenerate if needed

### "Stripe webhook signature verification failed"
- ✅ Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- ✅ Verify webhook endpoint URL is correct

### "AI provider timeout"
- ✅ Check API keys are valid
- ✅ Verify provider isn't down (check status pages)
- ✅ Check rate limits

---

## 📝 Final Checklist

Before announcing TCO is live:

- [ ] All migrations run successfully
- [ ] Environment variables set in Railway
- [ ] Stripe webhook configured
- [ ] Test lead capture flow works
- [ ] Test TCO proxy works
- [ ] Test customer dashboard loads
- [ ] Sales agent follow-up scheduler running
- [ ] Monitor logs for 1 hour (no errors)

---

## 🎯 Live URLs (After Deployment)

Replace `YOUR-RAILWAY-URL` with your actual Railway deployment URL:

### Public-Facing
- **Lead Generation**: `https://YOUR-RAILWAY-URL.railway.app/tco/analyzer.html`
- **Customer Dashboard**: `https://YOUR-RAILWAY-URL.railway.app/tco/dashboard.html`

### API Endpoints
- **TCO Proxy** (The Product): `https://YOUR-RAILWAY-URL.railway.app/api/tco/proxy`
- **Customer Signup**: `https://YOUR-RAILWAY-URL.railway.app/api/tco/signup`
- **Sales Agent Webhook**: `https://YOUR-RAILWAY-URL.railway.app/api/tco-agent/webhook/mention`

### Admin/Analytics
- **Pending Leads**: `https://YOUR-RAILWAY-URL.railway.app/api/tco-agent/pending`
- **Objection Analytics**: `https://YOUR-RAILWAY-URL.railway.app/api/tco-agent/objections`
- **Persistence Stats**: `https://YOUR-RAILWAY-URL.railway.app/api/tco-agent/persistence-stats`

---

## 🎉 You're Ready!

TCO is production-ready. Once deployed:

1. Share analyzer link: `/tco/analyzer.html`
2. Set up social media webhooks to `/api/tco-agent/webhook/mention`
3. Monitor leads in database
4. Watch the savings roll in!

**Need help?** Check logs in Railway dashboard or run:
```bash
railway logs
```
