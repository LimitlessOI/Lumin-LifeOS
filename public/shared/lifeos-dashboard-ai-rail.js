// DASHBOARD_AI_RAIL_CONTRACT.md
(function() {
  const ROOT_ID = 'lifeos-ai-rail-root';
  const CONTAINER_ID = 'lifeos-ai-rail-container';
  const COLLAPSED_ID = 'lifeos-ai-rail-collapsed';
  const TOGGLE_BTN_ID = 'lifeos-ai-rail-toggle-btn'; // Button inside collapsed strip
  const CLOSE_BTN_ID = 'lifeos-ai-rail-close-btn'; // Button inside expanded header
  const DOCK_TOGGLE_BTN_ID = 'lifeos-ai-rail-dock-toggle-btn';
  const INPUT_FIELD_ID = 'lifeos-ai-rail-input-field';

  const STORAGE_KEY_EXPANDED = 'lifeos-ai-rail:expanded';
  const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock';

  let prefersReducedMotion = false;

  function $(id) {
    return document.getElementById(id);
  }

  function getStoredState(key, defaultValue) {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored === null) return defaultValue;
      if (stored === 'true') return true;
      if (stored === 'false') return false;
      return stored;
    } catch (e) {
      console.warn('LifeOS AI Rail: Failed to read from sessionStorage:', e);
      return defaultValue;
    }
  }

  function setStoredState(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('LifeOS AI Rail: Failed to write to sessionStorage:', e);
    }
  }

  function applyReducedMotion(element) {
    if (prefersReducedMotion) {
      element.style.transition = 'none';
    } else {
      // Clear inline style to let CSS handle transitions
      element.style.transition = '';
    }
  }

  function renderAiRailStructure() {
    let root = $(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }

    root.innerHTML = `
      <div class="lifeos-ai-rail-container" id="${CONTAINER_ID}">
        <div class="lifeos-ai-rail-collapsed" id="${COLLAPSED_ID}">
          <span>AI Assistant</span>
          <button class="lifeos-ai-rail-toggle-btn" id="${TOGGLE_BTN_ID}" aria-label="Expand AI Assistant">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>
        <div class="lifeos-ai-rail-expanded">
          <div class="lifeos-ai-rail-header">
            <span class="lifeos-ai-rail-header-title">AI Assistant</span>
            <button class="lifeos-ai-rail-dock-toggle-btn" id="${DOCK_TOGGLE_BTN_ID}" aria-label="Toggle dock position">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
            </button>
            <button class="lifeos-ai-rail-close-btn" id="${CLOSE_BTN_ID}" aria-label="Collapse AI Assistant">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="lifeos-ai-rail-transcript" id="lifeos-ai-rail-transcript">
            <div class="lifeos-ai-rail-message assistant">How can I help you today?</div>
          </div>
          <div class="lifeos-ai-rail-input">
            <input type="text" class="lifeos-ai-rail-input-field" id="${INPUT_FIELD_ID}" placeholder="Ask Lumin a quick question...">
          </div>
        </div>
      </div>
    `;
  }

  function updateRailVisualState() {
    const container = $(CONTAINER_ID);
    if (!container) return;

    const isExpanded = getStoredState(STORAGE_KEY_EXPANDED, false);
    const dockPosition = getStoredState(STORAGE_KEY_DOCK, 'bottom');

    container.classList.toggle('is-expanded', isExpanded);
    container.classList.toggle('lifeos-ai-rail-dock-bottom', dockPosition === 'bottom');
    container.classList.toggle('lifeos-ai-rail-dock-top', dockPosition === 'top');

    applyReducedMotion(container);
  }

  function toggleExpandedState() {
    const container = $(CONTAINER_ID);
    if (!container) return;

    const currentlyExpanded = container.classList.contains('is-expanded');
    setStoredState(STORAGE_KEY_EXPANDED, !currentlyExpanded);
    updateRailVisualState();

    if (!currentlyExpanded) {
      // If expanding, focus the input field
      const inputField = $(INPUT_FIELD_ID);
      if (inputField) inputField.focus();
    }
  }

  function toggleDockPositionState() {
    const container = $(CONTAINER_ID);
    if (!container) return;

    const currentDock = container.classList.contains('lifeos-ai-rail-dock-bottom') ? 'bottom' : 'top';
    const newDock = currentDock === 'bottom' ? 'top' : 'bottom';
    setStoredState(STORAGE_KEY_DOCK, newDock);
    updateRailVisualState();
  }

  function handleAiRailInputSubmit(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const inputField = $(INPUT_FIELD_ID);
      const text = inputField.value.trim();

      if (!text) return;

      // Attempt to integrate with the main dashboard chat
      const mainChatInput = $('chat-input');
      const sendChatFunction = window.sendChat; // From lifeos-dashboard.html

      if (mainChatInput && sendChatFunction && typeof sendChatFunction === 'function') {
        mainChatInput.value = text;
        sendChatFunction(); // Trigger the main dashboard's chat send function
        inputField.value = ''; // Clear AI rail input
        toggleExpandedState(); // Collapse the AI rail after sending
        mainChatInput.focus(); // Focus the main chat input after interaction
      } else if (window.LifeOSChat && typeof window.LifeOSChat.focusChatInput === 'function') {
        // Fallback/alternative: if a global LifeOSChat object exists with a focus method
        window.LifeOSChat.focusChatInput(text);
        inputField.value = '';
        toggleExpandedState();
      } else {
        // Last resort: just focus the main chat input with the text
        if (mainChatInput) {
          mainChatInput.value = text;
          mainChatInput.focus();
          inputField.value = '';
          toggleExpandedState();
        }
      }
    }
  }

  function mountAiRail() {
    renderAiRailStructure();
    updateRailVisualState(); // Apply initial state from storage

    // Event Listeners
    $(COLLAPSED_ID)?.addEventListener('click', toggleExpandedState);
    $(TOGGLE_BTN_ID)?.addEventListener('click', toggleExpandedState);
    $(CLOSE_BTN_ID)?.addEventListener('click', toggleExpandedState);
    $(DOCK_TOGGLE_BTN_ID)?.addEventListener('click', toggleDockPositionState);
    $(INPUT_FIELD_ID)?.addEventListener('keypress', handleAiRailInputSubmit);

    // Reduced motion check
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion = mediaQuery.matches;
      mediaQuery.addEventListener('change', (e) => {
        prefersReducedMotion = e.matches;
        applyReducedMotion($(CONTAINER_ID));
      });
    }
  }

  // Attach to window for external mounting if desired, as per spec
  window.LifeOSDashboardAiRail = {
    mount: mountAiRail
  };

  // Auto-mount when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAiRail);
  } else {
    mountAiRail();
  }
})();