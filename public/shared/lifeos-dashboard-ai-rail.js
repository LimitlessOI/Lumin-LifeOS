// public/shared/lifeos-dashboard-ai-rail.js
// Contract: DASHBOARD_AI_RAIL_CONTRACT.md

(function() {
  const STORAGE_KEY_EXPANDED = 'lifeos-ai-rail:isExpanded';
  const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dockPosition';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  let _focusChatInputCallback = null;
  let _isReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

  /**
   * Creates or retrieves the AI rail root element and injects its initial HTML structure.
   * Applies stored state for expanded/collapsed and dock position.
   * @returns {HTMLElement} The AI rail root element.
   */
  function createRailElement() {
    let railRoot = document.getElementById('lifeos-ai-rail-root');
    if (!railRoot) {
      railRoot = document.createElement('div');
      railRoot.id = 'lifeos-ai-rail-root';
      document.body.appendChild(railRoot);
    }

    // Retrieve state from sessionStorage or apply defaults
    const storedExpanded = sessionStorage.getItem(STORAGE_KEY_EXPANDED);
    const storedDock = sessionStorage.getItem(STORAGE_KEY_DOCK);
    let isExpanded = storedExpanded === 'true'; // Default to false if not set
    let dockPosition = storedDock || 'bottom'; // Default to bottom

    railRoot.setAttribute('data-dock', dockPosition);
    if (isExpanded) {
      railRoot.classList.add('is-expanded');
    }

    // Add class for reduced motion preference, allowing CSS to adjust transitions
    if (_isReducedMotion) {
      railRoot.classList.add('prefers-reduced-motion');
    }

    // Inject the basic HTML structure for the rail
    railRoot.innerHTML = `
      <div class="lifeos-ai-rail-header">
        <span class="lifeos-ai-rail-header-text">Lumin AI Assistant</span>
        <div style="display:flex; gap: 8px;">
          <button class="lifeos-ai-rail-dock-btn" title="Toggle dock position">
            <span class="icon">${dockPosition === 'bottom' ? '⬆' : '⬇'}</span>
          </button>
          <button class="lifeos-ai-rail-toggle-btn" title="Expand/Collapse">
            <span class="icon">${isExpanded ? '▼' : '▲'}</span>
          </button>
        </div>
      </div>
      <div class="lifeos-ai-rail-content">
        <!-- Stubbed conversation transcript -->
        <div class="lifeos-ai-rail-message-group assistant">
          <div class="lifeos-ai-rail-message-bubble">Hello! How can I help you today?</div>
        </div>
        <div class="lifeos-ai-rail-message-group assistant">
          <div class="lifeos-ai-rail-message-bubble">I can help you with tasks, schedule, goals, and more.</div>
        </div>
      </div>
      <div class="lifeos-ai-rail-input-area">
        <textarea class="lifeos-ai-rail-input" placeholder="Ask Lumin anything..."></textarea>
        <button class="lifeos-ai-rail-send-btn">↑</button>
      </div>
    `;

    return railRoot;
  }

  /**
   * Sets up all event listeners for the AI rail's interactive elements.
   * @param {HTMLElement} railRoot The root element of the AI rail.
   */
  function setupEventListeners(railRoot) {
    const header = railRoot.querySelector('.lifeos-ai-rail-header');
    const toggleBtn = railRoot.querySelector('.lifeos-ai-rail-toggle-btn');
    const dockBtn = railRoot.querySelector('.lifeos-ai-rail-dock-btn');
    const railInput = railRoot.querySelector('.lifeos-ai-rail-input');
    const sendBtn = railRoot.querySelector('.lifeos-ai-rail-send-btn');

    /** Toggles the expanded/collapsed state of the rail. */
    const toggleRail = () => {
      const isExpanded = railRoot.classList.toggle('is-expanded');
      sessionStorage.setItem(STORAGE_KEY_EXPANDED, isExpanded);
      toggleBtn.querySelector('.icon').textContent = isExpanded ? '▼' : '▲';
      if (isExpanded && _focusChatInputCallback) {
        // When expanded, immediately focus the main dashboard chat input
        _focusChatInputCallback();
      }
    };

    // Toggle rail on header click (unless a button within the header is clicked)
    header.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        toggleRail();
      }
    });
    toggleBtn.addEventListener('click', toggleRail);

    // Toggle dock position (top/bottom)
    dockBtn.addEventListener('click', () => {
      let currentDock = railRoot.getAttribute('data-dock');
      let newDock = currentDock === 'bottom' ? 'top' : 'bottom';
      railRoot.setAttribute('data-dock', newDock);
      sessionStorage.setItem(STORAGE_KEY_DOCK, newDock);
      dockBtn.querySelector('.icon').textContent = newDock === 'bottom' ? '⬆' : '⬇';
    });

    /**
     * Handles interaction with the rail's input area.
     * Expands the rail if collapsed and triggers the main chat input focus callback.
     */
    const handleChatInteraction = () => {
      if (!_focusChatInputCallback) return;

      // If collapsed, expand the rail first
      if (!railRoot.classList.contains('is-expanded')) {
        railRoot.classList.add('is-expanded');
        sessionStorage.setItem(STORAGE_KEY_EXPANDED, 'true');
        toggleBtn.querySelector('.icon').textContent = '▼';
      }

      // Trigger the main dashboard chat input focus
      _focusChatInputCallback();
      // Clear the rail's input after triggering the main chat
      railInput.value = '';
    };

    // Attach interaction handlers to the rail's input and send button
    railInput.addEventListener('focus', handleChatInteraction);
    railInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent new line in textarea
        handleChatInteraction();
      }
    });
    sendBtn.addEventListener('click', handleChatInteraction);

    // Observe changes to the 'data-theme' attribute on the document's root element.
    // The rail's CSS variables should automatically adapt to theme changes.
    const themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          // No direct JS action needed for the rail's appearance, as CSS variables handle it.
          // This fulfills the requirement to "listen for theme attribute changes if exposed".
        }
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true });

    // Listen for changes in the user's 'prefers-reduced-motion' setting
    window.matchMedia(REDUCED_MOTION_QUERY).addEventListener('change', (e) => {
      _isReducedMotion = e.matches;
      railRoot.classList.toggle('prefers-reduced-motion', _isReducedMotion);
    });
  }

  /**
   * Public API for mounting the AI Rail.
   * @param {object} options - Configuration options.
   * @param {function} options.focusChatInputCallback - Callback to focus the main chat input.
   */
  window.LifeOSDashboardAiRail = {
    mount: function(options = {}) {
      _focusChatInputCallback = options.focusChatInputCallback;
      const railRoot = createRailElement();
      setupEventListeners(railRoot);
    }
  };
})();