/**
 * SYNOPSIS: public/extension/frame.js — Lumin Universal Overlay
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
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
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

// ── Drive channel state ─────────────────────────────────────────────────────
let driveSessionId   = null;
let driveGoalText    = '';
let driveAwaitingConfirm = false;
let driveAwaitingHandoff = false;

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

    // Resuming an in-progress drive session after a full page navigation
    // destroyed and re-injected this frame.
    case 'DRIVE_SESSION_STATE':
      if (msg.sessionId && !driveSessionId) {
        driveSessionId = msg.sessionId;
        driveGoalText  = msg.goal || '';
        enterDriveRunningUI(driveGoalText);
        driveLog('Reconnected after page navigation.');
        drivePollLoop();
      }
      break;

    // The server started a session with no one clicking anything -- this tab
    // claimed it. Open the panel so Adam actually sees it happen, and go.
    case 'AUTO_START_DRIVE':
      if (msg.sessionId && !driveSessionId) {
        driveSessionId = msg.sessionId;
        driveGoalText  = msg.goal || '';
        postParent({ type: 'SET_DRIVE_SESSION', sessionId: driveSessionId, goal: driveGoalText });
        if (!drawerOpen) openDrawer();
        switchTab('drive');
        enterDriveRunningUI(driveGoalText);
        driveLog('Picked up automatically — no click needed.');
        drivePollLoop();
      }
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

// ── Drive channel ─────────────────────────────────────────────────────────────
// Client side of OVERLAY-DRIVE-CHANNEL-0001. Polls the server for the next
// pending request (observe / act / confirm_done), carries it out through
// content.js against the REAL host page, and posts the result back --
// visibly, in this panel, step by step.

function startDrive() {
  const goal = $('drive-goal-input').value.trim();
  if (!goal) return;
  const allowRisky = $('drive-allow-risky').checked;
  const btn = $('drive-start-btn');
  btn.disabled = true;
  btn.textContent = 'Starting…';

  fetch(`${SERVER}/api/v1/extension/drive/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ user: auth.user || 'adam', goal, allowRiskyActions: allowRisky, url: pageCtx.url || undefined }),
  })
    .then((r) => r.json())
    .then((d) => {
      btn.disabled = false;
      btn.textContent = 'Start';
      if (!d.ok) {
        driveLog(`Could not start: ${d.error || 'unknown error'}`, 'err');
        return;
      }
      driveSessionId = d.session_id;
      driveGoalText  = goal;
      driveAwaitingConfirm = false;
      postParent({ type: 'SET_DRIVE_SESSION', sessionId: driveSessionId, goal: driveGoalText });
      enterDriveRunningUI(driveGoalText);
      driveLog('Started.');
      drivePollLoop();
    })
    .catch(() => {
      btn.disabled = false;
      btn.textContent = 'Start';
      driveLog('Could not reach LifeOS to start.', 'err');
    });
}
window.startDrive = startDrive;

function stopDrive() {
  if (!driveSessionId) return;
  const id = driveSessionId;
  fetch(`${SERVER}/api/v1/extension/drive/stop`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ session_id: id }),
  }).catch(() => {});
  postParent({ type: 'CLEAR_DRIVE_SESSION' });
  driveSessionId = null;
  driveAwaitingConfirm = false;
  driveAwaitingHandoff = false;
  driveLog('Stopped.');
  exitDriveRunningUI();
}
window.stopDrive = stopDrive;

function enterDriveRunningUI(goal) {
  $('drive-idle').style.display = 'none';
  $('drive-running').style.display = 'flex';
  $('drive-goal-label').textContent = goal.length > 60 ? goal.slice(0, 60) + '…' : goal;
  $('drive-log').innerHTML = '';
  $('drive-confirm-slot').innerHTML = '';
  $('drive-handoff-slot').innerHTML = '';
  $('drive-blocked-slot').innerHTML = '';
  driveAwaitingHandoff = false;
}

function exitDriveRunningUI() {
  $('drive-idle').style.display = '';
  $('drive-running').style.display = 'none';
}

function driveLog(text, cls = '') {
  const log = $('drive-log');
  if (!log) return;
  const item = document.createElement('div');
  item.className = 'drive-log-item' + (cls ? ' ' + cls : '');
  item.innerHTML = `<div>${escHtml(text)}</div><div class="dl-meta">${new Date().toLocaleTimeString()}</div>`;
  log.insertBefore(item, log.firstChild);
}

async function drivePollLoop() {
  if (!driveSessionId) return;
  const id = driveSessionId;
  try {
    // Real DB-backed terminal status -- checked every cycle so a finished/
    // blocked/failed run is never silently stuck waiting on a poll that will
    // never produce a new pending request.
    const statusRes = await fetch(`${SERVER}/api/v1/extension/drive/status?session_id=${id}`, { headers: authHeaders() });
    const statusData = await statusRes.json();
    const status = statusData?.session?.status;
    if (status === 'done' || status === 'failed' || status === 'stopped') {
      const reason = statusData.session?.result?.reason;
      if (status === 'failed' && reason) showDriveBlocked(reason);
      driveLog(status === 'done' ? 'Finished.' : `Ended: ${status}${reason ? ' — ' + reason : ''}`, status === 'failed' ? 'err' : '');
      postParent({ type: 'CLEAR_DRIVE_SESSION' });
      driveSessionId = null;
      driveAwaitingConfirm = false;
      driveAwaitingHandoff = false;
      return;
    }

    // HANDOFF: the loop is stuck on something only Adam can supply (a
    // verification code, a CAPTCHA answer). Session stays 'running' server-side
    // once he submits -- this is a pause, not a terminal state, so keep polling.
    if (status === 'handoff' && !driveAwaitingHandoff) {
      driveAwaitingHandoff = true;
      showDriveHandoff(statusData.session.handoff || {});
    }

    if (!driveAwaitingConfirm && !driveAwaitingHandoff) {
      const r = await fetch(`${SERVER}/api/v1/extension/drive/next?session_id=${id}`, { headers: authHeaders() });
      const d = await r.json();
      if (d.ok && d.pending) await handleDrivePending(d.pending);
    }
  } catch {
    driveLog('Connection hiccup, retrying…', 'warn');
  }
  if (driveSessionId === id) setTimeout(drivePollLoop, 1400);
}

async function handleDrivePending(pending) {
  if (pending.type === 'observe') {
    driveLog('Reading the page…');
    const obs = await requestDriveObservation();
    await postDriveResult(obs);
    return;
  }
  if (pending.type === 'act') {
    const action = pending.action || {};
    driveLog(describeAction(action));
    const result = await executeDriveAction(action);
    if (result?.ok === false && result?.error) driveLog(`↳ ${result.error}`, 'warn');
    await postDriveResult(result);
    return;
  }
  if (pending.type === 'confirm_done') {
    if (!driveAwaitingConfirm) {
      driveAwaitingConfirm = true;
      showDriveConfirm(pending);
    }
  }
}

function postDriveResult(payload) {
  return fetch(`${SERVER}/api/v1/extension/drive/result`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ session_id: driveSessionId, payload }),
  }).catch(() => {});
}

function describeAction(action) {
  switch (action.type) {
    case 'navigate': return `Going to ${action.url}`;
    case 'click':    return `Clicking "${action.reason || action.selector}"`;
    case 'type':     return `Typing into ${action.selector}`;
    case 'wait':     return 'Waiting…';
    default:         return `${action.type}…`;
  }
}

function requestDriveObservation() {
  return new Promise((resolve) => {
    const handler = (event) => {
      if (event.data?.type === 'DRIVE_OBSERVATION') {
        window.removeEventListener('message', handler);
        resolve(event.data);
      }
    };
    window.addEventListener('message', handler);
    postParent({ type: 'REQUEST_DRIVE_OBSERVATION' });
    setTimeout(() => { window.removeEventListener('message', handler); resolve({}); }, 5000);
  });
}

function executeDriveAction(action) {
  if (action.type === 'wait') {
    return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), Math.min(action.ms || 1000, 5000)));
  }
  if (action.type === 'navigate') {
    postParent({ type: 'NAVIGATE', url: action.url });
    // The page is about to unload -- there's no result to wait for. The poll
    // loop resumes automatically after reload via DRIVE_SESSION_STATE.
    return Promise.resolve({ ok: true });
  }
  if (action.type === 'click') {
    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.data?.type === 'CLICK_RESULT') {
          window.removeEventListener('message', handler);
          resolve({ ok: !!event.data.ok, error: event.data.ok ? undefined : 'Element not found' });
        }
      };
      window.addEventListener('message', handler);
      postParent({ type: 'CLICK_ELEMENT', selector: action.selector });
      setTimeout(() => { window.removeEventListener('message', handler); resolve({ ok: false, error: 'timeout' }); }, 5000);
    });
  }
  if (action.type === 'type') {
    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.data?.type === 'FILL_RESULT') {
          window.removeEventListener('message', handler);
          resolve({ ok: !!event.data.ok, error: event.data.ok ? undefined : (event.data.error || 'Element not found') });
        }
      };
      window.addEventListener('message', handler);
      postParent({ type: 'FILL_FIELD', selector: action.selector, value: action.text });
      setTimeout(() => { window.removeEventListener('message', handler); resolve({ ok: false, error: 'timeout' }); }, 5000);
    });
  }
  return Promise.resolve({ ok: false, error: 'unsupported_action' });
}

function showDriveConfirm(pending) {
  driveLog(`I believe I've finished: "${pending.goal || driveGoalText}". Take a look — did it work?`, 'warn');
  $('drive-confirm-slot').innerHTML = `
    <div class="drive-confirm-box">
      <div class="drive-confirm-text">I think I'm done: <strong>${escHtml(pending.goal || driveGoalText || '')}</strong><br>Check the page — did it actually work?</div>
      <div class="drive-confirm-actions">
        <button class="dc-btn dc-yes" onclick="confirmDriveDone(true)">Yes, done</button>
        <button class="dc-btn dc-no" onclick="confirmDriveDone(false)">No, keep going</button>
      </div>
    </div>`;
}

function confirmDriveDone(confirmed) {
  $('drive-confirm-slot').innerHTML = '';
  driveAwaitingConfirm = false;
  postDriveResult({ confirmed }).then(() => {
    driveLog(confirmed ? 'Confirmed done.' : 'Told it to keep trying.');
  });
}
window.confirmDriveDone = confirmDriveDone;

function showDriveHandoff(handoff) {
  driveLog(`Stuck — needs you: ${handoff.label || 'a value'}. Type it in and I'll take back over.`, 'warn');
  $('drive-handoff-slot').innerHTML = `
    <div class="drive-handoff-box">
      <div class="drive-handoff-text">I'm stuck on <strong>${escHtml(handoff.label || 'this field')}</strong> — type the value and I'll take back over.</div>
      <div class="drive-handoff-row">
        <input type="text" class="drive-handoff-input" id="drive-handoff-input" placeholder="Type here…" autocomplete="off" />
        <button class="drive-handoff-submit" onclick="submitDriveHandoff()">Submit</button>
      </div>
    </div>`;
  const input = $('drive-handoff-input');
  if (input) {
    input.focus();
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitDriveHandoff(); });
  }
}

function submitDriveHandoff() {
  const input = $('drive-handoff-input');
  const value = (input?.value || '').trim();
  if (!value) return;
  $('drive-handoff-slot').innerHTML = '';
  driveAwaitingHandoff = false;
  driveLog('Got it — continuing…');
  fetch(`${SERVER}/api/v1/extension/drive/handoff-resume`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ session_id: driveSessionId, value }),
  }).catch(() => {
    driveLog('Could not send that — retrying next cycle.', 'warn');
  });
}
window.submitDriveHandoff = submitDriveHandoff;

function showDriveBlocked(reason) {
  const slot = $('drive-blocked-slot');
  if (!slot) return;
  const risky = /risky_action_requires_authorization/.test(reason || '');
  slot.innerHTML = `
    <div class="drive-blocked-box">
      ${risky
        ? `Stopped — this needs your OK: <strong>${escHtml(reason.replace('risky_action_requires_authorization:', ''))}</strong>. Check "Allow risky actions" on the Drive tab and start again to let me do it.`
        : `Stopped: ${escHtml(reason || 'unknown reason')}`}
    </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
// Ask parent for auth state (parent sends AUTH_STATE on frame load,
// but we also ask in case the load order is flipped)
setTimeout(() => {
  if (!auth.authenticated && !auth.commandKey) {
    PARENT.postMessage({ type: 'REQUEST_AUTH' }, '*');
  }
}, 200);
