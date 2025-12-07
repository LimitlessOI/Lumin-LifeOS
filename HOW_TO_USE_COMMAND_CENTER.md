# 🎯 How to Use Command Center

## AI Status Bar (Always Visible)

At the top of the Command Center, you'll see:

```
AI Status: [GPT ●] [Gem ●] [DS ●] [Grok ●]
```

**Status Indicators:**
- 🟢 **Green dot** = AI is active and working
- 🔴 **Red dot** = AI is inactive or has errors
- ⚪ **Gray dot** = Status unknown (checking...)
- 🟡 **Yellow dot** = Currently testing

**Auto-Updates:**
- Status checks automatically every 30 seconds
- Tests on page load (silent)
- No button needed - always visible!

---

## Giving Tasks to the System

### Method 1: Task Command (Recommended)

Type in the chat input:
```
task: Create a file called test.txt with "Hello World"
```

Or:
```
do: Analyze the codebase and find unused files
```

Or:
```
execute: Generate 10 business ideas
```

**What happens:**
1. System queues your task
2. Shows confirmation with task ID
3. System executes the task
4. Notifies you when complete
5. Refresh to see results!

### Method 2: Regular Chat

Just type normally:
```
What are the top 5 ways to reduce costs?
```

The AI council will respond directly.

---

## Testing AI Council

### Automatic Test (On Page Load)
- Tests all AIs automatically when page loads
- Updates status dots silently
- No action needed!

### Manual Test
- Click "🧪 Test" button in header
- Shows detailed results in chat
- Updates all status dots

---

## Example Tasks

### Create a File
```
task: Create a file called README.md with "# LifeOS\n\nWelcome to LifeOS"
```

### Analyze Code
```
task: Analyze server.js and find all unused functions
```

### Generate Ideas
```
task: Generate 25 business ideas for revenue generation
```

### Research
```
task: Research the best practices for AI cost optimization
```

---

## Viewing Task Results

1. **Check Active Projects** (left sidebar)
   - Shows all queued/running tasks
   - Click to see details

2. **Wait for Notification**
   - System will notify when task completes
   - Message appears in chat

3. **Refresh Page**
   - Completed tasks show in history
   - Results are stored in database

---

## Status Indicators Explained

### Main Status (Green Dot)
- Top-left corner
- Overall system health
- Green = All good
- Yellow = Partial issues
- Red = Major problems

### AI Status Bar
- Shows each AI model individually
- GPT = ChatGPT
- Gem = Gemini
- DS = DeepSeek
- Grok = Grok

---

## Quick Reference

| Action | Command |
|--------|---------|
| Give task | `task: [description]` |
| Give task | `do: [description]` |
| Give task | `execute: [description]` |
| Test council | Click "🧪 Test" button |
| Check status | Look at status bar (always visible) |
| View tasks | Check "Active Projects" sidebar |

---

## Troubleshooting

### All dots are red
- Check API keys in Railway
- Check Railway logs
- Click "🧪 Test" for details

### Task not executing
- Check "Active Projects" sidebar
- Look for error messages
- Verify task was queued (check confirmation)

### Status not updating
- Wait 30 seconds (auto-update interval)
- Click "🧪 Test" to force update
- Refresh page

---

**The Command Center now shows AI status at a glance and accepts tasks easily!** 🚀
