/**
 * Command & Control - Enhanced cockpit with Now Bar, Queue, and Chat.
 */

const workItems = [];
let chatVoiceController = null;
const conversationKey = 'commandCenterConversations';
const chatModes = [
  {
    id: 'ollama',
    label: 'Ollama Local',
    endpoint: '/api/v1/council/route',
    help: 'Fast local Ollama AI (free, runs on your machine).',
  },
  {
    id: 'groq_free',
    label: 'Groq Free',
    endpoint: '/api/v1/chat',
    member: 'groq_llama',
    help: 'Free Groq route. Requires GROQ_API_KEY on the server.',
  },
  {
    id: 'gemini_free',
    label: 'Gemini Free',
    endpoint: '/api/v1/chat',
    member: 'gemini_flash',
    help: 'Free Gemini Flash route. Requires GEMINI_API_KEY or LIFEOS_GEMINI_KEY.',
  },
  {
    id: 'cerebras_free',
    label: 'Cerebras Free',
    endpoint: '/api/v1/chat',
    member: 'cerebras_llama',
    help: 'Free Cerebras route. Requires CEREBRAS_API_KEY.',
  },
  {
    id: 'openrouter_free',
    label: 'OpenRouter Free',
    endpoint: '/api/v1/chat',
    member: 'openrouter_free',
    help: 'Free OpenRouter route. Requires OPENROUTER_API_KEY.',
  },
  {
    id: 'mistral_free',
    label: 'Mistral Free',
    endpoint: '/api/v1/chat',
    member: 'mistral_free',
    help: 'Free Mistral route. Requires MISTRAL_API_KEY.',
  },
  {
    id: 'together_free',
    label: 'Together Free',
    endpoint: '/api/v1/chat',
    member: 'together_free',
    help: 'Free/shared Together route. Requires TOGETHER_API_KEY.',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    endpoint: '/api/v1/chat',
    member: 'gemini',
    help: 'Spark creative ideas, research options, and surface winning paths.',
  },
  {
    id: 'plan',
    label: 'Plan',
    endpoint: '/api/v1/chat',
    member: 'chatgpt',
    help: 'Break down work into next steps, risks, and acceptance criteria.',
  },
  {
    id: 'execute',
    label: 'Execute',
    endpoint: '/api/v1/chat',
    member: 'chatgpt',
    help: 'Drive tactical execution, debugging, scripts, or spreadsheets.',
  },
  {
    id: 'council',
    label: 'Council',
    endpoint: '/api/v1/council/consensus/enhanced',
    help: 'Run the multi-model consensus protocol (needs COMMAND_CENTER_KEY).',
  },
  {
    id: 'task',
    label: 'Task',
    endpoint: '/api/v1/task',
    help: 'Queue a task for the execution pipeline (type: command-center).',
  },
  {
    id: 'self_program',
    label: 'Self-Program',
    endpoint: '/api/v1/system/self-program',
    help: 'Give a self-programming instruction; the council will analyze & act.',
  },
];
const FREE_CLOUD_MEMBERS = ['groq_llama', 'gemini_flash', 'cerebras_llama', 'openrouter_free', 'mistral_free', 'together_free'];
const councilMembers = ['claude', 'chatgpt', 'gemini', 'deepseek', 'grok', ...FREE_CLOUD_MEMBERS];
const memberLabels = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  grok: 'Grok',
  groq_llama: 'Groq Free',
  gemini_flash: 'Gemini Flash',
  cerebras_llama: 'Cerebras',
  openrouter_free: 'OpenRouter Free',
  mistral_free: 'Mistral Free',
  together_free: 'Together Free',
};
const specialMemberNames = {
  council: 'Council Decision',
  task: 'Task Queue',
  self_program: 'Self-Program',
};
let conversationLog = [];
let overrideMode = null;
let selectedCouncilMembers = new Set(['claude', 'chatgpt', 'gemini']);
let activeChatMode = 'ollama'; // Default to Ollama local AI
let autoRefreshInterval = null;
let lastBuilderStatus = null;

function getHeaders(json = true) {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  const authKey =
    localStorage.getItem('LIFEOS_KEY') ||
    localStorage.getItem('COMMAND_CENTER_KEY') ||
    localStorage.getItem('lifeos_cmd_key');
  if (authKey) {
    headers['x-api-key'] = authKey;
    headers['x-lifeos-key'] = authKey;
    headers['x-command-key'] = authKey;
    headers['x-command-center-key'] = authKey;
  }
  return headers;
}

function getCommandHeaders(json = true) {
  const headers = getHeaders(json);
  const commandKey = getCommandCenterKey();
  if (commandKey) {
    headers['x-command-key'] = commandKey;
    headers['x-command-center-key'] = commandKey;
    headers['x-lifeos-key'] = commandKey;
  }
  return headers;
}

