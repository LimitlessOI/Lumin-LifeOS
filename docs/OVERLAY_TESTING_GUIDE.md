# Command Center Overlay Testing Guide

## ✅ What Was Fixed

### 1. **Ollama AI Council Integration** 🤖
- Added dedicated "Ollama Local" chat mode as the DEFAULT
- Direct connection to local Ollama models via `/api/v1/council/route`
- Real-time Ollama status display showing:
  - Connection status (ONLINE/OFFLINE)
  - Loaded models list
  - Endpoint information
- One-click "Test Ollama Connection" button

### 2. **Real Data Display** 📊
- Auto-builder status shows actual database counts:
  - Pending revenue opportunities
  - Total revenue potential
  - Average implementation time
  - Build artifacts count
- Ollama models list shows all loaded models
- Tools status shows real command execution results

### 3. **Self-Programming Enhanced** 🛠️
- Better response formatting for self-program mode
- Shows files modified when code is generated
- Displays task IDs for tracking
- Proper autoDeploy flag set

### 4. **Better Visual Feedback** 👁️
- Dedicated Ollama status section with color-coded status
- Model list display
- Clear online/offline indicators
- Status dots for each component

---

## 🚀 How to Test

### Step 1: Start Your Server
```bash
# Make sure Ollama is running
ollama serve

# Start the LifeOS server
node server.js
```

### Step 2: Open the Command Center
Navigate to:
```
http://localhost:8080/overlay/command-center.html
```

### Step 3: Authenticate
1. Enter your `LIFEOS_KEY` and click "Save Key"
2. Enter your `COMMAND_CENTER_KEY` and click "Save"
3. Click "🔄 Refresh Now"

---

## 🧪 Test Cases

### Test 1: Ollama Connection
**Expected:** Green "ONLINE" status with list of models

1. Look at the "🤖 Ollama AI Council (Local)" section
2. Click "Test Ollama Connection"
3. Should see: ✅ Test Successful with a response

**If OFFLINE:**
- Run `ollama serve` in terminal
- Check endpoint: http://localhost:11434
- Refresh the page

### Test 2: Chat with Ollama
**Expected:** Fast local AI responses

1. Make sure "Ollama Local" pill is selected (blue checkmark)
2. Type: "Hello, what can you do?"
3. Click "Send"
4. Should get a response within 1-3 seconds
5. Response should show `[Model: qwen2.5:32b]` or similar

### Test 3: Auto-Builder Status
**Expected:** Real database counts

1. Look at "Auto-Builder Status" section
2. Should show actual numbers:
   - Pending opportunities: X
   - Total potential: $X
   - Deployed builds: X

### Test 4: Work Queue
**Expected:** Real work items from the system

1. Look at "Work Queue" section
2. Should show actual build components or tasks
3. Click on a work item to open detail drawer
4. Should show timeline, logs, artifacts

### Test 5: Self-Programming
**Expected:** Code generation with file tracking

1. Select "Self-Program" mode
2. Type: "Add a comment to server.js explaining the database pool"
3. Click "Send"
4. Should see:
   - "🤖 Self-Programming Complete"
   - List of files modified
   - Task ID

---

## 📊 Real Data Sources

The overlay now pulls REAL data from:

### 1. `/api/v1/tools/status`
Returns:
- Ollama availability
- Loaded models array
- Python modules status
- Command execution results

### 2. `/api/v1/auto-builder/status`
Returns:
- Current builder state
- Pending opportunities count
- Revenue potential
- Build artifacts count

### 3. `/api/v1/council/route`
Routes to:
- Tier 0 (Ollama - FREE)
- Tier 1 (OpenAI/Anthropic - PAID)

### 4. `/api/v1/system/self-program`
Executes:
- Code analysis
- File modification
- Deployment

---

## 🎯 Chat Mode Guide

### 🤖 **Ollama Local** (DEFAULT - FREE)
- **Speed:** 1-3 seconds
- **Cost:** $0 (runs on your machine)
- **Use for:**
  - Quick questions
  - Code generation
  - General assistance
  - Testing

### 💡 **Brainstorm**
- **Speed:** 5-10 seconds
- **Cost:** Varies by model
- **Use for:**
  - Creative ideas
  - Research
  - Strategic planning

### 📋 **Plan**
- **Speed:** 5-10 seconds
- **Use for:**
  - Breaking down tasks
  - Risk analysis
  - Project planning

### ⚡ **Execute**
- **Speed:** 5-10 seconds
- **Use for:**
  - Debugging
  - Scripts
  - Tactical work

### 🏛️ **Council**
- **Speed:** 30-60 seconds
- **Use for:**
  - Important decisions
  - Multi-perspective analysis
  - High-stakes choices

### 📝 **Task**
- **Speed:** Instant (queued)
- **Use for:**
  - Background processing
  - Long-running jobs

### 🛠️ **Self-Program**
- **Speed:** 15-30 seconds
- **Use for:**
  - Code generation
  - Feature implementation
  - Database migrations

---

## ✅ Verification Checklist

- [ ] Ollama shows ONLINE status
- [ ] Can see list of loaded models
- [ ] Test Ollama button works
- [ ] Chat with Ollama gets responses
- [ ] Auto-builder shows real numbers
- [ ] Work queue shows actual items
- [ ] Tools status shows command results
- [ ] Self-program mode accepts instructions
- [ ] Auto-refresh updates data every 10s

---

## 🐛 Troubleshooting

### Ollama shows OFFLINE
```bash
# Check if Ollama is running
ps aux | grep ollama

# Start Ollama
ollama serve

# Refresh the overlay
```

### No Auto-Builder Data
```bash
# Check database connection
node -e "const {pool} = require('./server.js'); pool.query('SELECT 1')"

# Refresh the page
```

### Chat Not Working
1. Check COMMAND_CENTER_KEY is set
2. Look for errors in browser console (F12)
3. Check server logs
4. Verify API endpoint is running

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ Ollama section shows GREEN "ONLINE" status
2. ✅ You can see a list of models (qwen2.5:32b, deepseek-coder-v2, etc.)
3. ✅ Sending a message in Ollama mode gets a response in < 3 seconds
4. ✅ Auto-builder shows actual database numbers (not zeros)
5. ✅ Work queue displays actual build components
6. ✅ All sections update every 10 seconds automatically

---

## 📚 Next Steps

Once the overlay is working:

1. **Try different chat modes** - Compare Ollama vs Council
2. **Test self-programming** - Ask it to add features
3. **Monitor work queue** - See what the system is building
4. **Check auto-builder** - Watch revenue opportunities
5. **Use search safely** - Research without external APIs

---

**Your overlay is now connected to REAL Ollama AI and REAL system data!** 🎉

The default mode is now "Ollama Local" so you can immediately start chatting with your local AI models.
