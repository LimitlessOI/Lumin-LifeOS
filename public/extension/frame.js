/**
 * public/extension/frame.js — Lumin Universal Overlay
 *
 * Runs INSIDE the iframe injected by content.js.
 * This file is served from Railway — changes here deploy to ALL users instantly.
 *
 * Responsibilities:
 *   - Manage overlay open/close state
 *   - Handle auth state from content.js
 *   - Display page context (form fields, URL, title)
 *   - Run Lumin chat with page-context injection
 *   - Orchestrate form fill (request → receive fill map → send FILL_FIELD commands)
 *   - Show proactive help toasts on struggle signals
 *   - Handle update-available notifications
 *
 * @ssot docs/projects/AMENDMENT_37_UNIVERSAL_OVERLAY.md
 */
'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let auth = { token: '', commandKey: '', user: '', authenticated: false };
let pageCtx = { url: '', hostname: '', title: '', fields: [], bodyText: '' };
let drawerOpen = false;
let activeTab  = 'chat';
let chatHistory = []; // { role, content }
const PARENT = window.parent;
const SERVER = location.origin; // same origin since frame is served from Railway

// ── Helpers ───────────────────────────────────────────────────────────────────
function postParent(data) { PARENT.postMessage(data, '*'); }
function $(id) { return document.getElementById(id); }

function toast(msg, duration = 3000) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a1a2a;border:1px solid #2a2a3a;border-radius:8px;padding:8px 14px;font-size:12px;color:#aaa;z-index:99;white-space:nowrap;';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ── postMessage listener (from content.js) ────────────────────────────────────
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg?.type) return;

  switch (msg.type) {

    case 'AUTH_STATE':
      auth = { token: msg.token || '', commandKey: msg.commandKey || '', user: msg.user || '', authenticated: msg.authenticated };
      updateAuthUI();
      break;

    case 'PAGE_CONTEXT':
      pageCtx = {
        url:      msg.url      || '',
        hostname: msg.hostname || '',
        title:    msg.title    || '',
        fields:   msg.fields   || [],
        bodyText: msg.bodyText || '',
        selectedText: msg.selectedText || '',
      };
      renderContextPanel();
      // Update welcome message with page context
      if (!chatHistory.length) updateWelcomeMessage();
      break;

    case 'STRUGGLE_SIGNAL':
      showProactiveToast(msg.signal);
      break;

    case 'FILL_RESULT':
      // Track fill results
      handleFillResult(msg);
      break;

    case 'UPDATE_AVAILABLE':
      $('update-dot').classList.add('show');
      $('update-banner').classList.add('show');
      break;
  }
});

// ── Auth UI ───────────────────────────────────────────────────────────────────
function updateAuthUI() {
  const hasAuth = auth.authenticated || !!(auth.token || auth.commandKey);
  $('not-connected').style.display    = hasAuth ? 'none' : '';
  $('connected-view').style.display   = hasAuth ? 'flex' : 'none';

  if (hasAuth) {
    postParent({ type: 'REQUEST_PAGE_CONTEXT' });
  }
}

// ── Trigger + drawer ──────────────────────────────────────────────────────────
$('trigger').addEventListener('click', () => {
  if (drawerOpen) closeDrawer();
  else openDrawer();
});

function openDrawer() {
  drawerOpen = true;
  $('trigger').style.display = 'none';
  $('drawer').classList.add('open');
  postParent({ type: 'RESIZE_FRAME', expanded: true, width: '420px', height: '600px' });
  postParent({ type: 'REQUEST_PAGE_CONTEXT' }); // fresh context on open
}

