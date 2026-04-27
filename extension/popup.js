/**
 * extension/popup.js — Lumin Universal Overlay
 * Manages the extension popup: login status, connect/disconnect.
 *
 * @ssot docs/projects/AMENDMENT_37_UNIVERSAL_OVERLAY.md
 */
'use strict';

const SERVER = 'https://lumin-lifeos.up.railway.app';

const $ = id => document.getElementById(id);

function setStatus(connected, label) {
  $('status-dot').className = 'status-dot ' + (connected ? 'active' : 'inactive');
  $('status-text').textContent = label;
}

chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (auth) => {
  if (auth?.authenticated) {
    showLoggedIn(auth);
  } else {
    showLoggedOut();
  }
  // Version
  chrome.runtime.sendMessage({ type: 'GET_VERSION' }, (v) => {
    const manifest = chrome.runtime.getManifest();
    $('version-line').textContent = `Extension v${manifest.version}${v?.version ? ' · Overlay ' + v.version : ''}`;
  });
});

function showLoggedIn(auth) {
  setStatus(true, 'Connected to LifeOS');
  $('logged-in').style.display  = '';
  $('logged-out').style.display = 'none';
  $('user-display').textContent  = '@' + (auth.user || '?');
  $('server-display').textContent = SERVER.replace('https://', '');
}

function showLoggedOut() {
  setStatus(false, 'Not connected');
  $('logged-in').style.display  = 'none';
  $('logged-out').style.display = '';
}

$('btn-save').addEventListener('click', async () => {
  const key  = $('inp-key').value.trim();
  const user = $('inp-user').value.trim() || 'adam';
  if (!key) { setStatus(false, 'Key is required'); return; }

  setStatus(false, 'Connecting…');
  $('btn-save').disabled = true;

  try {
    const r = await fetch(`${SERVER}/api/v1/extension/status?user=${user}`, {
      headers: { 'x-command-key': key }
    });
    const d = await r.json();
    if (d.ok) {
      chrome.runtime.sendMessage({ type: 'SET_AUTH', commandKey: key, user, authenticated: true }, () => {
        showLoggedIn({ user, authenticated: true });
      });
    } else {
      setStatus(false, 'Invalid key — check and retry');
    }
  } catch {
    setStatus(false, 'Cannot reach server');
  }
  $('btn-save').disabled = false;
});

$('btn-logout').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_AUTH' }, () => showLoggedOut());
});
