/**
 * @file IIFE ES module-compatible script for LifeOS AI Rail UX.
 * @contract DASHBOARD_AI_RAIL_CONTRACT.md
 */
(function() {
  const STORAGE_PREFIX = 'lifeos-ai-rail:';
  const ROOT_ID = 'lifeos-ai-rail-root';
  const CONTAINER_CLASS = 'lifeos-ai-rail-container';
  const EXPANDED_CLASS = 'lifeos-ai-rail-container--expanded';
  const REDUCED_MOTION_CLASS = 'lifeos-ai-rail-container--reduced-motion';
  const COLLAPSED_STRIP_CLASS = 'lifeos-ai-rail-collapsed-strip';
  const EXPANDED_PANEL_CLASS = 'lifeos-ai-rail-expanded-panel';
  const CLOSE_BTN_CLASS = 'lifeos-ai-rail-close-btn';
  const CHAT_BTN_CLASS = 'lifeos-ai-rail-chat-btn';
  const DASHBOARD_CHAT_INPUT_ID = 'chat-input'; // ID of the chat input in public/overlay/lifeos-dashboard.html

  /**
   * Safely get an element by ID.
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  function $(id) {
    return document.getElementById(id);
  }

  /**
   * Creates an element with optional classes and attributes.
   * @param {string} tagName
   * @param {string[]} classNames
   * @param {Object.<string, string>} attributes
   * @returns {HTMLElement}
   */
  function createElement(tagName, classNames = [], attributes = {}) {
    const el = document.createElement(tagName);
    if (classNames.length) {
      el.classList.add(...classNames);
    }
    for (const key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
    return el;
  }

  /**
   * Reads a value from sessionStorage.
   * @param {string} key
   * @param {any} defaultValue
   * @returns {any}
   */
  function getSessionState(key, defaultValue) {
    try {
      const value = sessionStorage.getItem(STORAGE_PREFIX + key);
      return value !== null ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error('Error reading from sessionStorage:', e);
      return defaultValue;
    }
  }

  /**
   * Writes a value to sessionStorage.
   * @param {string} key
   * @param {any} value
   */
  function setSessionState(key, value) {
    try {
      sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing to sessionStorage:', e);
    }
  }

  /**
   * Mounts the AI rail UX into the DOM.
   */
  function mount() {
    let root = $(ROOT_ID);
    if (!root) {
      root = createElement('div', [], { id: ROOT_ID });
      document.body.appendChild(root);
    }

    const isExpanded = getSessionState('expanded', false);
    const dockPosition = getSessionState('dock', 'bottom'); // 'bottom' or 'top'

    const container = createElement('div', [CONTAINER_CLASS], {
      'data-dock': dockPosition,
      'data-expanded': isExpanded.toString(),
    });

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.classList.add(REDUCED_MOTION_CLASS);
    }

    // Collapsed strip
    const collapsedStrip = createElement('div', [COLLAPSED_STRIP_CLASS], {
      role: 'button',
      tabindex: '0',
      'aria-expanded': isExpanded.toString(),
      'aria-label': 'Toggle AI rail',
    });
    collapsedStrip.innerHTML = `
      <span class="lifeos-ai-rail-collapsed-strip-text">Ask Lumin anything…</span>
      <span class="lifeos-ai-rail-collapsed-strip-icon">✦</span>
    `;

    // Expanded panel
    const expandedPanel = createElement('div', [EXPANDED_PANEL_CLASS]);
    expandedPanel.innerHTML = `
      <div class="lifeos-ai-rail-header">
        <span class="lifeos-ai-rail-title">Lumin AI</span>
        <button class="${CLOSE_BTN_CLASS}" aria-label="Collapse AI rail">✕</button>
      </div>
      <div class="lifeos-ai-rail-transcript">
        <div class="lifeos-ai-rail-message lifeos-ai-rail-message--ai">
          Hey there! How can I help you today?
        </div>
      </div>
      <div class="lifeos-ai-rail-input-area">
        <button class="${CHAT_BTN_CLASS}">Open full chat</button>
      </div>
    `;

    container.appendChild(collapsedStrip);
    container.appendChild(expandedPanel);
    root.appendChild(container);

    // Initial state application
    if (isExpanded) {
      container.classList.add(EXPANDED_CLASS);
    }

    /**
     * Toggles the expanded state of the AI rail.
     */
    function toggleExpanded() {
      const currentExpanded = container.classList.toggle(EXPANDED_CLASS);
      container.setAttribute('data-expanded', currentExpanded.toString());
      collapsedStrip.setAttribute('aria-expanded', currentExpanded.toString());
      setSessionState('expanded', currentExpanded);

      // Focus the chat input if expanded and available
      if (currentExpanded) {
        const dashboardChatInput = $(DASHBOARD_CHAT_INPUT_ID);
        if (dashboardChatInput) {
          dashboardChatInput.focus();
        }
      }
    }

    // Event Listeners
    collapsedStrip.addEventListener('click', toggleExpanded);
    collapsedStrip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleExpanded();
      }
    });

    const closeButton = container.querySelector(`.${CLOSE_BTN_CLASS}`);
    if (closeButton) {
      closeButton.addEventListener('click', toggleExpanded);
    }

    const chatButton = container.querySelector(`.${CHAT_BTN_CLASS}`);
    if (chatButton) {
      chatButton.addEventListener('click', () => {
        const dashboardChatInput = $(DASHBOARD_CHAT_INPUT_ID);
        if (dashboardChatInput) {
          dashboardChatInput.focus();
          // Optionally collapse the rail after focusing the main chat
          if (container.classList.contains(EXPANDED_CLASS)) {
            toggleExpanded();
          }
        } else {
          // Fallback: open full chat in a new tab
          window.open('/overlay/lifeos-chat.html', '_blank');
        }
      });
    }

    // Observe theme changes (CSS variables handle most of it, but good practice)
    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          // No direct JS action needed here as CSS variables handle styling.
          // If custom JS rendering based on theme were present, it would go here.
        }
      });
    });
    themeObserver.observe(document.documentElement, { attributes: true });
  }

  // Attach to window if reasonable, as per spec.
  if (typeof window !== 'undefined') {
    window.LifeOSDashboardAiRail = { mount };
    // Auto-mount if the DOM is already ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }
})();