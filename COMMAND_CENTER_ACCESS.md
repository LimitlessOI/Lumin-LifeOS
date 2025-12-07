# 🎮 Command Center Access - Overlay Interface

## Quick Access

**URL:** `https://your-domain.railway.app/command-center?key=YOUR_KEY`

Replace:
- `your-domain.railway.app` with your actual Railway domain
- `YOUR_KEY` with your `COMMAND_CENTER_KEY` from environment variables

## What is the Command Center?

The Command Center is your **personal control interface** for LifeOS - like ChatGPT Pro but with:
- ✅ Full system control
- ✅ Multiple AIs in conference-style interface
- ✅ Real-time AI status (clickable dots)
- ✅ Project queue visualization
- ✅ Comprehensive ROI and company health dashboard
- ✅ File upload capabilities
- ✅ Push-to-talk voice input

## Features

### 1. **AI Status Bar**
- See which AIs are active (green dots) or inactive (red dots)
- Click any AI dot to start a conversation with that specific AI
- Real-time status updates

### 2. **Project Queue**
- See all active projects/tasks
- Progress bars and ETAs
- Click to view details

### 3. **Company Health Dashboard**
- Monthly Revenue
- Monthly Expenses
- Net Income
- ROI Ratio
- AI Cost Today
- Revenue Generated
- Accuracy Score

### 4. **Chat Interface**
- ChatGPT-like conversation
- Multiple AIs visible
- Full conversation history

### 5. **File Upload**
- Upload business ideas
- Upload context files
- Automatic indexing

## Setup

1. **Get your key:**
   - Check environment variable `COMMAND_CENTER_KEY`
   - Or set it in Railway/your hosting platform

2. **Access:**
   ```
   https://your-domain.railway.app/command-center?key=YOUR_KEY
   ```

3. **Bookmark it:**
   - The key is saved in browser storage
   - You can access without key after first visit

## Troubleshooting

**"Cannot GET /command-center"**
- Make sure the route exists in server.js
- Check that `public/overlay/command-center.html` exists

**"Invalid key"**
- Check your `COMMAND_CENTER_KEY` environment variable
- Make sure you're using the correct key in the URL

**Page not loading:**
- Check browser console for errors
- Verify the HTML file exists
- Check server logs

## File Locations

- **HTML:** `public/overlay/command-center.html`
- **JavaScript:** `public/overlay/command-center.js`
- **CSS:** `public/overlay/command-center.css`
- **Server Route:** `server.js` line ~160

---

**The Command Center is your window into LifeOS!** 🚀
