/**
 * Technical Contract: Persistent AI Rail
 * This script implements the client-side logic for the Persistent AI Rail component
 * as outlined in DASHBOARD_AI_RAIL_CONTRACT.md.
 * It handles UI state (collapsed/expanded, dock position), persistence via sessionStorage,
 * and integration with existing chat functionality.
 */
(function() {
  const ROOT_ID = 'lifeos-ai-rail-root';
  const STORAGE_PREFIX = 'lifeos-ai-rail:';
  // CSS media queries handle 'prefers-reduced-motion' for transitions, no direct JS intervention needed for that.

  /**
   * Helper to get state from sessionStorage.
   * @param {string} key - The key for the sessionStorage item.
   * @param {*} defaultValue - The default value if the item is not found or parsing fails.
   * @returns {*} The parsed value from sessionStorage or the default value.
   */
  function getState(key, defaultValue) {
    try {
      const stored = sessionStorage.getItem(STORAGE_PREFIX + key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.error('Error reading sessionStorage for AI rail:', e);
      return defaultValue;
    }
  }

  /**
   * Helper to set state in sessionStorage.
   * @param {string} key - The key for the sessionStorage item.
   * @param {*} value - The value to store.
   */
  function setState(key, value) {
    try {
      sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing sessionStorage for AI rail:', e);
    }
  }

  /**
   * Mounts the AI Rail UI component into the DOM.
   * @param {object} [options] - Configuration options.
   * @param {function} [options.focusChatInputCallback] - Callback to focus the main chat input.
   */
  function mountAiRail(options) {
    const focusChatInputCallback = options && options.focusChatInputCallback;

    let rootEl = document.getElementById(ROOT_ID);
    if (!rootEl) {
      // If root element is absent, create it and append to body.
      rootEl = document.createElement('div');
      rootEl.id = ROOT_ID;
      document.body.appendChild(rootEl);
    }

    // Initial state from storage or defaults
    let isExpanded = getState('expanded', false);
    let dockPosition = getState('dock-position', 'bottom'); // 'top' or 'bottom'

    // Apply initial classes to the root element
    rootEl.className = 'lifeos-ai-rail-root'; // Reset classes to ensure a clean state
    rootEl.classList.add(`lifeos-ai-rail-dock-${dockPosition}`);
    rootEl.classList.add(isExpanded ? 'lifeos-ai-rail-expanded' : 'lifeos-ai-rail-collapsed');

    // Inject the internal HTML structure for the AI rail
    rootEl.innerHTML = `
      <div class="lifeos-ai-rail-header">
        <div class="lifeos-ai-rail-title">
          <span class="lifeos-ai-rail-status-dot"></span>
          Lumin AI
        </div>
        <div class="lifeos-ai-rail-controls">
          <button class="lifeos-ai-rail-toggle-dock-btn" title="Toggle dock position">↕</button>
          <button class="lifeos-ai-rail-toggle-btn" title="Expand/Collapse">
            <span class="collapsed-icon" style="display:${isExpanded ? 'none' : 'inline-block'};">▲</span>
            <span class="expanded-icon" style="display:${isExpanded ? 'inline-block' : 'none'};">▼</span>
          </button>
        </div>
      </div>
      <div class="lifeos-ai-rail-content">
        <div class="lifeos-ai-rail-message assistant">Hello! How can I help you today?</div>
      </div>
      <div class="lifeos-ai-rail-input-area">
        <input type="text" class="lifeos-ai-rail-input" placeholder="Ask Lumin anything...">
        <button class="lifeos-ai-rail-send-btn">↑</button>
        <button class="lifeos-ai-rail-open-chat-btn" title="Open full chat">💬</button>
      </div>
    `;

    // Get references to interactive elements
    const toggleBtn = rootEl.querySelector('.lifeos-ai-rail-toggle-btn');
    const toggleDockBtn = rootEl.querySelector('.lifeos-ai-rail-toggle-dock-btn');
    const openChatBtn = rootEl.querySelector('.lifeos-ai-rail-open-chat-btn');
    const collapsedIcon = rootEl.querySelector('.collapsed-icon');
    const expandedIcon = rootEl.querySelector('.expanded-icon');

    /** Updates the visibility of the toggle icons based on the expanded state. */
    function updateToggleIcons() {
      if (isExpanded) {
        collapsedIcon.style.display = 'none';
        expandedIcon.style.display = 'inline-block';
      } else {
        collapsedIcon.style.display = 'inline-block';
        expandedIcon.style.display = 'none';
      }
    }

    // Event listener for expand/collapse toggle button
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        isExpanded = !isExpanded;
        rootEl.classList.toggle('lifeos-ai-rail-expanded', isExpanded);
        rootEl.classList.toggle('lifeos-ai-rail-collapsed', !isExpanded);
        setState('expanded', isExpanded);
        updateToggleIcons();
      });
    }

    // Event listener for dock position toggle button
    if (toggleDockBtn) {
      toggleDockBtn.addEventListener('click', function() {
        dockPosition = (dockPosition === 'bottom' ? 'top' : 'bottom');
        rootEl.classList.toggle('lifeos-ai-rail-dock-bottom', dockPosition === 'bottom');
        rootEl.classList.toggle('lifeos-ai-rail-dock-top', dockPosition === 'top');
        setState('dock-position', dockPosition);
      });
    }

    // Event listener for opening the full chat (stubs existing entrypoint)
    if (openChatBtn && focusChatInputCallback) {
      openChatBtn.addEventListener('click', function() {
        focusChatInputCallback();
        // Optionally collapse the rail when opening the full chat
        if (isExpanded) {
          isExpanded = false;
          rootEl.classList.remove('lifeos-ai-rail-expanded');
          rootEl.classList.add('lifeos-ai-rail-collapsed');
          setState('expanded', isExpanded);
          updateToggleIcons();
        }
      });
    }

    // Event listener to expand the rail when clicking on its collapsed state,
    // but not when clicking on interactive elements within it.
    rootEl.addEventListener('click', function(event) {
      const isInteractiveElement = event.target.closest(
        '.lifeos-ai-rail-controls button, .lifeos-ai-rail-input-area button, .lifeos-ai-rail-input-area input'
      );
      if (!isExpanded && !isInteractiveElement) {
        isExpanded = true;
        rootEl.classList.remove('lifeos-ai-rail-collapsed');
        rootEl.classList.add('lifeos-ai-rail-expanded');
        setState('expanded', isExpanded);
        updateToggleIcons();
      }
    });
  }

  // Attach the mount function to the window object for external access.
  // This allows other scripts (e.g., the dashboard's module script) to initialize the rail.
  window.LifeOSDashboardAiRail = {
    mount: mountAiRail
  };
})();