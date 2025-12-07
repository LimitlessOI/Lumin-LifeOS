# 🤖 How to Scrape ALL Your AI Conversations

## Quick Start - 3 Steps

### Step 1: Store Your Login Credentials (Secure & Encrypted)

**For ChatGPT:**
```bash
POST /api/v1/conversations/store-credentials
{
  "provider": "chatgpt",
  "credentials": {
    "email": "your-email@example.com",
    "password": "your-password"
  }
}
```

**For Other Platforms:**
```bash
# Gemini (Google account)
POST /api/v1/conversations/store-credentials
{
  "provider": "gemini",
  "credentials": {
    "email": "your-email@gmail.com",
    "password": "your-password"
  }
}

# Claude
POST /api/v1/conversations/store-credentials
{
  "provider": "claude",
  "credentials": {
    "email": "your-email@example.com",
    "password": "your-password"
  }
}

# Grok (X/Twitter)
POST /api/v1/conversations/store-credentials
{
  "provider": "grok",
  "credentials": {
    "email": "your-email@example.com",
    "password": "your-password"
  }
}

# DeepSeek
POST /api/v1/conversations/store-credentials
{
  "provider": "deepseek",
  "credentials": {
    "email": "your-email@example.com",
    "password": "your-password"
  }
}
```

**🔒 Security:**
- Credentials are **encrypted** before storage
- Never logged or exposed
- Stored securely in database
- Can be deleted anytime

---

### Step 2: Start Scraping

**Start scraping all conversations:**
```bash
POST /api/v1/conversations/scrape
{
  "provider": "chatgpt"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Started scraping chatgpt conversations. Check status endpoint for progress.",
  "note": "Scraping runs in background. Use status endpoint to check progress."
}
```

**The scraper will:**
1. ✅ Login to the platform
2. ✅ Find ALL conversations
3. ✅ Extract all messages
4. ✅ Extract ideas, decisions, insights
5. ✅ Store in knowledge base

---

### Step 3: Check Progress

**Check scraping status:**
```bash
GET /api/v1/conversations/scrape-status/{statusId}
```

**Or check stored credentials:**
```bash
GET /api/v1/conversations/stored-credentials
```

**Response shows:**
- Status (starting, scraping, completed, failed)
- Progress percentage
- Total conversations found
- Extracted count
- Any errors

---

## What Gets Scraped

### ✅ All Conversations
- Every conversation you've ever had
- All messages (user + AI)
- Conversation titles
- Timestamps

### ✅ Ideas Extracted
- Business ideas
- Revenue concepts
- Product ideas
- Technical decisions
- Insights & realizations
- Lessons learned
- Unique approaches

### ✅ Stored Automatically
- All ideas stored in knowledge base
- Searchable and categorized
- Available for AI context injection
- Tagged with provider and type

---

## Example: Complete Workflow

### 1. Store ChatGPT Credentials
```bash
curl -X POST https://your-domain.com/api/v1/conversations/store-credentials \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "provider": "chatgpt",
    "credentials": {
      "email": "your-email@example.com",
      "password": "your-password"
    }
  }'
```

### 2. Start Scraping
```bash
curl -X POST https://your-domain.com/api/v1/conversations/scrape \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "provider": "chatgpt"
  }'
```

### 3. Check Progress (every few minutes)
```bash
curl https://your-domain.com/api/v1/conversations/scrape-status/{statusId} \
  -H "X-API-Key: YOUR_KEY"
```

### 4. View Extracted Ideas
```bash
# Ideas are automatically stored in knowledge base
GET /api/v1/knowledge/search?query=business+ideas&category=business-ideas
```

---

## Requirements

### ✅ Puppeteer Installation
The scraper uses Puppeteer for browser automation. Install it:

```bash
npm install puppeteer
```

**If Puppeteer is not installed:**
- The scraper will show an error
- You can use the export method instead (see below)

---

## Alternative: Export Method (No Login Needed)

If you prefer not to use login credentials, you can export your data manually:

### ChatGPT:
1. Go to Settings → Data Controls
2. Click "Export Data"
3. Wait for email with download link
4. Download JSON file

### Then upload:
```bash
POST /api/v1/conversations/extract-export
{
  "provider": "chatgpt",
  "exportData": { /* your exported JSON */ }
}
```

**This method:**
- ✅ No credentials needed
- ✅ Works without Puppeteer
- ✅ Same idea extraction
- ✅ Same storage in knowledge base

---

## Security Notes

1. **Credentials are encrypted:**
   - AES-256-GCM encryption
   - Encryption key from env var
   - Never stored in plain text

2. **Can delete anytime:**
   ```bash
   DELETE /api/v1/conversations/credentials/chatgpt
   ```

3. **Credentials only used for scraping:**
   - Never logged
   - Never exposed in responses
   - Only used during scraping process

---

## Troubleshooting

### "Puppeteer not installed"
```bash
npm install puppeteer
```

### "Login failed"
- Check credentials are correct
- Some platforms may require 2FA (not yet supported)
- Try export method instead

### "No conversations found"
- May need to wait for page to fully load
- Some platforms have rate limits
- Check browser console for errors

### "Scraping stuck"
- Check status endpoint
- May be waiting for page load
- Some platforms are slow to load

---

## What Happens After Scraping

1. ✅ All conversations extracted
2. ✅ Ideas automatically extracted using AI
3. ✅ Stored in knowledge base
4. ✅ Categorized and tagged
5. ✅ Available for:
   - AI context injection
   - Search
   - Business idea tracking
   - Historical reference

**Your conversations are now part of LifeOS knowledge base!** 🎉

---

## Next Steps

After scraping:
1. Check knowledge base for extracted ideas
2. Review business ideas
3. Use in AI context for better responses
4. Track revenue ideas
5. Learn from past decisions

**The system now knows everything you've discussed with AI!** 🚀
