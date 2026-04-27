/**
 * extension/background.js — Lumin Universal Overlay
 * Service worker for the browser extension.
 *
 * Responsibilities:
 *   - Store and refresh the LifeOS auth token / command key
 *   - Track current overlay version (for update detection)
 *   - Respond to content.js queries about auth state
 *   - Handle extension install / update events
 *
 * @ssot docs/projects/AMENDMENT_37_UNIVERSAL_OVERLAY.md
 */

const STORAGE_KEY_TOKEN   = 'lumin_access_token';
const STORAGE_KEY_KEY     = 'lumin_command_key';
const STORAGE_KEY_USER    = 'lumin_user_handle';
const STORAGE_KEY_VERSION = 'lumin_overlay_version';

// ── Install / update handler ──────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Lumin] Extension installed');
    // Open the overlay popup on first install to prompt login
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  } else if (details.reason === 'update') {
    console.log('[Lumin] Extension updated to', chrome.runtime.getManifest().version);
  }
});

// ── Message handler (from content.js and popup.js) ────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case 'GET_AUTH': {
      chrome.storage.local.get([STORAGE_KEY_TOKEN, STORAGE_KEY_KEY, STORAGE_KEY_USER], (data) => {
        sendResponse({
          token:       data[STORAGE_KEY_TOKEN] || '',
          commandKey:  data[STORAGE_KEY_KEY]   || '',
          user:        data[STORAGE_KEY_USER]  || '',
          authenticated: !!(data[STORAGE_KEY_TOKEN] || data[STORAGE_KEY_KEY]),
        });
      });
      return true; // async
    }

    case 'SET_AUTH': {
      const { token, commandKey, user } = message;
      const updates = {};
      if (token)      updates[STORAGE_KEY_TOKEN] = token;
      if (commandKey) updates[STORAGE_KEY_KEY]   = commandKey;
      if (user)       updates[STORAGE_KEY_USER]  = user;
      chrome.storage.local.set(updates, () => sendResponse({ ok: true }));
      return true;
    }

    case 'CLEAR_AUTH': {
      chrome.storage.local.remove(
        [STORAGE_KEY_TOKEN, STORAGE_KEY_KEY, STORAGE_KEY_USER],
        () => sendResponse({ ok: true })
      );
      return true;
    }

    case 'GET_VERSION': {
      chrome.storage.local.get([STORAGE_KEY_VERSION], (data) => {
        sendResponse({ version: data[STORAGE_KEY_VERSION] || '' });
      });
      return true;
    }

    case 'SET_VERSION': {
      chrome.storage.local.set({ [STORAGE_KEY_VERSION]: message.version }, () =>
        sendResponse({ ok: true })
      );
      return true;
    }

    default:
      sendResponse({ ok: false, error: 'Unknown message type' });
  }
});

// ── Periodic version check (every 30 min) ────────────────────────────────────
chrome.alarms.create('version-check', { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'version-check') return;
  checkForOverlayUpdate();
});

async function checkForOverlayUpdate() {
  try {
    const res  = await fetch('https://lumin-lifeos.up.railway.app/extension/version.json?' + Date.now());
    const data = await res.json();
    const stored = await new Promise(r => chrome.storage.local.get([STORAGE_KEY_VERSION], r));
    if (data.version && data.version !== stored[STORAGE_KEY_VERSION]) {
      // Notify all tabs with the content script that an update is available
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'OVERLAY_UPDATE_AVAILABLE', version: data.version })
          .catch(() => {}); // tabs without content script will reject — ignore
      });
    }
  } catch {
    // Network unavailable — silent
  }
}