async function fetchCommandJson(path) {
  const res = await fetch(path, { headers: getCommandHeaders(false) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text || 'Request failed'}`);
  }
  return res.json();
}

async function postCommandJson(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: getCommandHeaders(true),
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text || 'Request failed'}`);
  }
  return res.json();
}

async function fetchJson(path) {
  const response = await fetch(path, { headers: getHeaders() });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${response.status}: ${text}`);
  }
  return response.json();
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (response.status === 429) {
    const retry = response.headers.get('Retry-After') || 'a few seconds';
    const error = new Error(`429 Rate limited (retry in ${retry}s)`);
    error.isRateLimit = true;
    showRateLimit(`Rate limited. Retry after ${retry}s.`);
    throw error;
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${response.status}: ${text || 'Request failed'}`);
  }
  showRateLimit('');
  return response.json();
}

async function updateSearchStats() {
  const countEl = document.getElementById('searchCount');
  const remainingEl = document.getElementById('searchRemaining');
  try {
    const res = await fetch('/api/v1/admin/search/history', {
      headers: getCommandHeaders(false),
    });
    if (!res.ok) throw new Error('Failed to load search history');
    const data = await res.json();
    countEl.textContent = data.todayCount || 0;
    remainingEl.textContent = data.remaining || data.dailyLimit || 0;
  } catch (error) {
    countEl.textContent = '—';
    remainingEl.textContent = '—';
  }
}

function renderSearchResults(results) {
  const container = document.getElementById('searchResults');
  container.innerHTML = '';
  if (!results || !results.length) {
    container.innerHTML = '<p>No results</p>';
    return;
  }
  results.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'search-result';
    card.innerHTML = `
      <strong>${item.type || "result"}</strong>
      <p>${item.content}</p>
      <small>Source: ${item.source || "unknown"}</small>
    `;
    container.appendChild(card);
  });
}

async function performSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;
  const payload = {
    query,
    context: {
      purpose: "decision_support",
      proof: [{ type: "human_confirm", value: "User requested safe search" }],
    },
    requireProof: true,
  };
  try {
    const result = await postJson('/api/v1/search', payload);
    renderSearchResults(result.results || []);
    updateSearchStats();
  } catch (error) {
    renderSearchResults([{ type: "error", content: error.message || "Search failed" }]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchButton')?.addEventListener('click', performSearch);
  document.getElementById('clearSearch')?.addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
  });
  updateSearchStats();
});

function setKillSwitchMessage(text) {
  const el = document.getElementById('killSwitchMessage');
  if (el) {
    el.textContent = text || '';
  }
}

async function refreshSafetyStatus() {
  const statusEl = document.getElementById('killSwitchStatus');
  const reasonEl = document.getElementById('killSwitchReason');
  const updatedEl = document.getElementById('killSwitchUpdated');
  const hashEl = document.getElementById('realityHashLabel');
  setKillSwitchMessage('');
  try {
    const status = await fetchCommandJson('/api/v1/admin/ai/status');
    if (statusEl) {
      statusEl.textContent = status.aiEnabled ? 'ENABLED' : 'DISABLED';
      statusEl.className = status.aiEnabled ? 'status-ok' : 'status-error';
    }
    if (reasonEl) reasonEl.textContent = status.reason || '—';
    if (updatedEl) updatedEl.textContent = status.updatedAt ? new Date(status.updatedAt).toLocaleString() : '—';
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = 'Unavailable';
      statusEl.className = 'status-warning';
    }
    setKillSwitchMessage(error.message);
  }

  try {
    const snapshot = await fetchJson('/api/v1/reality/snapshot');
    if (hashEl) {
      hashEl.textContent = snapshot.hash ? `${snapshot.hash.slice(0, 16)}…` : '—';
    }
  } catch (error) {
    if (hashEl) {
      hashEl.textContent = 'snapshot error';
    }
  }
}

async function toggleAi(enable) {
  const defaultReason = enable ? 'manual-enable' : 'manual-disable';
  const reason = prompt(`Reason to ${enable ? 'enable' : 'disable'} AI:`, defaultReason);
  if (reason === null) return;
  const payload = { reason: reason.trim() || defaultReason };
  const endpoint = `/api/v1/admin/ai/${enable ? 'enable' : 'disable'}`;
  try {
    await postCommandJson(endpoint, payload);
    setKillSwitchMessage('');
    refreshSafetyStatus();
    refresh();
  } catch (error) {
    setKillSwitchMessage(error.message);
  }
}

function updateHealthPanel(text, ok = true) {
  document.getElementById('healthStatus').innerHTML = ok
    ? '<span class="status-ok">✓ System OK</span>'
    : `<span class="status-error">✗ ${text}</span>`;
}

