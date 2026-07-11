/**
 * SYNOPSIS: ASSUMPTIONS: The mic button is marked with [data-lifeos-mic-button] or can be wired by calling createLifeosMicHandler().attach(document) from existing page JS.
 */
export function createLifeosMicHandler(options = {}) {
  const {
    buttonSelector = '[data-lifeos-mic-button]',
    modalId = 'lifeos-mic-access-blocked-modal',
  } = options;

  const getNavigator = () => (typeof window !== 'undefined' ? window.navigator : undefined);

  const getPermissionState = async () => {
    const nav = getNavigator();
    if (!nav?.permissions?.query) return null;

    try {
      const status = await nav.permissions.query({ name: 'microphone' });
      return status?.state ?? null;
    } catch {
      return null;
    }
  };

  const ensureStyles = () => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('lifeos-mic-access-blocked-styles')) return;

    const style = document.createElement('style');
    style.id = 'lifeos-mic-access-blocked-styles';
    style.textContent = `
      .lifeos-mic-access-blocked-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(15, 23, 42, 0.72);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .lifeos-mic-access-blocked-modal {
        width: min(100%, 640px);
        max-height: min(100%, 90vh);
        overflow: auto;
        background: #ffffff;
        color: #0f172a;
        border-radius: 16px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
        border: 1px solid rgba(148, 163, 184, 0.35);
        padding: 24px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .lifeos-mic-access-blocked-modal h2 {
        margin: 0 0 12px;
        font-size: 20px;
        line-height: 1.25;
      }

      .lifeos-mic-access-blocked-modal p,
      .lifeos-mic-access-blocked-modal li {
        font-size: 14px;
        line-height: 1.55;
      }

      .lifeos-mic-access-blocked-modal .lifeos-mic-access-blocked-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }

      .lifeos-mic-access-blocked-modal a,
      .lifeos-mic-access-blocked-modal button {
        appearance: none;
        border: 0;
        border-radius: 10px;
        padding: 10px 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
      }

      .lifeos-mic-access-blocked-modal a {
        background: #2563eb;
        color: white;
      }

      .lifeos-mic-access-blocked-modal button {
        background: #e2e8f0;
        color: #0f172a;
      }

      .lifeos-mic-access-blocked-modal code {
        background: #f1f5f9;
        padding: 1px 6px;
        border-radius: 6px;
      }
    `;
    document.head.appendChild(style);
  };

  const browserHelp = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua);
    const isFirefox = /Firefox/i.test(ua);

    if (isSafari) {
      return {
        title: 'Safari',
        steps: [
          'Open Safari Settings/Preferences.',
          'Go to Websites → Microphone.',
          'Allow microphone access for this site.',
          'If needed, reload the page and try again.',
        ],
      };
    }

    if (isFirefox) {
      return {
        title: 'Firefox',
        steps: [
          'Click the lock icon in the address bar.',
          'Find Microphone permissions for this site.',
          'Set it to Allow.',
          'Reload the page and try again.',
        ],
      };
    }

    return {
      title: 'Chrome',
      steps: [
        'Click the lock icon in the address bar.',
        'Open Site settings.',
        'Set Microphone to Allow.',
        'Reload the page and try again.',
      ],
    };
  };

  const closeModal = () => {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById(modalId);
    existing?.remove();
  };

  const openBlockedMicModal = () => {
    if (typeof document === 'undefined') return;

    ensureStyles();
    closeModal();

    const help = browserHelp();
    const backdrop = document.createElement('div');
    backdrop.id = modalId;
    backdrop.className = 'lifeos-mic-access-blocked-backdrop';
    backdrop.setAttribute('role', 'presentation');

    const modal = document.createElement('div');
    modal.className = 'lifeos-mic-access-blocked-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `${modalId}-title`);

    const title = document.createElement('h2');
    title.id = `${modalId}-title`;
    title.textContent = 'Microphone access is blocked';

    const message = document.createElement('p');
    message.textContent =
      'LifeRE could not access your microphone because the browser blocked permission. Enable microphone access in your browser settings, then try again.';

    const listTitle = document.createElement('p');
    listTitle.style.fontWeight = '600';
    listTitle.style.marginTop = '16px';
    listTitle.textContent = `Quick steps for ${help.title}:`;

    const list = document.createElement('ol');
    list.style.margin = '8px 0 0 20px';
    list.style.padding = '0';

    for (const step of help.steps) {
      const li = document.createElement('li');
      li.textContent = step;
      list.appendChild(li);
    }

    const fallback = document.createElement('p');
    fallback.style.marginTop = '14px';
    fallback.innerHTML =
      'If you do not see a microphone prompt, check the site permissions in your browser and make sure the microphone is not blocked for this page.';

    const actions = document.createElement('div');
    actions.className = 'lifeos-mic-access-blocked-actions';

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = 'Close';
    dismiss.addEventListener('click', closeModal);

    const docsLink = document.createElement('a');
    docsLink.href = 'https://support.google.com/chrome/answer/2693767';
    docsLink.target = '_blank';
    docsLink.rel = 'noreferrer noopener';
    docsLink.textContent = 'Chrome permission help';

    actions.appendChild(docsLink);
    actions.appendChild(dismiss);

    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(listTitle);
    modal.appendChild(list);
    modal.appendChild(fallback);
    modal.appendChild(actions);
    backdrop.appendChild(modal);

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closeModal();
    });

    document.body.appendChild(backdrop);
    dismiss.focus();
  };

  const requestNativeMicPrompt = async () => {
    const nav = getNavigator();
    if (!nav?.mediaDevices?.getUserMedia) {
      openBlockedMicModal();
      return null;
    }

    try {
      const stream = await nav.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      closeModal();
      return stream;
    } catch (error) {
      const name = error?.name || '';
      const permissionState = await getPermissionState();
      if (name === 'NotAllowedError' || permissionState === 'denied') {
        openBlockedMicModal();
      }
      return null;
    }
  };

  const handleMicClick = async (event, originalHandler) => {
    const permissionState = await getPermissionState();

    if (permissionState === 'denied' || permissionState === 'prompt' || permissionState == null) {
      const stream = await requestNativeMicPrompt();
      if (!stream) return;
    }

    if (typeof originalHandler === 'function') {
      return originalHandler(event);
    }

    const nav = getNavigator();
    if (!nav?.mediaDevices?.getUserMedia) {
      openBlockedMicModal();
      return null;
    }

    try {
      const stream = await nav.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      closeModal();
      return stream;
    } catch (error) {
      const name = error?.name || '';
      const permissionStateAfter = await getPermissionState();
      if (name === 'NotAllowedError' || permissionStateAfter === 'denied') {
        openBlockedMicModal();
      }
      return null;
    }
  };

  const attach = (root = typeof document !== 'undefined' ? document : null) => {
    if (!root?.querySelectorAll) return () => {};

    const buttons = root.querySelectorAll(buttonSelector);
    const listeners = [];

    buttons.forEach((button) => {
      if (button.dataset.lifeosMicBound === 'true') return;
      button.dataset.lifeosMicBound = 'true';

      const originalHandler = typeof button.__lifeosOriginalMicHandler === 'function' ? button.__lifeosOriginalMicHandler : null;
      const listener = async (event) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        await handleMicClick(event, originalHandler);
      };

      button.addEventListener('click', listener);
      listeners.push({ button, listener });
    });

    return () => {
      for (const { button, listener } of listeners) {
        button.removeEventListener('click', listener);
        delete button.dataset.lifeosMicBound;
      }
    };
  };

  return {
    attach,
    handleMicClick,
    openBlockedMicModal,
    closeModal,
    requestNativeMicPrompt,
  };
}

const lifeosMicHandler = createLifeosMicHandler();

if (typeof document !== 'undefined') {
  const boot = () => {
    lifeosMicHandler.attach(document);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}

export default lifeosMicHandler;

// ASSUMPTIONS: The mic button is marked with [data-lifeos-mic-button] or can be wired by calling createLifeosMicHandler().attach(document) from existing page JS.