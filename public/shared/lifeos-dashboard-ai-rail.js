// DASHBOARD_AI_RAIL_CONTRACT.md
(function() {
  const ROOT_ID = 'lifeos-ai-rail-root';
  const CONTAINER_ID = 'ai-rail-container';
  const COLLAPSED_STRIP_ID = 'ai-rail-collapsed-strip';
  const EXPANDED_PANEL_ID = 'ai-rail-expanded-panel';
  const TOGGLE_BTN_ID = 'ai-rail-toggle-btn';
  const CLOSE_BTN_ID = 'ai-rail-close-btn';
  const FOCUS_CHAT_BTN_ID = 'ai-rail-focus-chat-btn';
  const CHAT_INPUT_ID = 'chat-input'; // ID of the main dashboard chat input

  const STORAGE_KEY_EXPANDED = 'lifeos-ai-rail:expanded';
  const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock';

  let prefersReducedMotion = false;

  function getStoredState(key, defaultValue) {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored === null) return defaultValue;
      return JSON.parse(stored);
    } catch (e) {
      console.error(`Error reading sessionStorage key ${key}:`, e);
      return defaultValue;
    }
  }

  function setStoredState(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing sessionStorage key ${key}:`, e);
    }
  }

  function createRailElement() {
    const root = document.getElementById(ROOT_ID);
    if (!root) {
      console.error(`Root element #${ROOT_ID} not found.`);
      return null;
    }

    root.innerHTML = `
      <div class="lifeos-ai-rail-container" id="${CONTAINER_ID}">
        <div class="lifeos-ai-rail-collapsed" id="${COLLAPSED_STRIP_ID}">
          <span>Lumin AI</span>
          <button id="${TOGGLE_BTN_ID}" aria-label="Toggle AI Rail">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
        <div class="lifeos-ai-rail-expanded" id="${EXPANDED_PANEL_ID}">
          <div class="lifeos-ai-rail-header">
            <span class="lifeos-ai-rail-header-title">Lumin AI</span>
            <button class="lifeos-ai-rail-close-btn" id="${CLOSE_BTN_ID}" aria-label="Close AI Rail">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="lifeos-ai-rail-transcript" id="ai-rail-transcript-stub">
            <p>Your personal AI assistant. Use the main chat below or click to focus the input.</p>
            <button id="${FOCUS_CHAT_BTN_ID}">Focus Chat Input</button>
          </div>
        </div>
      </div>
    `;
    return document.getElementById(CONTAINER_ID);
  }

  function applyReducedMotion(container) {
    if (prefersReducedMotion) {
      container.style.transition = 'none';
    } else {
      container.style.transition = ''; // Reset to CSS default
    }
  }

  function updateRailState(container, isExpanded, dockPosition, initialLoad = false) {
    if (!container) return;

    // Apply reduced motion if applicable
    if (!initialLoad) { // Only apply transition changes after initial load
      applyReducedMotion(container);
    }

    container.classList.toggle('is-expanded', isExpanded);
    container.classList.toggle('lifeos-ai-rail-dock-bottom', dockPosition === 'bottom');
    container.classList.toggle('lifeos-ai-rail-dock-top', dockPosition === 'top');

    // Update toggle button icon
    const toggleBtn = document.getElementById(TOGGLE_BTN_ID);
    if (toggleBtn) {
      toggleBtn.innerHTML = isExpanded
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    }

    setStoredState(STORAGE_KEY_EXPANDED, isExpanded);
    setStoredState(STORAGE_KEY_DOCK, dockPosition);

    // If expanded, try to focus the main chat input
    if (isExpanded) {
      const chatInput = document.getElementById(CHAT_INPUT_ID);
      if (chatInput) {
        // Use a timeout to ensure the rail has finished animating/rendering
        setTimeout(() => chatInput.focus(), prefersReducedMotion ? 0 : 300);
      }
    }
  }

  function mount() {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const container = createRailElement();
    if (!container) return;

    let isExpanded = getStoredState(STORAGE_KEY_EXPANDED, false);
    let dockPosition = getStoredState(STORAGE_KEY_DOCK, 'bottom'); // Default to bottom

    // Initial state application
    updateRailState(container, isExpanded, dockPosition, true);
    applyReducedMotion(container); // Apply reduced motion immediately for initial render

    // Event Listeners
    const collapsedStrip = document.getElementById(COLLAPSED_STRIP_ID);
    const toggleBtn = document.getElementById(TOGGLE_BTN_ID);
    const closeBtn = document.getElementById(CLOSE_BTN_ID);
    const focusChatBtn = document.getElementById(FOCUS_CHAT_BTN_ID);

    if (collapsedStrip) {
      collapsedStrip.addEventListener('click', () => {
        isExpanded = !isExpanded;
        updateRailState(container, isExpanded, dockPosition);
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from bubbling to collapsedStrip
        isExpanded = !isExpanded;
        updateRailState(container, isExpanded, dockPosition);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        isExpanded = false;
        updateRailState(container, isExpanded, dockPosition);
      });
    }

    if (focusChatBtn) {
      focusChatBtn.addEventListener('click', () => {
        const chatInput = document.getElementById(CHAT_INPUT_ID);
        if (chatInput) {
          chatInput.focus();
          // Optionally scroll the main chat into view if it's not visible
          chatInput.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
        }
      });
    }

    // Theme change listener
    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          // CSS variables handle theme changes automatically. No direct JS action needed here for the rail's appearance.
        }
      });
    });
    themeObserver.observe(document.documentElement, { attributes: true });

    // Listen for changes to prefers-reduced-motion
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
      applyReducedMotion(container);
    });
  }

  // Attach to window if reasonable, as per spec
  if (typeof window !== 'undefined') {
    window.LifeOSDashboardAiRail = { mount };
    // Auto-mount when DOM is ready, as this script is included in the HTML
    document.addEventListener('DOMContentLoaded', mount);
  }
})();