function updateNowBar(builderStatus) {
  const mode = overrideMode || (builderStatus?.builder?.buildInProgress ? 'RUNNING' : 'PAUSED');
  document.getElementById('modeBadge').textContent = `Mode: ${mode}`;

  const pending = builderStatus?.opportunities?.revenue?.pending || 0;
  const running = builderStatus?.builds?.total || 0;
  const failed = builderStatus?.builder?.components?.filter(c => c.status === 'failed').length || 0;
  document.getElementById('queueSummary').textContent = `Queue: Pending ${pending} · Running ${running} · Failed ${failed}`;

  const lastAction = builderStatus?.builder
    ? `Auto-builder: last run ${builderStatus.opportunities?.revenue?.avg_time || 0}m ago`
    : 'Last action: waiting to build';
  document.getElementById('lastAction').textContent = lastAction;
}

function buildWorkItems(builderStatus = {}, toolsStatus = {}) {
  workItems.length = 0;
  const components = builderStatus?.builder?.components || [];
  components.forEach((comp, index) => {
    workItems.push({
      id: `build-${index}`,
      type: comp.type || 'build',
      title: comp.name || `Component ${index + 1}`,
      status: comp.status || 'pending',
      progress: comp.status === 'complete' ? 100 : comp.status === 'failed' ? 0 : 35,
      summary: comp.summary || `Touching ${comp.file || 'files'}`,
      current_step: comp.status === 'pending' ? 'Queued' : comp.status === 'failed' ? 'Review error' : 'Generating',
      last_event: comp.error || 'Awaiting model response',
      age_seconds: comp.started_at ? Math.max(1, Math.floor((Date.now() - new Date(comp.started_at).getTime()) / 1000)) : 0,
      details_url: comp.file,
      logs_tail: comp.logs || (comp.error ? [comp.error] : []),
      timeline: comp.timeline || [],
      artifacts: comp.artifacts || (comp.file ? [{ label: 'File', value: comp.file }] : []),
    });
  });

  const models = (toolsStatus?.ollama?.models || []).slice(0, 3);
  if (models.length > 0) {
    workItems.push({
      id: 'tools-model',
      type: 'maintenance',
      title: 'Model Readiness',
      status: toolsStatus.ollama?.available ? 'running' : 'blocked',
      progress: toolsStatus.ollama?.available ? 60 : 20,
      summary: `${models.length} models loaded`,
      current_step: toolsStatus.ollama?.available ? 'Monitoring response times' : 'Waiting for models',
      last_event: `Latest model: ${models[0]}`,
      age_seconds: 0,
      logs_tail: [],
      timeline: toolsStatus.ollama?.latency?.map(l => `Latency ${l.name}: ${l.value}`) || [],
      artifacts: [],
    });
  }
}

function renderQueueItems() {
  const list = document.getElementById('queueList');
  if (!workItems.length) {
    list.innerHTML = '<p>No work items yet.</p>';
    return;
  }
  list.innerHTML = '';
  workItems.forEach(item => {
    const el = document.createElement('div');
    el.className = 'queue-item';
    el.title = `Step: ${item.current_step}\nLast: ${item.last_event}`;
    el.addEventListener('click', () => openDrawer(item));
    el.innerHTML = `      <div class="icon">${getIconForType(item.type)}</div>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <div class="status-pill">${item.status}</div>
        <div class="progress"><span style="width:${item.progress || 0}%;"></span></div>
        <div style="font-size:12px; color:#8fbfff;">${escapeHtml(item.summary)}</div>
      </div>
      <div style="text-align:right; font-size:12px;">
        <div>${formatAge(item.age_seconds)}</div>
        <div>${escapeHtml(item.current_step)}</div>
      </div>
      <div class="queue-tooltip">
        <div><strong>Step:</strong> ${escapeHtml(item.current_step)}</div>
        <div><strong>Last:</strong> ${escapeHtml(item.last_event)}</div>
        <div><strong>Next:</strong> ${escapeHtml(item.summary)}</div>
      </div>
`;
    list.appendChild(el);
  });
}

function getIconForType(type) {
  switch (type) {
    case 'build': return '🧱';
    case 'website': return '🌐';
    case 'chat': return '🧠';
    case 'revenue': return '💰';
    case 'maintenance': return '🛠';
    case 'task': return '📋';
    default: return '⚡';
  }
}

