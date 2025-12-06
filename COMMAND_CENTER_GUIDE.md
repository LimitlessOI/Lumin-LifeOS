# 🎮 Command Center - Complete User Guide

## Overview

The Command Center is your personal control interface for LifeOS. It's designed to feel like ChatGPT Pro but with full system control, multiple AIs in a conference-style interface, and complete visibility into your business.

## Access

Navigate to: `https://your-domain.railway.app/command-center`

## Features

### 1. **Conference-Style AI Interface**
- See which AI is currently speaking
- Multiple AIs visible at once
- Visual indicators when an AI is active
- Each AI has its own avatar and color

### 2. **Push-to-Talk Voice Input**
- Click and hold the microphone button
- Speak your command
- Automatically converts to text
- Works in Chrome/Edge (Web Speech API)

### 3. **Project Queue View** (Left Sidebar)
- See all active projects/tasks
- Progress bars for each project
- ETA for completion
- Click to view project details
- Status indicators (in progress, completed, etc.)

### 4. **Chat Interface** (Center)
- ChatGPT-like conversation
- Scrollable history
- Auto-archives old messages
- Shows English to you, MICRO symbols to system
- Each message shows which AI responded

### 5. **Company Health Dashboard** (Right Sidebar)
- **Monthly Revenue** - Total income
- **Monthly Expenses** - Total costs
- **Net Income** - Revenue minus expenses
- **ROI Ratio** - Return on investment
- **AI Cost Today** - Current AI spending
- **Revenue Generated** - Income from AI work
- **Accuracy Score** - AI performance
- **Self-Evaluation** - AI's confidence

### 6. **File Upload**
- Click upload button (📁 or 📎)
- Select file from your computer
- Choose category:
  - Business Ideas
  - Context
  - Security
  - Income Generation
  - Future Thoughts
  - Quantum Proof
  - Historical
- Add description
- Files automatically indexed for search

### 7. **Window Controls**
- Resize the window
- Minimize/maximize
- Position anywhere
- State persists between sessions

## How It Works

### English ↔ MICRO Symbols
- **You see:** English text (normal conversation)
- **System sees:** MICRO symbols (compressed format)
- **Benefit:** Massive cost savings (95-99% reduction)

### Self-Evaluation System
The AI automatically:
1. Evaluates its own responses
2. Rates accuracy, completeness, relevance
3. Predicts your satisfaction
4. Tracks scores over time
5. Improves based on feedback

### Cost Re-Examination
- Runs automatically every 24 hours
- Analyzes current cost optimization
- Identifies opportunities
- Provides recommendations
- Auto-implements safe optimizations

You can also trigger manually:
```bash
POST /api/v1/system/re-examine-costs
```

## Keyboard Shortcuts

- **Enter** - Send message
- **Shift+Enter** - New line
- **Click + Hold Mic** - Voice input

## Settings

Set your command key in the input field at the top. It's saved automatically in localStorage.

## Conversation History

- Automatically saved
- Last 50 messages loaded on page load
- Scroll to see full history
- Old messages auto-archive

## Project Management

Click any project in the left sidebar to:
- View detailed progress
- See estimated completion time
- Check status
- View related tasks

## Dashboard Metrics

All metrics update in real-time:
- Revenue/expenses from Stripe
- ROI from system calculations
- AI costs from API usage
- Performance scores from self-evaluation

## Tips

1. **Use voice input** for quick commands
2. **Upload business ideas** so system remembers them
3. **Check dashboard** regularly for health
4. **Review projects** to see what's being worked on
5. **Let system self-evaluate** - it improves over time

## Troubleshooting

### Voice Input Not Working
- Use Chrome or Edge browser
- Check microphone permissions
- Ensure HTTPS (required for Web Speech API)

### Command Key Not Working
- Check it's set correctly
- Verify in localStorage
- Try refreshing page

### Projects Not Showing
- Check if tasks are active
- Verify API endpoint is working
- Check browser console for errors

---

**The Command Center is your personal control interface - use it to communicate with your AI system and monitor your business!** 🚀
