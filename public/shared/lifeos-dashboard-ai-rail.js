/**
 * @file Manages the persistent AI Rail UI component.
 * @see docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md
 */
(function() {
  const ROOT_ID = 'lifeos-ai-rail-root';
  const STORAGE_KEY_EXPANDED = 'lifeos-ai-rail:expanded';
  const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock';
  const DEFAULT_DOCK = 'bottom'; // As per contract open question, default to bottom
  const DEFAULT_EXPANDED = false; // As per contract open question, default to collapsed

  let _rootEl = null;
  let _isExpanded = DEFAULT_EXPANDED;
  let _dockPosition = DEFAULT_DOCK; // 'top' or 'bottom'
  let _focusChatInputCallback = null;
  let _prefersReducedMotion = false;

  /**
   * Initializes the AI Rail.
   * @param {object} options
   * @param {function} options.focusChatInputCallback - Callback to focus the main chat input.
   */
  function mountAiRail(options) {
    _focusChatInputCallback = options.focusChatInputCallback;

    _rootEl = document.getElementById(ROOT_ID);
    if (!_rootEl) {
      _rootEl = document.createElement('div');
      _rootEl.id = ROOT_ID;
      document.body.appendChild(_rootEl);
    }

    // Load state from sessionStorage
    const storedExpanded = sessionStorage.getItem(STORAGE_KEY_EXPANDED);
    if (storedExpanded !== null) {
      _isExpanded = storedExpanded === 'true';
    }
    const storedDock = sessionStorage.getItem(STORAGE_KEY_DOCK);
    if (storedDock === 'top' || storedDock === 'bottom') {
      _dockPosition = storedDock;
    }

    // Check for reduced motion preference
    _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (_prefersReducedMotion) {
      _rootEl.classList.add('lifeos-ai-rail-no-transition');
    }

    renderRail();
  }

  /**
   * Renders the AI Rail UI based on current state.
   */
  function renderRail() {
    if (!_rootEl) return;

    _rootEl.innerHTML = ''; // Clear existing content
    _rootEl.classList.add('lifeos-ai-rail-root');
    _rootEl.setAttribute('data-dock', _dockPosition);

    if (_isExpanded) {
      _rootEl.innerHTML = `
        <div class="lifeos-ai-rail-expanded">
          <div class="lifeos-ai-rail-expanded-header">
            <span class="lifeos-ai-rail-expanded-title">Lumin AI</span>
            <button class="lifeos-ai-rail-expanded-close-btn" aria-label="Collapse AI Rail">✕</button>
          </div>
          <div class="lifeos-ai-rail-transcript">
            <div class="lifeos-ai-rail-message assistant">
              Hi there! I'm Lumin, your personal AI. How can I help you today?
            </div>
          </div>
          <div class="lifeos-ai-rail-input-area">
            <button id="lifeos-ai-rail-open-chat-btn" class="btn-add" style="width:100%; padding: 10px;" aria-label="Open full chat with Lumin">Open Full Chat</button>
            <button id="lifeos-ai-rail-dock-toggle-btn" class="btn-add" style="width:100%; margin-top: 8px; padding: 10px;" aria-label="Dock AI Rail to ${_dockPosition === 'bottom' ? 'top' : 'bottom'}">Dock to ${_dockPosition === 'bottom' ? 'Top' : 'Bottom'}</button>
          </div>
        </div>
      `;
      _rootEl.querySelector('.lifeos-ai-rail-expanded-close-btn').addEventListener('click', collapseRail);
      _rootEl.querySelector('#lifeos-ai-rail-open-chat-btn').addEventListener('click', openFullChat);
      _rootEl.querySelector('#lifeos-ai-rail-dock-toggle-btn').addEventListener('click', toggleDockPosition);
    } else {
      _rootEl.innerHTML = `
        <div class="lifeos-ai-rail-collapsed" aria-label="Expand AI Rail">
          <span class="lifeos-ai-rail-collapsed-text">Ask Lumin anything...</span>
          <span class="lifeos-ai-rail-collapsed-icon">✦</span>
        </div>
      `;
      _rootEl.querySelector('.lifeos-ai-rail-collapsed').addEventListener('click', expandRail);
    }
  }

  /**
   * Expands the AI Rail.
   */
  function expandRail() {
    _isExpanded = true;
    sessionStorage.setItem(STORAGE_KEY_EXPANDED, 'true');
    renderRail();
    // If expanding, and a chat input callback is available, focus it.
    // This is a direct interpretation of "focus chat input hook if present"
    // when the rail is expanded to encourage interaction.
    if (_focusChatInputCallback) {
      _focusChatInputCallback();
    }
  }

  /**
   * Collapses the AI Rail.
   */
  function collapseRail() {
    _isExpanded = false;
    sessionStorage.setItem(STORAGE_KEY_EXPANDED, 'false');
    renderRail();
  }

  /**
   * Toggles the dock position of the AI Rail.
   */
  function toggleDockPosition() {
    _dockPosition = _dockPosition === 'bottom' ? 'top' : 'bottom';
    sessionStorage.setItem(STORAGE_KEY_DOCK, _dockPosition);
    renderRail();
  }

  /**
   * Calls the provided callback to open/focus the main chat.
   */
  function openFullChat() {
    if (_focusChatInputCallback) {
      _focusChatInputCallback();
      // Optionally collapse the rail after opening full chat, for better UX
      collapseRail();
    }
  }

  // Add a style for reduced motion, if not already in CSS
  const style = document.createElement('style');
  style.textContent = `
    .lifeos-ai-rail-no-transition {
      transition: none !important;
    }
  `;
  document.head.appendChild(style);

  // Expose the mount function globally
  window.LifeOSDashboardAiRail = {
    mount: mountAiRail
  };
})();