function formatAge(seconds) {
  if (!seconds) return 'pending';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

function openDrawer(item) {
  const timelineItems = (item.timeline || []).map(line => `<li>${escapeHtml(line)}</li>`).join('') || '<li>No timeline events.</li>';
  const logItems = (item.logs_tail || []).map(line => `<li>${escapeHtml(line)}</li>`).join('') || '<li>No logs yet.</li>';
  const artifactItems = (item.artifacts || []).map(art => `<li>${escapeHtml(art.label || 'Artifact')}: ${escapeHtml(art.value)}</li>`).join('') || '<li>No artifacts yet.</li>';
  const content = document.getElementById('drawerContent');
  content.innerHTML = `
    <p><strong>${escapeHtml(item.title)}</strong></p>
    <p>Status: ${item.status}</p>
    <p>Step: ${escapeHtml(item.current_step)}</p>
    <p>Summary: ${escapeHtml(item.summary)}</p>
    ${item.details_url ? `<p>Target: <code>${escapeHtml(item.details_url)}</code></p>` : ''}
    <div class="status-card" style="margin-top:10px;">
      <h3>Timeline</h3>
      <ol>${timelineItems}</ol>
    </div>
    <div class="status-card" style="margin-top:10px;">
      <h3>Logs</h3>
      <ul>${logItems}</ul>
    </div>
    <div class="status-card" style="margin-top:10px;">
      <h3>Artifacts</h3>
      <ul>${artifactItems}</ul>
    </div>
    <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
      <button onclick="drawerAction('retry', '${item.id}')">Retry</button>
      <button onclick="drawerAction('cancel', '${item.id}')">Cancel</button>
      <button onclick="drawerAction('escalate', '${item.id}')">Escalate</button>
    </div>
  `;
  document.getElementById('detailDrawer').classList.add('open');
}

function closeDrawer() {
  document.getElementById('detailDrawer').classList.remove('open');
}

function drawerAction(action, id) {
  console.log(`Drawer action ${action} on ${id}`);
}

function updateToolsPanel(data) {
  let summary = '';
  if (data.ok) {
    summary += '<span class="status-ok">✓ Tools API OK</span><br>';
    if (Array.isArray(data.commands)) {
      const successes = data.commands.filter(c => c.success).length;
      summary += `<p>Commands: ${data.commands.length} total · ${successes} successful</p>`;
    }
    if (data.ollama) {
      const modelCount = Array.isArray(data.ollama.models) ? data.ollama.models.length : 0;
      const available = data.ollama.available ? 'Available' : 'Unavailable';
      const statusClass = data.ollama.available ? 'status-ok' : 'status-error';
      summary += `<p>Ollama: <span class="${statusClass}">${available}</span>${modelCount ? ` · ${modelCount} models loaded` : ''}</p>`;

      if (data.ollama.available && Array.isArray(data.ollama.models) && data.ollama.models.length > 0) {
        summary += `<div class="status-card"><h3>Available Models</h3><ul style="margin:0; padding-left:20px; font-size:12px;">`;
        data.ollama.models.slice(0, 5).forEach(model => {
          summary += `<li>${escapeHtml(model)}</li>`;
        });
        if (data.ollama.models.length > 5) {
          summary += `<li><em>+ ${data.ollama.models.length - 5} more...</em></li>`;
        }
        summary += `</ul></div>`;
      }
    }
  } else {
    summary = '<span class="status-warning">⚠ Tools API returned ok:false</span>';
  }
  document.getElementById('toolsStatus').innerHTML = summary;
  document.getElementById('toolsRaw').textContent = JSON.stringify(data, null, 2);
  const bannerMessage = data.rate_limit?.remaining !== undefined
    ? `Tool quota remaining: ${data.rate_limit.remaining}`
    : data.commands?.find(c => /limit/i.test(c.status || ''))
      ? 'Tool warning: rate limit triggered' : '';
  showRateLimit(bannerMessage);
}

function updateBuilderPanel(data) {
  let summary = '';
  if (data.ok) {
    summary += '<span class="status-ok">✓ Auto-Builder OK</span>';
    if (data.builder?.product) {
      summary += `<div class="status-card"><h3>Current Product</h3><p>${escapeHtml(data.builder.product)}</p>`;
      if (Array.isArray(data.builder.components)) {
        summary += '<div class="component-list">';
        data.builder.components.forEach(comp => {
          const statusClass = comp.status === 'complete' ? 'status-ok'
            : comp.status === 'failed' ? 'status-error' : 'status-warning';
          summary += `
            <div class="component-item">
              <span>${escapeHtml(comp.name)}</span>
              <span class="${statusClass}">${comp.status || 'pending'}</span>
            </div>`;
        });
        summary += '</div>';
      }
      summary += '</div>';
    }
    if (data.builds) {
      summary += `
        <div class="status-card">
          <h3>Build Statistics</h3>
          <p>Total Builds: ${data.builds.total || 0}</p>
          <p>Deployed: ${data.builds.deployed || 0}</p>
        </div>`;
    }
  } else {
    summary = '<span class="status-warning">⚠ Auto-Builder returned ok:false</span>';
  }
  document.getElementById('builderStatus').innerHTML = summary;
  document.getElementById('builderRaw').textContent = JSON.stringify(data, null, 2);
}

function updateFreeTierPanel(freeTierData, councilHealthData) {
  const panel = document.getElementById('freeTierStatus');
  const raw = document.getElementById('freeTierRaw');
  if (!panel || !raw) return;

  const healthByMember = new Map(
    (councilHealthData?.members || []).map(member => [member.member, member])
  );

  let html = '';
  if (freeTierData?.ok === false) {
    html = `<span class="status-error">✗ ${escapeHtml(freeTierData.error || 'Free-tier status unavailable')}</span>`;
  } else {
    html += '<div class="status-card"><h3>Free Provider Pool</h3>';
    FREE_CLOUD_MEMBERS.forEach(member => {
      const providerKey = member.replace(/_(llama|flash|free)$/,'');
      const freeStatus = freeTierData?.providers?.[providerKey] || null;
      const health = healthByMember.get(member) || null;
      const configured = health && health.error !== 'api_key_missing';
      const online = Boolean(health?.ok);
      const statusClass = online ? 'status-ok' : configured ? 'status-warning' : 'status-error';
      const statusText = online ? 'ONLINE' : configured ? 'CONFIGURED' : 'MISSING KEY';
      const requestPct = freeStatus?.requests?.pct;
      const requestText = requestPct === null || requestPct === undefined
        ? 'n/a'
        : `${requestPct}%`;
      html += `<div class="component-item"><span>${escapeHtml(memberLabels[member] || member)}</span><span class="${statusClass}">${statusText} · used ${requestText}</span></div>`;
    });
    html += '</div>';
  }

  panel.innerHTML = html;
  raw.textContent = JSON.stringify({
    freeTier: freeTierData,
    councilHealth: councilHealthData,
  }, null, 2);
}

function showRateLimit(message) {
  const banner = document.getElementById('rateLimitBanner');
  if (!banner) return;
  if (message) {
    banner.textContent = message;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initChatModes() {
  const container = document.getElementById('chatModePills');
  if (!container) return;
  container.innerHTML = '';
  chatModes.forEach(mode => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill';
    btn.dataset.mode = mode.id;
    btn.innerHTML = `<span class="pill-check" aria-hidden="true">✓</span><span>${mode.label}</span>`;
    if (mode.id === activeChatMode) {
      btn.classList.add('pill--active');
    }
    btn.addEventListener('click', () => setActiveChatMode(mode.id));
    container.appendChild(btn);
  });
  updateChatModeHelp();
}

function setActiveChatMode(modeId) {
  activeChatMode = modeId;
  document.querySelectorAll('#chatModePills .pill').forEach(btn => {
    btn.classList.toggle('pill--active', btn.dataset.mode === modeId);
  });
  updateChatModeHelp();
}

function updateChatModeHelp() {
  const helpEl = document.getElementById('chatModeHelp');
  const mode = chatModes.find(m => m.id === activeChatMode);
  if (mode?.help) {
    helpEl.textContent = `${mode.help}${mode.id === 'council' ? ` Agents: ${Array.from(selectedCouncilMembers).map(m => memberLabels[m]).join(', ')}` : ''}`;
    helpEl.style.display = 'block';
  } else {
    helpEl.style.display = 'none';
  }
}

function renderCouncilMembers() {
  const container = document.getElementById('chatMemberPills');
  if (!container) return;
  container.innerHTML = '';
  councilMembers.forEach(member => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.type = 'button';
    btn.textContent = memberLabels[member] || member;
    if (selectedCouncilMembers.has(member)) {
      btn.style.borderColor = '#4fc3f7';
      btn.style.color = '#4fc3f7';
    }
    btn.addEventListener('click', () => {
      if (selectedCouncilMembers.size === 1 && selectedCouncilMembers.has(member)) {
        return;
      }
      if (selectedCouncilMembers.has(member)) {
        selectedCouncilMembers.delete(member);
      } else {
        selectedCouncilMembers.add(member);
      }
      renderCouncilMembers();
      updateChatModeHelp();
    });
    container.appendChild(btn);
  });
}

function getActiveMode() {
  return chatModes.find(mode => mode.id === activeChatMode) || chatModes[0];
}

function formatResponsePayload(payload) {
  if (typeof payload === 'string') return payload;
  if (payload?.response) return payload.response;
  if (payload?.message) return payload.message;
  if (payload?.error) return `Error: ${payload.error}`;
  return JSON.stringify(payload, null, 2);
}

function addConversationEntry(entry) {
  conversationLog.unshift(entry);
  if (conversationLog.length > 60) conversationLog.pop();
  saveConversationLog();
  renderConversationLog();
}

function renderConversationLog() {
  const logEl = document.getElementById('chatLog');
  logEl.innerHTML = '';
  if (!conversationLog.length) {
    const placeholder = document.createElement('p');
    placeholder.textContent = 'No conversations yet.';
    logEl.appendChild(placeholder);
    return;
  }
  conversationLog.forEach(entry => {
    const container = document.createElement('div');
    container.className = 'chat-entry';
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.innerHTML = `<strong>${escapeHtml(entry.modeLabel)}</strong><span style="font-size:12px; color:#8fbfff;">${entry.memberName} · ${new Date(entry.timestamp).toLocaleTimeString()}</span>`;
    container.appendChild(header);
    const promptEl = document.createElement('p');
    promptEl.innerHTML = `<em>Prompt:</em> ${escapeHtml(entry.prompt)}`;
    container.appendChild(promptEl);
    const responseEl = document.createElement('pre');
    responseEl.style.whiteSpace = 'pre-wrap';
    responseEl.style.fontSize = '12px';
    responseEl.textContent = `Response: ${entry.response}`;
    container.appendChild(responseEl);
    const badges = document.createElement('div');
    badges.style.display = 'flex';
    badges.style.gap = '6px';
    badges.style.marginTop = '6px';
    if (entry.shelved) {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = 'Shelved';
      badges.appendChild(pill);
    }
    if (entry.resolved) {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = 'Resolved';
      badges.appendChild(pill);
    }
    container.appendChild(badges);
    const actions = document.createElement('div');
    actions.className = 'pill-row';
    const shelveBtn = document.createElement('button');
    shelveBtn.className = 'pill';
    shelveBtn.textContent = entry.shelved ? 'Unshelve idea' : 'Shelve idea';
    shelveBtn.type = 'button';
    shelveBtn.addEventListener('click', () => shelveIdea(entry.id));
    actions.appendChild(shelveBtn);
    const resolveBtn = document.createElement('button');
    resolveBtn.className = 'pill';
    resolveBtn.textContent = entry.resolved ? 'Mark unresolved' : 'Mark resolved';
    resolveBtn.type = 'button';
    resolveBtn.addEventListener('click', () => markResolved(entry.id));
    actions.appendChild(resolveBtn);
    container.appendChild(actions);
    logEl.appendChild(container);
  });
}

function shelveIdea(id) {
  toggleEntryFlag(id, 'shelved');
}

function markResolved(id) {
  toggleEntryFlag(id, 'resolved');
}

function toggleEntryFlag(id, flag) {
  const entry = conversationLog.find(e => e.id === id);
  if (!entry) return;
  entry[flag] = !entry[flag];
  saveConversationLog();
  renderConversationLog();
}

function loadConversationLog() {
  try {
    const existing = localStorage.getItem(conversationKey);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

function saveConversationLog() {
  localStorage.setItem(conversationKey, JSON.stringify(conversationLog));
}

function getCommandCenterKey() {
  return (
    localStorage.getItem('COMMAND_CENTER_KEY') ||
    localStorage.getItem('lifeos_cmd_key') ||
    localStorage.getItem('LIFEOS_KEY') ||
    ''
  );
}

function saveCommandKey() {
  const input = document.getElementById('cmdKeyInput');
  const key = input.value.trim();
  if (!key) return;
  localStorage.setItem('COMMAND_CENTER_KEY', key);
  localStorage.setItem('lifeos_cmd_key', key);
  localStorage.setItem('LIFEOS_KEY', key);
  input.value = '';
  updateCommandKeyStatus();
  refreshSafetyStatus();
}

function updateCommandKeyStatus() {
  const status = document.getElementById('cmdKeyStatus');
  const key = getCommandCenterKey();
  if (key) {
    status.innerHTML = '<span class="status-ok">✓ Command key saved</span>';
  } else {
    status.innerHTML = '<span class="status-warning">Not set</span>';
  }
}

function initChatMembers() {
  renderCouncilMembers();
}

function initChatVoice() {
  if (chatVoiceController && typeof chatVoiceController.destroy === 'function') {
    chatVoiceController.destroy();
  }
  if (!window.LifeOSVoiceChat) return;
  chatVoiceController = window.LifeOSVoiceChat.attach({
    inputId: 'chatInput',
    buttonId: 'chatVoiceButton',
    statusId: 'chatVoiceStatus',
    speakToggleId: 'chatSpeakReplies',
    storageKey: 'command_center_chat',
    idleText: 'Voice ready for operator chat',
  });
}

function submitChat() {
  const input = document.getElementById('chatInput');
  const prompt = input.value.trim();
  if (!prompt) return;
  showRateLimit('');
  input.value = '';
  const mode = getActiveMode();
  const entry = {
    id: String(Date.now()),
    timestamp: Date.now(),
    prompt,
    mode: mode.id,
    modeLabel: mode.label,
    memberName: mode.member ? (memberLabels[mode.member] || mode.member) : (specialMemberNames[mode.id] || 'Council'),
    response: 'Sending…',
    shelved: false,
    resolved: false,
  };
  addConversationEntry(entry);
  let payload;
  let endpoint = mode.endpoint;

  const sendSuccess = (resp) => {
    entry.response = formatResponsePayload(resp);

    // Special handling for different modes
    if (mode.id === 'task' && resp?.taskId) {
      entry.response += ` · Task queued: ${resp.taskId}`;
    } else if (mode.id === 'self_program') {
      // Show self-programming results with file modifications
      let spResult = '🤖 Self-Programming Complete\n\n';
      if (resp?.filesModified && resp.filesModified.length > 0) {
        spResult += '📝 Files Modified:\n';
        resp.filesModified.forEach(file => {
          spResult += `  ✓ ${file}\n`;
        });
        spResult += '\n';
      }
      if (resp?.taskId) {
        spResult += `Task ID: ${resp.taskId}\n`;
      }
      if (resp?.message) {
        spResult += `\n${resp.message}`;
      } else if (resp?.response) {
        spResult += `\n${resp.response}`;
      }
      entry.response = spResult;
    } else if (mode.id === 'ollama') {
      // Show Ollama response with metadata
      if (resp?.response) {
        entry.response = resp.response;
        if (resp?.model) {
          entry.response += `\n\n[Model: ${resp.model}]`;
        }
        if (resp?.tier !== undefined) {
          entry.response += ` [Tier: ${resp.tier}]`;
        }
      }
    }

    saveConversationLog();
    renderConversationLog();
    if (chatVoiceController) chatVoiceController.speak(entry.response);
    showRateLimit('');
  };

  const sendError = (error) => {
    entry.response = `Error: ${error.message}`;
    saveConversationLog();
    renderConversationLog();
    if (!error.isRateLimit) {
      showRateLimit(`Chat error: ${error.message}`);
    }
  };

  let requestPromise;
  if (mode.id === 'ollama') {
    // Route through Ollama local AI
    payload = {
      task: prompt,
      taskType: 'general',
      riskLevel: 'low',
      userFacing: false,
      revenueImpact: 'low',
    };
    requestPromise = postJson(endpoint, payload);
  } else if (mode.id === 'council') {
    payload = { decision: prompt, agents: Array.from(selectedCouncilMembers) };
    requestPromise = postJson(endpoint, payload);
  } else if (mode.id === 'task') {
    payload = { description: prompt, type: 'command-center' };
    requestPromise = postJson(endpoint, payload);
  } else if (mode.id === 'self_program') {
    payload = { instruction: prompt, priority: 'high', autoDeploy: true };
    requestPromise = postJson(endpoint, payload);
  } else {
    payload = { message: prompt, member: mode.member, autoImplement: false };
    requestPromise = postJson(endpoint, payload);
  }

  requestPromise.then(sendSuccess).catch(sendError);
}

function refresh() {
  const timestamp = new Date().toLocaleTimeString();
  document.getElementById('lastUpdate').textContent = `Last update: ${timestamp}`;

  const classifyErr = (e) => {
    const msg = (e && e.message) ? e.message : String(e || 'unknown error');
    if (/401|403|unauthorized/i.test(msg)) return 'UNAUTHORIZED';
    if (/404|not found/i.test(msg)) return 'NOT_FOUND';
    if (/Failed to fetch|NetworkError|ECONNREFUSED/i.test(msg)) return 'OFFLINE';
    return 'ERROR';
  };

  Promise.allSettled([
    fetchCommandJson('/api/health'),
    fetchJson('/api/v1/tools/status'),
    fetchJson('/api/v1/auto-builder/status'),
    fetchCommandJson('/api/v1/twin/free-tier'),
    fetchCommandJson(`/api/v1/council/health?members=${encodeURIComponent(FREE_CLOUD_MEMBERS.join(','))}`),
  ]).then(async ([healthResult, toolsResult, builderResult, freeTierResult, freeHealthResult]) => {
    // health
    if (healthResult.status === 'fulfilled') {
      updateHealthPanel('System OK', healthResult.value.server === 'ok');
    } else {
      updateHealthPanel(`Health: ${classifyErr(healthResult.reason)}`, false);
    }

    // tools
    if (toolsResult.status === 'fulfilled') {
      updateToolsPanel(toolsResult.value);
      updateOllamaStatus(toolsResult.value);
    } else {
      const kind = classifyErr(toolsResult.reason);
      document.getElementById('toolsStatus').innerHTML =
        `<span class="status-error">✗ Tools: ${kind}</span>`;
      document.getElementById('toolsRaw').textContent = 'No data';
      const ollamaStatusEl = document.getElementById('ollamaStatus');
      if (ollamaStatusEl) {
        ollamaStatusEl.innerHTML = `<p class="status-error">✗ Unable to connect: ${kind}</p>`;
      }
    }

    // builder
    if (builderResult.status === 'fulfilled') {
      updateBuilderPanel(builderResult.value);
      lastBuilderStatus = builderResult.value;
      updateNowBar(builderResult.value);
      buildWorkItems(builderResult.value, toolsResult.status === 'fulfilled' ? toolsResult.value : {});
      renderQueueItems();
    } else {
      const kind = classifyErr(builderResult.reason);
      document.getElementById('builderStatus').innerHTML =
        `<span class="status-error">✗ Builder: ${kind}</span>`;
      document.getElementById('builderRaw').textContent = 'No data';
    }

    if (freeTierResult.status === 'fulfilled' || freeHealthResult.status === 'fulfilled') {
      updateFreeTierPanel(
        freeTierResult.status === 'fulfilled' ? freeTierResult.value : { ok: false, error: classifyErr(freeTierResult.reason) },
        freeHealthResult.status === 'fulfilled' ? freeHealthResult.value : { ok: false, error: classifyErr(freeHealthResult.reason) }
      );
    } else {
      updateFreeTierPanel(
        { ok: false, error: classifyErr(freeTierResult.reason) },
        { ok: false, error: classifyErr(freeHealthResult.reason) }
      );
    }

    refreshSafetyStatus();
    showRateLimit('');
  });
}

function toggleAutoRefresh() {
  const enabled = document.getElementById('autoRefreshToggle').checked;
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  if (enabled) {
    autoRefreshInterval = setInterval(refresh, 10000);
  }
}

function saveKey() {
  const input = document.getElementById('keyInput');
  const key = input.value.trim();
  if (key) {
    // Store under all known keys so every auth path picks it up
    localStorage.setItem('LIFEOS_KEY', key);
    localStorage.setItem('COMMAND_CENTER_KEY', key);
    localStorage.setItem('lifeos_cmd_key', key);
    document.getElementById('keyStatus').innerHTML = '<span class="status-ok">✓ Key saved</span>';
    input.value = '';
    refresh();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const savedKey = localStorage.getItem('LIFEOS_KEY');
  if (savedKey) {
    document.getElementById('keyStatus').innerHTML = '<span class="status-ok">✓ Key loaded</span>';
  }
  conversationLog = loadConversationLog();
  renderConversationLog();
  initChatModes();
  initChatMembers();
  initChatVoice();
  updateCommandKeyStatus();
  refresh();
  refreshSafetyStatus();
  toggleAutoRefresh();
});

window.addEventListener('beforeunload', () => {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
});

function updateOllamaStatus(toolsData) {
  const statusEl = document.getElementById('ollamaStatus');
  if (!statusEl) return;

  if (toolsData?.ollama) {
    const ollama = toolsData.ollama;
    const available = ollama.available;
    const modelCount = Array.isArray(ollama.models) ? ollama.models.length : 0;
    const statusClass = available ? 'status-ok' : 'status-error';
    const statusText = available ? 'ONLINE' : 'OFFLINE';

    let html = `<p>Status: <span class="${statusClass}">${statusText}</span></p>`;
    html += `<p>Endpoint: <code>${escapeHtml(ollama.endpoint || 'unknown')}</code></p>`;

    if (available) {
      html += `<p>Models Loaded: <strong>${modelCount}</strong></p>`;

      if (modelCount > 0) {
        html += `<div class="status-card" style="margin-top:10px;"><h3>Active Models</h3><ul style="margin:5px 0; padding-left:20px; font-size:12px;">`;
        ollama.models.forEach(model => {
          html += `<li>${escapeHtml(model)}</li>`;
        });
        html += `</ul></div>`;
      }
    } else {
      html += `<p class="status-error">⚠️ Ollama is not running. Please start Ollama to use local AI models.</p>`;
      html += `<p style="font-size:12px; margin-top:8px;">Run: <code>ollama serve</code></p>`;
    }

    statusEl.innerHTML = html;
  } else {
    statusEl.innerHTML = '<p class="status-warning">Unable to check Ollama status</p>';
  }
}

async function testOllama() {
  const resultEl = document.getElementById('ollamaTestResult');
  resultEl.innerHTML = '<span class="status-warning">Testing Ollama connection...</span>';

  try {
    const response = await postJson('/api/v1/council/route', {
      task: 'Hello, are you working?',
      taskType: 'simple_classification',
      riskLevel: 'low',
      userFacing: false,
      revenueImpact: 'low',
    });

    if (response?.success) {
      resultEl.innerHTML = `<span class="status-ok">✅ Test Successful!</span><br><div style="margin-top:8px; padding:8px; background:#0a0e27; border-radius:4px; font-size:12px;">${escapeHtml(response.response || 'Connected')}</div>`;
    } else {
      resultEl.innerHTML = `<span class="status-error">❌ Test Failed: ${escapeHtml(response?.error || 'Unknown error')}</span>`;
    }
  } catch (error) {
    resultEl.innerHTML = `<span class="status-error">❌ Connection Error: ${escapeHtml(error.message)}</span>`;
  }
}

window.saveKey = saveKey;
window.refresh = refresh;
window.toggleAutoRefresh = toggleAutoRefresh;
window.submitChat = submitChat;
window.closeDrawer = closeDrawer;
window.shelveIdea = shelveIdea;
window.markResolved = markResolved;
window.saveCommandKey = saveCommandKey;
window.testOllama = testOllama;