function closeDrawer() {
  drawerOpen = false;
  $('drawer').classList.remove('open');
  $('trigger').style.display = '';
  postParent({ type: 'RESIZE_FRAME', expanded: false });
}
window.closeDrawer = closeDrawer;

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(id) {
  activeTab = id;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${id}`));
}
window.switchTab = switchTab;

// ── Welcome message ───────────────────────────────────────────────────────────
function updateWelcomeMessage() {
  const site = pageCtx.hostname || 'this page';
  const fieldCount = pageCtx.fields?.length || 0;
  let msg = `Hi. I can see you're on <strong>${site}</strong>.`;
  if (fieldCount > 0) msg += ` There ${fieldCount === 1 ? 'is' : 'are'} ${fieldCount} form field${fieldCount !== 1 ? 's' : ''} on this page — I can help fill them.`;
  else msg += ` Ask me anything, or use the tabs above to see what I know about this page.`;
  $('welcome-msg').innerHTML = msg;
}

// ── Context panel ─────────────────────────────────────────────────────────────
function renderContextPanel() {
  $('ctx-site').textContent = pageCtx.title || pageCtx.hostname || '—';
  $('ctx-url').textContent  = pageCtx.url || '—';

  const fields = pageCtx.fields || [];
  const list   = $('ctx-fields');
  list.innerHTML = '';

  if (!fields.length) {
    list.innerHTML = '<div class="ctx-empty">No form fields detected on this page.</div>';
    $('fill-all-btn').style.display = 'none';
  } else {
    fields.forEach(f => {
      const item = document.createElement('div');
      item.className = 'ctx-field';
      item.innerHTML = `
        <span class="ctx-field-name">${escHtml(f.label || f.name || f.placeholder || '(unlabeled)')}</span>
        <span class="ctx-field-type">${f.type}</span>`;
      list.appendChild(item);
    });
    $('fill-all-btn').style.display = '';
  }

  const bodyPreview = (pageCtx.bodyText || '').slice(0, 200).trim();
  $('ctx-summary').textContent = bodyPreview || '—';
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
window.autoResize = autoResize;

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
}
window.handleChatKey = handleChatKey;

