# 🚀 Deploy Ollama on Railway (Complete Guide)

## Why Railway + Ollama?

✅ **Same platform** as your server (easy integration)  
✅ **Free tier available** ($1/month credit)  
✅ **No external API costs** for Ollama responses  
✅ **Fast responses** (no network latency)  
✅ **Perfect for Tier 0** (80-95% of tasks)  
✅ **Neon database** stores all responses (FREE future retrievals)

## Step-by-Step Deployment

### 1. Create Ollama Service on Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Click **"New Project"** → **"Empty Project"**
3. Click **"New Service"** → **"GitHub Repo"** or **"Empty Service"**
4. Name it: `ollama-service`

### 2. Create Dockerfile

Create `Dockerfile` in your project root (or in a subdirectory):

```dockerfile
FROM ollama/ollama:latest

# Expose Ollama port
EXPOSE 11434

# Create directory for models
RUN mkdir -p /root/.ollama

# Start Ollama
CMD ["ollama", "serve"]
```

### 3. Configure Railway Service

**Option A: Using Railway's Ollama Template (Easiest)**
- Search for "Ollama" in Railway templates
- Deploy directly

**Option B: Manual Setup (More Control)**

Create `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "ollama serve",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 4. Set Resource Limits

In Railway service settings:
- **RAM**: 2-4GB (for small models like Llama 3.2 1B)
- **CPU**: 2-4 vCPU
- **Free tier**: 0.5GB RAM, 1 vCPU (may need upgrade to Hobby $5/month)

### 5. Pull Models After Deployment

After service starts, SSH into container or use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Connect to service
railway link
railway run bash

# Pull models
ollama pull llama3.2:1b
ollama pull phi3:mini
ollama pull deepseek-coder:latest
```

**Or create startup script:**

Create `init-models.sh`:
```bash
#!/bin/bash
echo "Pulling Ollama models..."
ollama pull llama3.2:1b
ollama pull phi3:mini
ollama pull deepseek-coder:latest
echo "Models ready!"
```

### 6. Get Service URL

Railway will provide a public URL like:
```
https://ollama-service-production.up.railway.app
```

**For internal networking** (recommended):
```bash
# In your server.js or environment
OLLAMA_ENDPOINT=http://ollama-service:11434  # Internal
```

**For external access**:
```bash
OLLAMA_ENDPOINT=https://ollama-service-production.up.railway.app  # External
```

### 7. Update Environment Variables

In your **main server service**:
```bash
OLLAMA_ENDPOINT=http://ollama-service:11434
OLLAMA_ENABLED=true
```

### 8. Test Connection

```bash
curl http://ollama-service:11434/api/tags
```

Should return list of available models.

## Cost Analysis

### Free Tier
- **$1/month credit**
- **0.5GB RAM, 1 vCPU**
- **Good for**: Testing, very small models
- **Limitation**: May not fit larger models

### Hobby Plan ($5/month)
- **$5 usage credit**
- **8GB RAM, 8 vCPU**
- **Good for**: Production, multiple small models
- **Perfect for**: Llama 3.2 1B, Phi-3 Mini, DeepSeek Coder

### Cost Comparison

**External API (DeepSeek Cloud):**
- $0.10 per million tokens
- 1,000 requests/day = ~$30/month

**Ollama on Railway:**
- $5/month (Hobby plan)
- **Unlimited requests** (within resource limits)
- **Savings: 83%** (if doing >$30/month in API calls)

**With Neon Caching:**
- Ollama responses cached in Neon (FREE)
- Future identical requests = $0
- **Total savings: 90-95%** vs pure cloud API

## Integration with Tier 0 Council

Your `tier0-council.js` already supports Ollama! Just set:

```bash
OLLAMA_ENDPOINT=http://ollama-service:11434
```

The system will automatically:
1. Try Ollama first (FREE)
2. Fallback to cloud APIs if needed
3. Cache all responses in Neon (FREE future responses)

## Monitoring

Track Ollama usage:
```bash
# Check model status
curl http://ollama-service:11434/api/tags

# Check service health
curl http://ollama-service:11434/api/version
```

## Troubleshooting

### Model Not Loading
- Check RAM limits (models need 2-4GB)
- Upgrade to Hobby plan if needed

### Slow Responses
- Increase CPU allocation
- Use smaller models (1B-3B params)

### Service Crashes
- Check logs in Railway dashboard
- Increase restart policy retries

## Expected Results

- **80-95% of tasks** handled by Ollama (FREE)
- **5-15%** need cloud APIs (cheap)
- **Neon cache** stores everything (FREE future responses)
- **Total cost**: $5/month (Ollama) + minimal cloud API + Neon storage
- **Savings**: 90-95% vs pure cloud API approach

🎉 **You're running AI for almost free!**

---

## Neon Database (Not for Ollama)

**Important**: Neon is a **database**, not a compute platform. You cannot run Ollama on Neon.

**What Neon does:**
- Stores all AI responses (caching)
- Stores conversation memory
- Stores knowledge base
- Stores task queues
- Stores improvement reports

**What Railway does:**
- Runs your server
- Runs Ollama service
- Provides compute resources

**Together:**
- Railway runs Ollama (FREE AI)
- Neon caches responses (FREE storage)
- **Result: 90-95% cost savings!**
