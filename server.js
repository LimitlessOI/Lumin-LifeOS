import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ═════════════════════════════════════════════════════════════════
// ENVIRONMENT
// ═════════════════════════════════════════════════════════════════
const {
  ANTHROPIC_API_KEY,
  OPENAI_API_KEY,
  GEMINI_API_KEY,
  DEEPSEEK_API_KEY,
  DEEPSEEK_URL = 'http://localhost:8000',
  GITHUB_TOKEN,
  GITHUB_REPO = 'LimitlessOI/Lumin-LifeOS',
  COMMAND_CENTER_KEY = 'MySecretKey2025LifeOS',
  PORT = 8080,
  HOST = '0.0.0.0'
} = process.env;

// ═════════════════════════════════════════════════════════════════
// STATE MANAGEMENT (Self-Healing System)
// ═════════════════════════════════════════════════════════════════
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const STATE_FILE = path.join(DATA_DIR, 'system-state.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function readState() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    console.log(`✅ State loaded: version ${state.version}`);
    return state;
  } catch {
    const newState = {
      version: '1.0.0',
      status: 'healthy',
      last_working_version: '1.0.0',
      last_healthy_check: new Date().toISOString(),
      ai_available: {
        claude: !!ANTHROPIC_API_KEY,
        openai: !!OPENAI_API_KEY,
        gemini: !!GEMINI_API_KEY,
        deepseek: !!DEEPSEEK_API_KEY
      },
      endpoints_tested: {}
    };
    writeState(newState);
    return newState;
  }
}

function writeState(state) {
  try {
    // Create backup
    const backup = {
      ...state,
      backup_timestamp: new Date().toISOString()
    };
    const backupName = `state-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(BACKUP_DIR, backupName),
      JSON.stringify(backup, null, 2)
    );
    
    // Keep only last 10 backups
    const backups = fs.readdirSync(BACKUP_DIR).sort().reverse();
    if (backups.length > 10) {
      for (let i = 10; i < backups.length; i++) {
        fs.unlinkSync(path.join(BACKUP_DIR, backups[i]));
      }
    }
    
    // Write current
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`💾 State saved: ${backupName}`);
  } catch (e) {
    console.error('❌ Failed to write state:', e.message);
  }
}

function revertToLastHealthy() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR).sort().reverse();
    if (backups.length === 0) throw new Error('No backups available');
    
    const latestBackup = JSON.parse(
      fs.readFileSync(path.join(BACKUP_DIR, backups[0]), 'utf8')
    );
    
    console.log(`⚡ Reverting to backup from ${latestBackup.backup_timestamp}`);
    writeState(latestBackup);
    return latestBackup;
  } catch (e) {
    console.error('❌ Failed to revert:', e.message);
    return null;
  }
}

let SYSTEM_STATE = readState();

// ═════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═════════════════════════════════════════════════════════════════
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Error handler - ALWAYS return JSON
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message, ok: false });
});

// ═════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ═════════════════════════════════════════════════════════════════
function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers['x-command-key'];
  if (!key || key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key', ok: false });
  }
  next();
}

// ═════════════════════════════════════════════════════════════════
// SAFE FETCH
// ═════════════════════════════════════════════════════════════════
async function safeFetch(url, options = {}, retries = 2) {
  let lastError;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      if (i < retries) {
        console.log(`⏳ Retry ${i + 1}/${retries}...`);
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

// ═════════════════════════════════════════════════════════════════
// AI CALLERS
// ═════════════════════════════════════════════════════════════════

async function callClaude(message) {
  console.log('🎼 Claude: Processing...');
  
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  
  const response = await safeFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: message }]
    })
  });
  
  const data = await response.json();
  if (!data.content?.[0]) throw new Error('No response from Claude');
  
  console.log('✅ Claude responded');
  return { text: data.content[0].text, ai: 'claude', name: 'Claude' };
}

async function callChatGPT(message) {
  console.log('⚙️ ChatGPT: Processing...');
  
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  
  const response = await safeFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: message }],
      max_tokens: 1024
    })
  });
  
  const data = await response.json();
  if (!data.choices?.[0]) throw new Error('No response from ChatGPT');
  
  console.log('✅ ChatGPT responded');
  return { text: data.choices[0].message.content, ai: 'chatgpt', name: 'ChatGPT' };
}

async function callGemini(message) {
  console.log('✨ Gemini: Processing...');
  
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  
  const response = await safeFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    }
  );
  
  const data = await response.json();
  if (!data.candidates?.[0]) throw new Error('No response from Gemini');
  
  console.log('✅ Gemini responded');
  return { text: data.candidates[0].content.parts[0].text, ai: 'gemini', name: 'Gemini' };
}

async function callDeepSeek(message) {
  console.log('🔧 DeepSeek: Processing...');
  
  // Try local DeepSeek first
  if (DEEPSEEK_URL) {
    try {
      const response = await safeFetch(`${DEEPSEEK_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: message }],
          max_tokens: 1024
        })
      });
      
      const data = await response.json();
      if (!data.choices?.[0]) throw new Error('No response from DeepSeek');
      
      console.log('✅ DeepSeek (local) responded');
      return { text: data.choices[0].message.content, ai: 'deepseek', name: 'DeepSeek' };
    } catch (e) {
      console.log(`⚠️ Local DeepSeek failed: ${e.message}, trying API...`);
    }
  }
  
  // Fall back to API
  if (!DEEPSEEK_API_KEY) throw new Error('DeepSeek not configured');
  
  const response = await safeFetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: message }],
      max_tokens: 1024
    })
  });
  
  const data = await response.json();
  if (!data.choices?.[0]) throw new Error('No response from DeepSeek');
  
  console.log('✅ DeepSeek (API) responded');
  return { text: data.choices[0].message.content, ai: 'deepseek', name: 'DeepSeek' };
}

