// Technical Contract: Persistent AI Rail
// This script implements the client-side logic for the Persistent AI Rail UI component.
// It handles the rail's collapsed/expanded state, docking position, and basic UI interactions,
// without duplicating full chat logic. It stubs interaction with existing chat entry points.
// For full contract details, refer to docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md.

(function() {
  const ROOT_ID = 'lifeos-ai-rail-root';
  const EXPANDED_KEY = 'lifeos-ai-rail:expanded';
  const DOCK_KEY = 'lifeos-ai-rail:dock'; // 'top' or 'bottom'
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  let rootEl;
  let containerEl;
  let headerEl;
  let toggleBtn;
  let panelEl;
  let dockToggleBtn;
  let focusChatInputCallback = null;

  // Initialize state from sessionStorage, default to collapsed and bottom dock
  let isExpanded = sessionStorage.getItem(EXPANDED_KEY) === 'true';
  let dockPosition = sessionStorage.getItem(DOCK_KEY) || 'bottom';

  function applyReducedMotion() {
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      if (containerEl) containerEl.style.transition = 'none';
    } else {
      if (containerEl) containerEl.style.transition = ''; // Reset to CSS default
    }
  }

  function updateRailState() {
    if (!rootEl || !containerEl || !headerEl || !toggleBtn || !panelEl || !dockToggleBtn) return;

    // Apply expanded/collapsed state
    containerEl.classList.toggle('lifeos-ai-rail-expanded', isExpanded);
    containerEl.classList.toggle('lifeos-ai-rail-collapsed', !isExpanded);
    headerEl.setAttribute('aria-expanded', isExpanded);
    toggleBtn.textContent = isExpanded ? 'Collapse' : 'Expand';

    // Apply dock position
    rootEl.classList.toggle('lifeos-ai-rail-dock-top', dockPosition === 'top');
    rootEl.classList.toggle('lifeos-ai-rail-dock-bottom', dockPosition === 'bottom');
    dockToggleBtn.textContent = dockPosition === 'top' ? 'Dock Bottom' : 'Dock Top';

    // Persist state
    sessionStorage.setItem(EXPANDED_KEY, isExpanded);
    sessionStorage.setItem(DOCK_KEY, dockPosition);
  }

  function toggleExpanded() {
    isExpanded = !isExpanded;
    updateRailState();
  }

  function toggleDockPosition() {
    dockPosition = dockPosition === 'top' ? 'bottom' : 'top';
    updateRailState();
  }

  function createRailHtml() {
    const html = `
      <div class="lifeos-ai-rail-container">
        <div class="lifeos-ai-rail-header" role="button" aria-expanded="false" tabindex="0" aria-controls="lifeos-ai-rail-panel">
          <span class="lifeos-ai-rail-title">Lumin AI</span>
          <button class="lifeos-ai-rail-toggle-btn" aria-label="Toggle AI Rail">Expand</button>
        </div>
        <div id="lifeos-ai-rail-panel" class="lifeos-ai-rail-panel">
          <div class="lifeos-ai-rail-transcript">
            <!-- Initial message -->
            <div class="lifeos-ai-rail-msg-group assistant">
              <div class="lifeos-ai-rail-msg-bubble">Hello! How can I help you today?</div>
            </div>
          </div>
          <div class="lifeos-ai-rail-input-area">
            <input type="text" class="lifeos-ai-rail-input" placeholder="Ask Lumin anything..." aria-label="AI chat input">
            <button class="lifeos-ai-rail-mic-btn" aria-label="Voice input">🎙</button>
            <button class="lifeos-ai-rail-send-btn" aria-label="Send message">↑</button>
          </div>
          <div class="lifeos-ai-rail-settings-bar" style="display: flex; justify-content: flex-end; padding: 8px 0;">
            <button class="lifeos-ai-rail-dock-toggle-btn" aria-label="Toggle dock position">Dock Bottom</button>
          </div>
        </div>
      </div>
    `;
    rootEl.innerHTML = html;
  }

  function setupEventListeners() {
    if (!rootEl) return;

    containerEl = rootEl.querySelector('.lifeos-ai-rail-container');
    headerEl = rootEl.querySelector('.lifeos-ai-rail-header');
    toggleBtn = rootEl.querySelector('.lifeos-ai-rail-toggle-btn');
    panelEl = rootEl.querySelector('#lifeos-ai-rail-panel');
    dockToggleBtn = rootEl.querySelector('.lifeos-ai-rail-dock-toggle-btn');

    if (headerEl) {
      headerEl.addEventListener('click', toggleExpanded);
      headerEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleExpanded();
        }
      });
    }

    if (dockToggleBtn) {
      dockToggleBtn.addEventListener('click', toggleDockPosition);
    }

    // Stub chat input interaction: clicking/typing in rail's input focuses main chat
    const railInput = rootEl.querySelector('.lifeos-ai-rail-input');
    const railMicBtn = rootEl.querySelector('.lifeos-ai-rail-mic-btn');
    const railSendBtn = rootEl.querySelector('.lifeos-ai-rail-send-btn');

    const stubChatInteraction = (e) => {
      e.preventDefault();
      if (focusChatInputCallback) {
        focusChatInputCallback();
      } else {
        console.warn('LifeOSDashboardAiRail: focusChatInputCallback not provided. Cannot stub chat interaction.');
      }
      // Clear rail input after stubbing
      if (railInput) railInput.value = '';
    };

    if (railInput) {
      railInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          stubChatInteraction(e);
        }
      });
    }
    if (railMicBtn) railMicBtn.addEventListener('click', stubChatInteraction);
    if (railSendBtn) railSendBtn.addEventListener('click', stubChatInteraction);

    // Listen for theme changes on the documentElement
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          // The rail's CSS variables should automatically adapt to theme changes.
          // No direct JS action needed here, but observing fulfills the requirement.
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    // Listen for reduced motion preference changes
    window.matchMedia(REDUCED_MOTION_QUERY).addEventListener('change', applyReducedMotion);
    applyReducedMotion(); // Initial check
  }

  /**
   * Mounts the AI Rail into the DOM.
   * @param {object} options - Configuration options.
   * @param {Function} [options.focusChatInputCallback] - Callback to focus the main chat input.
   */
  function mount(options = {}) {
    focusChatInputCallback = options.focusChatInputCallback;

    rootEl = document.getElementById(ROOT_ID);
    if (!rootEl) {
      // Create the root element if it doesn't exist, as per spec.
      rootEl = document.createElement('div');
      rootEl.id = ROOT_ID;
      document.body.appendChild(rootEl);
    }
    // Ensure base class is present and initial dock position class is applied.
    rootEl.className = `lifeos-ai-rail-root lifeos-ai-rail-dock-${dockPosition}`;

    createRailHtml(); // Populates rootEl with inner HTML
    setupEventListeners();
    updateRailState(); // Apply initial state from sessionStorage
  }

  // Expose the mount function globally
  window.LifeOSDashboardAiRail = {
    mount: mount
  };
})();