async function sendChat() {
  const input = $('chat-input');
  const text  = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  appendMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  const btn = $('send-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';

  const typingEl = appendTypingIndicator();

  try {
    const systemContext = buildSystemContext();
    const r = await fetch(`${SERVER}/api/v1/extension/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        user:    auth.user || 'adam',
        message: text,
        history: chatHistory.slice(-8), // last 4 turns
        page_context: systemContext,
      }),
    });
    const d = await r.json();
    typingEl.remove();
    if (d.ok) {
      appendMessage('lumin', d.reply);
      chatHistory.push({ role: 'assistant', content: d.reply });
      // If reply contains fill instructions, execute them
      if (d.fill_map) executeFillMap(d.fill_map);
    } else {
      appendMessage('lumin', 'Something went wrong. Try again.');
    }
  } catch {
    typingEl.remove();
    appendMessage('lumin', 'Can\'t reach LifeOS right now. Check your connection.');
  }

  btn.disabled = false;
  btn.innerHTML = '➤';
}
window.sendChat = sendChat;

function appendMessage(role, content) {
  const msgs = $('chat-messages');
  const div  = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="msg-sender">${role === 'user' ? 'You' : 'Lumin'}</div>
    <div class="msg-bubble">${escHtml(content)}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function appendTypingIndicator() {
  const msgs = $('chat-messages');
  const div  = document.createElement('div');
  div.className = 'msg lumin';
  div.innerHTML = '<div class="msg-sender">Lumin</div><div class="msg-bubble"><div class="spinner"></div></div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function buildSystemContext() {
  return {
    url:        pageCtx.url,
    hostname:   pageCtx.hostname,
    title:      pageCtx.title,
    fieldCount: pageCtx.fields?.length || 0,
    fieldNames: (pageCtx.fields || []).map(f => f.label || f.name || f.placeholder).filter(Boolean),
    bodyText:   (pageCtx.bodyText || '').slice(0, 500),
  };
}

// ── Form fill ─────────────────────────────────────────────────────────────────
let fillPending = {};

async function fillAllFields() {
  const btn = $('fill-all-btn');
  btn.disabled = true;
  btn.textContent = 'Getting your info…';

  try {
    const r = await fetch(`${SERVER}/api/v1/extension/fill-form`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        user:   auth.user || 'adam',
        fields: pageCtx.fields || [],
        url:    pageCtx.url,
      }),
    });
    const d = await r.json();
    if (d.ok && d.fill_map?.length) {
      executeFillMap(d.fill_map);
      const filled = d.fill_map.length;
      switchTab('chat');
      appendMessage('lumin', `I've filled ${filled} field${filled !== 1 ? 's' : ''} with your info. Please review everything before submitting — I can't see what the form actually accepts, so double-check anything sensitive.`);
    } else {
      switchTab('chat');
      appendMessage('lumin', `I don't have enough info to fill this form automatically. Tell me what you're trying to fill in and I'll help you work through it.`);
    }
  } catch {
    appendMessage('lumin', 'Could not reach LifeOS to get your fill data.');
  }

  btn.disabled = false;
  btn.textContent = 'Fill form with my info';
}
window.fillAllFields = fillAllFields;

function executeFillMap(fillMap) {
  fillPending = {};
  fillMap.forEach(item => {
    fillPending[item.selector] = item;
    postParent({ type: 'FILL_FIELD', selector: item.selector, label: item.label, value: item.value });
  });
}

function handleFillResult(msg) {
  if (fillPending[msg.selector]) delete fillPending[msg.selector];
}

// ── Quick actions ─────────────────────────────────────────────────────────────
function doAction(action) {
  switchTab('chat');
  switch (action) {
    case 'fill':
      appendMessage('user', 'Fill this form with my info');
      chatHistory.push({ role: 'user', content: 'Fill this form with my info' });
      fillAllFields();
      break;
    case 'explain':
      sendPrefilled('What is this page for? What do I need to do here?');
      break;
    case 'summarize':
      sendPrefilled('Summarize the key content on this page.');
      break;
  }
}
window.doAction = doAction;

async function sendPrefilled(text) {
  $('chat-input').value = text;
  await sendChat();
}

function openLifeOS(page) {
  window.open(`${SERVER}/overlay/lifeos-${page}.html`, '_blank');
}
window.openLifeOS = openLifeOS;

// ── Proactive toast ───────────────────────────────────────────────────────────
let toastTimer = null;

function showProactiveToast(signal) {
  const messages = {
    dwell:        'Spending a while on this field — want me to help fill it?',
    repeat_click: 'That button doesn\'t seem to be working. Want some help?',
    edit_cycle:   'Having trouble with this field? I can help.',
  };
  $('pt-text').textContent = messages[signal] || 'Looks like this might be tricky — want help?';
  $('proactive-toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(dismissToast, 12000);

  // Pulse the trigger button
  $('trigger').classList.add('pulse');
}

function dismissToast() {
  $('proactive-toast').classList.remove('show');
  $('trigger').classList.remove('pulse');
}
window.dismissToast = dismissToast;

function acceptHelp() {
  dismissToast();
  openDrawer();
  switchTab('chat');
  appendMessage('lumin', 'I\'m here. What are you trying to do on this page? I can fill forms, explain what\'s needed, or just talk you through it.');
}
window.acceptHelp = acceptHelp;

// ── Update ────────────────────────────────────────────────────────────────────
function reloadOverlay() {
  location.reload();
}
window.reloadOverlay = reloadOverlay;

// ── Auth headers ──────────────────────────────────────────────────────────────
function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (auth.token)      h['Authorization']  = `Bearer ${auth.token}`;
  else if (auth.commandKey) h['x-command-key'] = auth.commandKey;
  return h;
}

// ── Escape HTML ───────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
// Ask parent for auth state (parent sends AUTH_STATE on frame load,
// but we also ask in case the load order is flipped)
setTimeout(() => {
  if (!auth.authenticated && !auth.commandKey) {
    PARENT.postMessage({ type: 'REQUEST_AUTH' }, '*');
  }
}, 200);