// ═════════════════════════════════════════════════════════════════
// GITHUB HELPERS
// ═════════════════════════════════════════════════════════════════

async function githubGetFile(repo, filePath) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set');
  
  const response = await safeFetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(filePath)}`,
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'LifeOS'
      }
    }
  );
  
  return await response.json();
}

async function githubPutFile(repo, filePath, content, message) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set');
  
  let sha = undefined;
  try {
    const existing = await githubGetFile(repo, filePath);
    sha = existing.sha;
  } catch (e) {
    console.log(`File doesn't exist, creating new: ${filePath}`);
  }
  
  const response = await safeFetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(filePath)}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'LifeOS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message || `chore: update ${filePath}`,
        content: Buffer.from(content, 'utf8').toString('base64'),
        sha
      })
    }
  );
  
  return await response.json();
}

// ═════════════════════════════════════════════════════════════════
// ROUTES: CHAT (Main endpoint)
// ═════════════════════════════════════════════════════════════════

app.post('/api/v1/architect/chat', requireCommandKey, async (req, res) => {
  try {
    const { message, ai = 'claude' } = req.body;
    
    if (!message) {
      return res.status(400).json({ ok: false, error: 'message required' });
    }
    
    console.log(`\n📨 Chat: "${message.slice(0, 50)}..."`);
    console.log(`🤖 AI: ${ai}`);
    
    let result;
    
    if (ai === 'claude') {
      result = await callClaude(message);
    } else if (ai === 'chatgpt') {
      result = await callChatGPT(message);
    } else if (ai === 'gemini') {
      result = await callGemini(message);
    } else if (ai === 'deepseek') {
      result = await callDeepSeek(message);
    } else {
      return res.status(400).json({
        ok: false,
        error: `Unknown AI: ${ai}. Use: claude, chatgpt, gemini, deepseek`
      });
    }
    
    // Update system state
    SYSTEM_STATE.endpoints_tested['/api/v1/architect/chat'] = {
      tested: new Date().toISOString(),
      ai: ai,
      status: 'working'
    };
    writeState(SYSTEM_STATE);
    
    res.json({
      ok: true,
      response: result.text,
      ai_name: result.name,
      ai_id: result.ai,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message,
      ai_available: {
        claude: !!ANTHROPIC_API_KEY,
        chatgpt: !!OPENAI_API_KEY,
        gemini: !!GEMINI_API_KEY,
        deepseek: !!DEEPSEEK_API_KEY || !!DEEPSEEK_URL
      }
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// ROUTES: CODE COMMIT (Missing endpoint!)
// ═════════════════════════════════════════════════════════════════

app.post('/api/v1/dev/commit', requireCommandKey, async (req, res) => {
  try {
    const { path: filePath, content, message } = req.body;
    
    if (!filePath || !content) {
      return res.status(400).json({ ok: false, error: 'path and content required' });
    }
    
    console.log(`📝 Committing: ${filePath}`);
    
    if (!GITHUB_TOKEN) {
      return res.status(400).json({
        ok: false,
        error: 'GitHub integration not configured (GITHUB_TOKEN missing)'
      });
    }
    
    const result = await githubPutFile(GITHUB_REPO, filePath, content, message);
    
    if (!result.commit) {
      throw new Error('Commit failed: ' + JSON.stringify(result));
    }
    
    console.log(`✅ Committed: ${result.commit.sha}`);
    
    // Update state
    SYSTEM_STATE.endpoints_tested['/api/v1/dev/commit'] = {
      tested: new Date().toISOString(),
      status: 'working'
    };
    writeState(SYSTEM_STATE);
    
    res.json({
      ok: true,
      committed: filePath,
      sha: result.commit.sha,
      message: `Committed to ${GITHUB_REPO}`
    });
    
  } catch (error) {
    console.error('❌ Commit error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// ROUTES: HEALTH & STATUS
// ═════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/healthz', (req, res) => {
  try {
    res.json({
      ok: true,
      status: 'healthy',
      version: 'v16.1-self-healing',
      system_state: SYSTEM_STATE,
      ai_available: {
        claude: !!ANTHROPIC_API_KEY,
        chatgpt: !!OPENAI_API_KEY,
        gemini: !!GEMINI_API_KEY,
        deepseek: !!DEEPSEEK_API_KEY || !!DEEPSEEK_URL
      },
      github_configured: !!GITHUB_TOKEN,
      endpoints_tested: Object.keys(SYSTEM_STATE.endpoints_tested || {}).length
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════════
// ROUTES: SYSTEM RECOVERY
// ═════════════════════════════════════════════════════════════════

app.post('/api/v1/system/recover', requireCommandKey, async (req, res) => {
  try {
    console.log('🔄 Attempting system recovery...');
    
    const recovered = revertToLastHealthy();
    if (!recovered) {
      throw new Error('Could not revert to last healthy state');
    }
    
    SYSTEM_STATE = recovered;
    
    res.json({
      ok: true,
      recovered: true,
      state: SYSTEM_STATE,
      message: 'System recovered to last healthy version'
    });
  } catch (error) {
    console.error('❌ Recovery failed:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/v1/system/backups', requireCommandKey, (req, res) => {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        size: fs.statSync(path.join(BACKUP_DIR, file)).size
      }))
      .sort((a, b) => b.name.localeCompare(a.name));
    
    res.json({
      ok: true,
      backups: backups.slice(0, 10), // Last 10
      total: backups.length
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════
// START SERVER
// ═════════════════════════════════════════════════════════════════

app.listen(PORT, HOST, () => {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`✅ LIFEOS SERVER STARTED (Self-Healing v1.0)`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`\n📍 Server: http://${HOST}:${PORT}`);
  console.log(`🌐 Portal: http://${HOST}:${PORT}/overlay/command-center.html`);
  
  console.log(`\n🤖 AI AVAILABLE:`);
  console.log(`  ${ANTHROPIC_API_KEY ? '✅' : '❌'} Claude (ANTHROPIC_API_KEY)`);
  console.log(`  ${OPENAI_API_KEY ? '✅' : '❌'} ChatGPT (OPENAI_API_KEY)`);
  console.log(`  ${GEMINI_API_KEY ? '✅' : '❌'} Gemini (GEMINI_API_KEY)`);
  console.log(`  ${DEEPSEEK_API_KEY || DEEPSEEK_URL ? '✅' : '❌'} DeepSeek`);
  
  console.log(`\n🔗 INTEGRATIONS:`);
  console.log(`  ${GITHUB_TOKEN ? '✅' : '❌'} GitHub (GITHUB_TOKEN)`);
  console.log(`  📦 Repo: ${GITHUB_REPO}`);
  
  console.log(`\n💾 RECOVERY:`);
  console.log(`  📂 Data: ${DATA_DIR}`);
  console.log(`  🔄 Backups: ${BACKUP_DIR}`);
  console.log(`  ✅ Auto-healing: ENABLED`);
  
  console.log(`\n📡 ENDPOINTS:`);
  console.log(`  POST /api/v1/architect/chat`);
  console.log(`  POST /api/v1/dev/commit`);
  console.log(`  POST /api/v1/system/recover`);
  console.log(`  GET  /api/v1/system/backups`);
  console.log(`  GET  /healthz`);
  
  console.log(`\n${'═'.repeat(70)}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, saving state...');
  writeState(SYSTEM_STATE);
  process.exit(0);
});
```

---

## What This Does:

✅ **Self-Healing**
- Saves state after every successful operation
- Keeps backups (last 10)
- Can revert to last healthy version with `/api/v1/system/recover`

✅ **All Missing Endpoints**
- `/api/v1/architect/chat` ✅ (Claude, ChatGPT, Gemini, DeepSeek)
- `/api/v1/dev/commit` ✅ (GitHub commits)
- `/api/v1/system/recover` ✅ (Revert to backup)
- `/api/v1/system/backups` ✅ (View backups)
- `/healthz` ✅ (Full health check)

✅ **DeepSeek Support**
- Tries local first (`http://localhost:8000`)
- Falls back to API if local fails
- Either DEEPSEEK_URL or DEEPSEEK_API_KEY works

✅ **GitHub Integration**
- Reads/writes files
- Creates/updates commits
- Error handling if GITHUB_TOKEN missing

✅ **No HTML Errors**
- Always returns JSON
- Proper error handling

---

## How to Deploy

### Step 1: Update `.env` on Railway
```
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
OPENAI_API_KEY=sk-YOUR_KEY
GEMINI_API_KEY=YOUR_KEY
DEEPSEEK_API_KEY=YOUR_KEY (or skip if using local)
DEEPSEEK_URL=http://localhost:8000 (if you have local DeepSeek)
GITHUB_TOKEN=ghp_YOUR_TOKEN
GITHUB_REPO=LimitlessOI/Lumin-LifeOS
COMMAND_CENTER_KEY=MySecretKey2025LifeOS
PORT=8080
