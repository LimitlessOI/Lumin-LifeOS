/**
 * SYNOPSIS: LifeOS overlay UI — Lifeos Mic Handler.
 */
const MIC_SETTINGS_URLS = [
  'chrome://settings/content/microphone',
  'edge://settings/content/microphone',
  'brave://settings/content/microphone',
  'opera://settings/content/microphone',
  'about:preferences#privacy',
];

function getMicrophoneStatus() {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null;

  try {
    return navigator.permissions.query({ name: 'microphone' });
  } catch {
    return null;
  }
}

async function getMicrophonePermissionState() {
  const status = getMicrophoneStatus();
  if (!status) return 'unknown';

  try {
    return status.state;
  } catch {
    return 'unknown';
  }
}

function tryOpenSettingsUrl(url) {
  if (typeof window === 'undefined') return false;

  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened && typeof opened.focus === 'function') {
      opened.focus();
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const currentHref = window.location?.href || '';
    if (currentHref && !currentHref.startsWith('chrome://') && !currentHref.startsWith('edge://') && !currentHref.startsWith('brave://') && !currentHref.startsWith('opera://')) {
      window.location.href = url;
      return true;
    }
  } catch {
    // fall through
  }

  return false;
}

function resolveMicSettingsLink() {
  return MIC_SETTINGS_URLS[0];
}

function ensureStyleOnce() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lifeos-mic-permission-style')) return;

  const style = document.createElement('style');
  style.id = 'lifeos-mic-permission-style';
  style.textContent = `
    .lifeos-mic-permission-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.58);
      backdrop-filter: blur(2px);
      padding: 24px;
    }

    .lifeos-mic-permission-modal {
      width: min(100%, 520px);
      background: #111827;
      color: #f9fafb;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      padding: 20px;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .lifeos-mic-permission-title {
      margin: 0 0 10px;
      font-size: 18px;
      line-height: 1.35;
      font-weight: 700;
    }

    .lifeos-mic-permission-copy {
      margin: 0 0 16px;
      font-size: 14px;
      line-height: 1.5;
      color: rgba(249, 250, 251, 0.88);
    }

    .lifeos-mic-permission-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }

    .lifeos-mic-permission-btn {
      appearance: none;
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 120ms ease, opacity 120ms ease, background 120ms ease;
    }

    .lifeos-mic-permission-btn:hover { transform: translateY(-1px); }
    .lifeos-mic-permission-btn:active { transform: translateY(0); opacity: 0.92; }

    .lifeos-mic-permission-btn-primary {
      background: #3b82f6;
      color: white;
    }

    .lifeos-mic-permission-btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #f9fafb;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .lifeos-mic-permission-fallback {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(251, 191, 36, 0.12);
      color: #fcd34d;
      font-size: 13px;
      line-height: 1.45;
      display: none;
    }

    .lifeos-mic-permission-fallback.is-visible {
      display: block;
    }

    .lifeos-mic-permission-link {
      color: #93c5fd;
      word-break: break-all;
    }
  `;
  document.head.appendChild(style);
}

function removeExistingOverlay() {
  if (typeof document === 'undefined') return;
  document.getElementById('lifeos-mic-permission-overlay')?.remove();
}

function showMicPermissionOverlay(message) {
  if (typeof document === 'undefined') return;

  ensureStyleOnce();
  removeExistingOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'lifeos-mic-permission-overlay';
  overlay.className = 'lifeos-mic-permission-overlay';

  const modal = document.createElement('div');
  modal.className = 'lifeos-mic-permission-modal';

  const title = document.createElement('h2');
  title.className = 'lifeos-mic-permission-title';
  title.textContent = 'Microphone access is blocked';

  const copy = document.createElement('p');
  copy.className = 'lifeos-mic-permission-copy';
  copy.textContent =
    message ||
    'Microphone access is blocked. Click here to open browser settings and allow mic access.';

  const actions = document.createElement('div');
  actions.className = 'lifeos-mic-permission-actions';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'lifeos-mic-permission-btn lifeos-mic-permission-btn-primary';
  openBtn.textContent = 'Open browser settings';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'lifeos-mic-permission-btn lifeos-mic-permission-btn-secondary';
  closeBtn.textContent = 'Close';

  const fallback = document.createElement('div');
  fallback.className = 'lifeos-mic-permission-fallback';
  fallback.innerHTML = `If settings do not open automatically, copy and paste this address into your browser: <span class="lifeos-mic-permission-link">${resolveMicSettingsLink()}</span>`;

  openBtn.addEventListener('click', () => {
    const opened = MIC_SETTINGS_URLS.some((url) => tryOpenSettingsUrl(url));
    if (!opened) {
      fallback.classList.add('is-visible');
    }
  });

  closeBtn.addEventListener('click', () => {
    overlay.remove();
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });

  actions.append(openBtn, closeBtn);
  modal.append(title, copy, actions, fallback);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

async function requestMicAccess() {
  const permissionState = await getMicrophonePermissionState();

  if (permissionState === 'denied') {
    showMicPermissionOverlay();
    return false;
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    showMicPermissionOverlay(
      'Microphone access is blocked or unavailable in this browser. Click here to open browser settings and allow mic access.'
    );
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    const name = error?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      showMicPermissionOverlay();
      return false;
    }

    showMicPermissionOverlay(
      'Microphone access could not be enabled. Click here to open browser settings and allow mic access.'
    );
    return false;
  }
}

function attachMicPermissionHandlers() {
  if (typeof document === 'undefined') return;

  document.addEventListener(
    'click',
    async (event) => {
      const target = event.target?.closest?.('[data-lifeos-mic-button="true"]');
      if (!target) return;

      event.preventDefault();
      await requestMicAccess();
    },
    true
  );
}

attachMicPermissionHandlers();

export { requestMicAccess, showMicPermissionOverlay };