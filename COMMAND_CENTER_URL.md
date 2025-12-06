# 🔐 Command Center URL & Activation

## Your Command Center URL

Based on your Railway deployment:

**Main URL:**
```
https://robust-magic-production.up.railway.app/activate
```

**Direct Command Center (after activation):**
```
https://robust-magic-production.up.railway.app/command-center
```

## How to Access

### Step 1: Go to Activation Page
Visit: `https://robust-magic-production.up.railway.app/activate`

### Step 2: Enter Your Key
Enter your `COMMAND_CENTER_KEY` (from Railway environment variables)

### Step 3: Activate
Click "Activate Command Center" - the system will verify your key

### Step 4: Access Command Center
You'll be automatically redirected to the Command Center

## Security

- ✅ Key is verified before access
- ✅ Key stored securely in browser (sessionStorage + localStorage)
- ✅ All API calls require the key
- ✅ Key never exposed in URLs after initial activation

## Auto-Installation

The system will automatically:
- ✅ Install missing npm packages
- ✅ Set up required dependencies
- ✅ Configure third-party apps

If a package is missing, the system will:
1. Detect the missing package
2. Automatically run `npm install`
3. Update `package.json`
4. Continue operation

## Troubleshooting

### "Invalid Key" Error
- Check your `COMMAND_CENTER_KEY` in Railway environment variables
- Make sure there are no extra spaces
- Key is case-sensitive

### "Command Center Not Found"
- Check that `command-center.html` exists in `public/overlay/`
- Verify Railway deployment completed successfully

### Packages Not Installing
- Check Railway logs for npm errors
- Verify `package.json` is in the repository
- Check Railway has npm/node installed

## Environment Variables

Make sure these are set in Railway:
- `COMMAND_CENTER_KEY` - Your secret key for access
- `DATABASE_URL` - Neon database connection
- `OPENAI_API_KEY` - For ChatGPT
- `GEMINI_API_KEY` - For Gemini
- `DEEPSEEK_API_KEY` - For DeepSeek
- `GROK_API_KEY` - For Grok

---

**Your Command Center is ready!** 🚀
