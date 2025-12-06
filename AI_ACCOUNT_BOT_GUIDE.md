# 🤖 AI Account Bot - Extract Ideas from Your AI Conversations

## Overview

The AI Account Bot can read your conversations from ChatGPT, Gemini, Claude, Grok, and DeepSeek accounts to extract business ideas, decisions, and insights.

## How It Works

### Option 1: Export Data (Recommended - Most Secure)

1. **Export from each platform:**
   - **ChatGPT**: Settings → Data Controls → Export Data
   - **Gemini**: Google Takeout → Gemini data
   - **Claude**: Anthropic account → Export conversations
   - **Grok**: X/Twitter → Data export
   - **DeepSeek**: Account settings → Export

2. **Upload to system:**
   ```bash
   POST /api/v1/ai-accounts/process-export
   {
     "provider": "chatgpt",
     "data": { /* exported JSON data */ }
   }
   ```

3. **System processes:**
   - Extracts ideas from conversations
   - Deduplicates similar ideas
   - Stores unique insights in knowledge base
   - Categorizes by type (idea, decision, insight)

### Option 2: Browser Automation (Future)

For platforms without export, we can use browser automation:
- Requires credentials (stored securely)
- Uses Puppeteer to read conversations
- Extracts and processes automatically

**Security Note:** Credentials are encrypted and never stored in plain text.

## What Gets Extracted

1. **Business Ideas**
   - Revenue generation concepts
   - Product/service ideas
   - Market opportunities

2. **Decisions Made**
   - Strategic choices
   - Implementation decisions
   - Direction changes

3. **Insights**
   - "Aha" moments
   - Realizations
   - Patterns discovered

4. **Unique Perspectives**
   - Different angles on problems
   - Creative solutions
   - Out-of-the-box thinking

## Deduplication

The system:
- Compares idea content semantically
- Merges similar ideas
- Keeps the most detailed version
- Tracks sources for each idea

## Storage

All extracted ideas are stored in:
- Knowledge Base (searchable)
- Categorized as "business-ideas"
- Tagged with provider and impact level
- Available for AI context injection

## API Endpoints

### Process Exported Data
```bash
POST /api/v1/ai-accounts/process-export
{
  "provider": "chatgpt|gemini|claude|grok|deepseek",
  "data": { /* exported data */ }
}
```

### Process All Accounts
```bash
POST /api/v1/ai-accounts/process-all
{
  "credentials": {
    "chatgpt": { /* export data */ },
    "gemini": { /* export data */ },
    // etc.
  }
}
```

## Example Response

```json
{
  "ok": true,
  "provider": "chatgpt",
  "conversationsProcessed": 150,
  "ideasExtracted": 45,
  "uniqueIdeas": 32,
  "stored": 32
}
```

## Privacy & Security

- **No passwords stored** - Only exported data processed
- **Encrypted storage** - All data encrypted at rest
- **User control** - You choose what to export
- **No external access** - All processing local

## Best Practices

1. **Export regularly** - Weekly or monthly
2. **Review extracted ideas** - Check knowledge base
3. **Tag important ideas** - Add custom tags
4. **Merge duplicates** - System does this automatically
5. **Use for context** - Ideas automatically injected into AI calls

---

**The bot helps you never lose a good idea from your AI conversations!** 💡
