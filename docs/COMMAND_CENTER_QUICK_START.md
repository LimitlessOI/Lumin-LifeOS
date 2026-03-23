# 🚀 Command Center Quick Start Guide

## Open It
```
http://localhost:8080/overlay/command-center.html
```

---

## 💬 What to Type

### Simple Questions (Fast - 1-2s)
```
"What are you working on?"
"How is the company doing?"
"Show me the current status"
→ Single AI responds quickly

### Ask for Advice (Medium - 10-15s)
```
"Should we add email notifications?"
"What approach should we take for authentication?"
"Should I approve this design?"
```
→ Wisdom council (Adam 50%, Ford, Edison, Jesus, Buffett) weighs in

### Important Decisions (Slow - 30-60s)
```
"Should we spend $500 on advertising?"
"Should I invest $1000 in cloud infrastructure?"
"Should we buy this tool for $200?"
```
→ Full 5-phase consensus (Quick vote → Steel-man → Future → Final vote → Escalate)

### Build Something (NEW! - 15-30s)
```
"Add a new API endpoint for user messages"
"Create a database table for storing logs"
"Build a feature to export data to CSV"
"Implement rate limiting on the API"
```
→ **SELF-PROGRAMS** - Actually writes the code and deploys it!

### Queue a Task (Instant)
```
"Task: Research competitor pricing"
"Do: Analyze user feedback"
"Execute: Generate monthly report"
```
→ Adds to task queue for background processing

---

## 🎯 How It Routes Your Messages

```
┌─────────────────────────────────────────────────────┐
│  "What's happening?"                                │
│  → Single AI (fast)                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  "Should we..."                                     │
│  → Wisdom Filters (Adam, Ford, Edison, Jesus...)   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  "Should we spend $500..."                          │
│  → Full Consensus (5 phases)                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  "Add a new endpoint..."                            │
│  → SELF-PROGRAMMING! (writes code)                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  "Task: Do something"                               │
│  → Task Queue                                       │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Test the System

Click the **🧪 Test** button (top right) to see:
- Which AI models are online
- Response latency for each
- Tier 0 (free) vs Tier 1 (premium) status

Status dots change color:
- 🟢 Green = Online
- 🔴 Red = Offline
- 🟡 Yellow = Testing

---

## 🤖 Self-Programming Examples

### Add an API Endpoint
```
Type: "Add a POST endpoint at /api/v1/feedback for collecting user feedback"

System will:
1. Read `startup/register-routes.js` and existing route files
2. Create or update `routes/<feature>-routes.js`
3. Add any needed logic in `services/<feature>.js`
4. Register the route in `startup/register-routes.js`
5. Auto-deploy

You'll see:
✅ Files Modified: routes/feedback-routes.js, startup/register-routes.js
✅ Code Generated: 847 characters
🚀 Changes automatically deployed!
```

### Create a Database Table
```
Type: "Create a table called user_preferences with columns for user_id and theme"

System will:
1. Analyze your database schema
2. Generate migration SQL
3. Create migration file
4. Run migration (if autoDeploy true)

You'll see:
✅ Files Modified: migrations/001_user_preferences.sql
✅ Migration created
```

### Build a Feature
```
Type: "Implement a rate limiter that allows 100 requests per hour per IP"

System will:
1. Read existing middleware
2. Generate rate limiter code
3. Add route wiring to `startup/register-routes.js`
4. Add logic to `services/` or `middleware/` as needed
5. Deploy

You'll see:
✅ Files Modified: startup/register-routes.js, middleware/rate-limiter.js
⚠️ Blind Spots Detected: 2 (Redis configuration, IP detection behind proxy)
```

---

## ⚙️ Settings

Click **⚙️** button (top right) to:
- View your API base URL
- Update your command key
- Clear key and re-authenticate

---

## 📊 Dashboard (Right Panel)

**Company Health:**
- Monthly Revenue
- Monthly Expenses
- Net Income

**ROI Tracker:**
- ROI Ratio
- AI Cost Today
- Revenue Generated

**AI Performance:**
- Accuracy Score
- Self-Evaluation

---

## 🎨 Visual Features

**Conference View** (under header):
Shows which AIs are active in current conversation

**Message Types:**
- You (blue) - Your messages
- AI (purple) - AI responses
- System (gray) - System messages
- Error (red) - Errors

**Status Indicators:**
- Typing indicator when processing
- Model name shown on each response
- Timestamp on each message

---

## 🔥 Pro Tips

1. **Be specific**: "Add a GET endpoint" is better than "make an API"
2. **Mention targets**: "Add a new route file and register it in startup/register-routes.js" is better than "add to server.js"
3. **Test first**: Click 🧪 Test to see what's online before asking
4. **Check sidebar**: Active projects show current tasks
5. **Use voice**: Push and hold 🎤 button to speak

---

## ❓ Troubleshooting

### "Network Error"
→ Server not running? Run `node server.js`

### "Authentication Failed"
→ Update command key in settings (⚙️ button)

### "Request Timeout"
→ Consensus takes 30-60s, be patient

### Self-programming not working?
→ Make sure your message has both:
  - Action word: "add", "create", "build"
  - Target word: "endpoint", "feature", "table"

---

## 📚 Full Documentation

- Test Report: `docs/COMMAND_CENTER_TEST_REPORT.md`
- Summary: `docs/FINAL_TESTING_SUMMARY.md`
- Architecture: `docs/SSOT_NORTH_STAR.md`

---

**Ready to build? Open the Command Center and say:**

```
"Add a new endpoint for tracking daily metrics"
```

**Watch your system program itself! 🎉**
