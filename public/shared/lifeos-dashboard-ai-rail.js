/**
 * LifeOS Dashboard AI Rail
 * - Cites: DASHBOARD_AI_RAIL_CONTRACT.md (Note: File not found in repository)
 *
 * IIFE ES module-compatible script that mounts AI rail UX into #lifeos-ai-rail-root.
 * Provides collapsed/expanded toggle, dock position persistence, and stubs
 * open existing Lumin/chat entrypoints or focuses chat input hook if present.
 * Respects reduced-motion.
 */
(function() {
  const ROOT_ID = 'lifeos-ai-rail-root';
  const STORAGE_KEY_STATE = 'lifeos-ai-rail:state';
  const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  let focusChatInputCallback = null;
  let prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

  /**
   * Creates a DOM element with optional classes and attributes.
   * @param {string} tag
   * @param {string[]} classes
   * @param {Object.<string, string>} attributes
   * @returns {HTMLElement}
   */
  function createElement(tag, classes = [], attributes = {}) {
    const el = document.createElement(tag);
    if (classes.length) {
      el.classList.add(...classes);
    }
    for (const key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
    return el;
  }

  /**
   * Renders the initial AI Rail HTML structure.
   * @returns {HTMLElement} The root AI rail element.
   */
  function renderRailStructure() {
    const root = createElement('div', ['lifeos-ai-rail-root'], { id: ROOT_ID });

    // Collapsed strip
    const collapsedStrip = createElement('div', ['lifeos-ai-rail-collapsed-strip'], {
      role: 'button',
      'aria-expanded': 'false',
      'aria-controls': 'lifeos-ai-rail-expanded-panel',
      tabindex: '0'
    });
    collapsedStrip.innerHTML = `
      <span class="lifeos-ai-rail-collapsed-strip-text">Ask Lumin anything…</span>
      <span class="lifeos-ai-rail-collapsed-strip-icon">✦</span>
    `;
    root.appendChild(collapsedStrip);

    // Expanded panel
    const expandedPanel = createElement('div', ['lifeos-ai-rail-expanded-panel'], { id: 'lifeos-ai-rail-expanded-panel' });
    expandedPanel.innerHTML = `
      <div class="lifeos-ai-rail-expanded-panel-header">
        <span class="lifeos-ai-rail-expanded-panel-title">Lumin AI</span>
        <button class="lifeos-ai-rail-expanded-panel-close-btn" aria-label="Collapse AI Rail">✕</button>
        <button class="lifeos-ai-rail-dock-toggle-btn" aria-label="Toggle dock position">⬆</button>
      </div>
      <div class="lifeos-ai-rail-transcript-container">
        <!-- Initial message, actual chat content is delegated -->
        <div class="lifeos-ai-rail-message assistant">Hey there! How can I help you today?</div>
      </div>
      <div class="lifeos-ai-rail-input-area">
        <textarea class="lifeos-ai-rail-input" placeholder="Ask Lumin anything…" rows="1" aria-label="AI chat input"></textarea>
        <button class="lifeos-ai-rail-send-btn" aria-label="Send message">↑</button>
      </div>
    `;
    root.appendChild(expandedPanel);

    return root;
  }

  /**
   * Applies the stored state (collapsed/expanded, dock position) to the rail.
   * @param {HTMLElement} railRoot
   */
  function applyStoredState(railRoot) {
    const storedState = sessionStorage.getItem(STORAGE_KEY_STATE);
    const storedDock = sessionStorage.getItem(STORAGE_KEY_DOCK);

    if (storedDock === 'top') {
      railRoot.classList.add('dock-top');
      railRoot.classList.remove('dock-bottom');
      railRoot.querySelector('.lifeos-ai-rail-dock-toggle-btn').textContent = '⬇';
      railRoot.querySelector('.lifeos-ai-rail-dock-toggle-btn').setAttribute('aria-label', 'Dock to bottom');
    } else {
      railRoot.classList.add('dock-bottom');
      railRoot.classList.remove('dock-top');
      railRoot.querySelector('.lifeos-ai-rail-dock-toggle-btn').textContent = '⬆';
      railRoot.querySelector('.lifeos-ai-rail-dock-toggle-btn').setAttribute('aria-label', 'Dock to top');
    }

    if (storedState === 'expanded') {
      railRoot.classList.add('expanded');
      railRoot.classList.remove('collapsed');
      railRoot.querySelector('.lifeos-ai-rail-collapsed-strip').setAttribute('aria-expanded', 'true');
    } else {
      railRoot.classList.add('collapsed');
      railRoot.classList.remove('expanded');
      railRoot.querySelector('.lifeos-ai-rail-collapsed-strip').setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Toggles the collapsed/expanded state of the AI rail.
   * @param {HTMLElement} railRoot
   */
  function toggleRailState(railRoot) {
    const isCollapsed = railRoot.classList.contains('collapsed');
    if (isCollapsed) {
      railRoot.classList.remove('collapsed');
      railRoot.classList.add('expanded');
      railRoot.querySelector('.lifeos-ai-rail-collapsed-strip').setAttribute('aria-expanded', 'true');
      sessionStorage.setItem(STORAGE_KEY_STATE, 'expanded');
      // Focus the chat input when expanded
      if (focusChatInputCallback) {
        focusChatInputCallback();
      } else {
        railRoot.querySelector('.lifeos-ai-rail-input').focus();
      }
    } else {
      railRoot.classList.remove('expanded');
      railRoot.classList.add('collapsed');
      railRoot.querySelector('.lifeos-ai-rail-collapsed-strip').setAttribute('aria-expanded', 'false');
      sessionStorage.setItem(STORAGE_KEY_STATE, 'collapsed');
    }
  }

  /**
   * Toggles the dock position of the AI rail (bottom/top).
   * @param {HTMLElement} railRoot
   */
  function toggleDockPosition(railRoot) {
    const isDockedBottom = railRoot.classList.contains('dock-bottom');
    const dockToggleBtn = railRoot.querySelector('.lifeos-ai-rail-dock-toggle-btn');

    if (isDockedBottom) {
      railRoot.classList.remove('dock-bottom');
      railRoot.classList.add('dock-top');
      sessionStorage.setItem(STORAGE_KEY_DOCK, 'top');
      dockToggleBtn.textContent = '⬇';
      dockToggleBtn.setAttribute('aria-label', 'Dock to bottom');
    } else {
      railRoot.classList.remove('dock-top');
      railRoot.classList.add('dock-bottom');
      sessionStorage.setItem(STORAGE_KEY_DOCK, 'bottom');
      dockToggleBtn.textContent = '⬆';
      dockToggleBtn.setAttribute('aria-label', 'Dock to top');
    }
  }

  /**
   * Handles reduced motion preference.
   * @param {HTMLElement} railRoot
   */
  function handleReducedMotion(railRoot) {
    if (prefersReducedMotion) {
      railRoot.style.transition = 'none';
    } else {
      railRoot.style.transition = ''; // Reset to CSS defined transition
    }
  }

  /**
   * Mounts the AI Rail into the specified container.
   * @param {Object} options
   * @param {HTMLElement} [options.container=document.body] - The element to mount the rail into.
   * @param {Function} [options.focusChatInputCallback] - Callback to focus the main chat input.
   */
  function mount({ container = document.body, focusChatInputCallback: cb } = {}) {
    focusChatInputCallback = cb;

    let railRoot = document.getElementById(ROOT_ID);
    if (!railRoot) {
      railRoot = renderRailStructure();
      container.appendChild(railRoot);
    }

    applyStoredState(railRoot);
    handleReducedMotion(railRoot);

    // Event Listeners
    railRoot.querySelector('.lifeos-ai-rail-collapsed-strip').addEventListener('click', () => toggleRailState(railRoot));
    railRoot.querySelector('.lifeos-ai-rail-expanded-panel-close-btn').addEventListener('click', () => toggleRailState(railRoot));
    railRoot.querySelector('.lifeos-ai-rail-dock-toggle-btn').addEventListener('click', () => toggleDockPosition(railRoot));

    // Delegate send button click to focus main chat input
    railRoot.querySelector('.lifeos-ai-rail-send-btn').addEventListener('click', () => {
      if (focusChatInputCallback) {
        focusChatInputCallback();
      } else {
        console.warn('LifeOSDashboardAiRail: No focusChatInputCallback provided. Cannot delegate chat input focus.');
      }
    });

    // Delegate input focus to main chat input
    railRoot.querySelector('.lifeos-ai-rail-input').addEventListener('focus', (e) => {
      e.preventDefault(); // Prevent actual focus on this input
      if (focusChatInputCallback) {
        focusChatInputCallback();
      } else {
        console.warn('LifeOSDashboardAiRail: No focusChatInputCallback provided. Cannot delegate chat input focus.');
      }
    });

    // Listen for reduced motion changes
    window.matchMedia(REDUCED_MOTION_QUERY).addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
      handleReducedMotion(railRoot);
    });
  }

  // Expose the mount function globally
  window.LifeOSDashboardAiRail = { mount };
})();