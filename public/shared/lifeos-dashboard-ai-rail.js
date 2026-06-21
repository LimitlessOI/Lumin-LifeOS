/**
 * SYNOPSIS: Contract: Persistent AI Rail (Lumin Rail)
 * Contract: Persistent AI Rail (Lumin Rail)
 * Purpose: To provide a ubiquitous, quick-access AI interaction surface across the LifeOS platform.
 * This script implements the client-side logic for the AI Rail, including UI states,
 * docking, and integration with existing chat entrypoints as specified in
 * DASHBOARD_AI_RAIL_CONTRACT.md and the task prompt.
 *
 * Note on chat logic: Per task instruction "does not duplicate full chat logic",
 * the rail's input fields will focus the main dashboard chat input, and its
 * transcript panel will display a static welcome message, rather than managing
 * live conversation history or direct message sending/voice input within the rail itself.
 */
(function() {
  const STORAGE_KEY_EXPANDED = 'lifeos-ai-rail:expanded';
  const STORAGE_KEY_DOCK_POSITION = 'lifeos-ai-rail:dock-position';
  const ROOT_ID = 'lifeos-ai-rail-root';
  const CONTAINER_ID = 'lifeos-ai-rail-container';

  let _focusChatInputCallback = null;
  let _isExpanded = sessionStorage.getItem(STORAGE_KEY_EXPANDED) === 'true';
  let _dockPosition = sessionStorage.getItem(STORAGE_KEY_DOCK_POSITION) || 'bottom'; // 'top' or 'bottom'

  /**
   * Creates and appends the AI Rail HTML structure to the DOM.
   * @returns {HTMLElement} The created rail container element.
   */
  function createRailElement() {
    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = `lifeos-ai-rail-container`;
    container.innerHTML = `
      <div class="lifeos-ai-rail-header">
        <span class="lifeos-ai-rail-title">Lumin AI</span>
        <input type="text" class="lifeos-ai-rail-input-collapsed" placeholder="Quick chat with Lumin..." aria-label="Quick chat input">
        <button class="lifeos-ai-rail-button" id="lifeos-ai-rail-dock-toggle" title="Toggle dock position">↕</button>
        <button class="lifeos-ai-rail-button" id="lifeos-ai-rail-expand-toggle" title="Expand/Collapse AI Rail">↔</button>
        <button class="lifeos-ai-rail-button lifeos-ai-rail-accent" id="lifeos-ai-rail-full-chat" title="Open full chat">↗</button>
      </div>
      <div class="lifeos-ai-rail-transcript-panel">
        <div class="lifeos-ai-rail-message lifeos-ai-rail-assistant">Hey there! How can I help?</div>
        <div class="lifeos-ai-rail-message lifeos-ai-rail-ambient" style="font-size:12px;opacity:0.7">
          (Click input or 'Open full chat' to interact)
        </div>
      </div>
      <div class="lifeos-ai-rail-input-expanded-wrapper">
        <textarea class="lifeos-ai-rail-input-expanded" placeholder="Chat with Lumin..." rows="1" aria-label="Expanded chat input"></textarea>
        <!-- Mic and Send buttons are hidden/disabled as per "does not duplicate full chat logic" -->
        <!-- <button class="lifeos-ai-rail-button" id="lifeos-ai-rail-mic-toggle" title="Toggle voice input">🎙</button> -->
        <!-- <button class="lifeos-ai-rail-send-button" id="lifeos-ai-rail-send-expanded" title="Send message">↑</button> -->
      </div>
    `;
    return container;
  }

  /**
   * Applies the current state (expanded/collapsed, dock position) to the rail element.
   * @param {HTMLElement} containerEl The rail container element.
   */
  function applyState(containerEl) {
    containerEl.classList.toggle('lifeos-ai-rail-expanded', _isExpanded);
    containerEl.classList.toggle('lifeos-ai-rail-collapsed', !_isExpanded);
    containerEl.classList.toggle('lifeos-ai-rail-dock-top', _dockPosition === 'top');
    containerEl.classList.toggle('lifeos-ai-rail-dock-bottom', _dockPosition === 'bottom');

    // Hide/show relevant sections based on expanded state
    const transcriptPanel = containerEl.querySelector('.lifeos-ai-rail-transcript-panel');
    const expandedInputWrapper = containerEl.querySelector('.lifeos-ai-rail-input-expanded-wrapper');
    const collapsedInput = containerEl.querySelector('.lifeos-ai-rail-input-collapsed');

    if (transcriptPanel) transcriptPanel.style.display = _isExpanded ? 'flex' : 'none';
    if (expandedInputWrapper) expandedInputWrapper.style.display = _isExpanded ? 'flex' : 'none';
    if (collapsedInput) collapsedInput.style.display = _isExpanded ? 'none' : 'flex';

    // Update expand/collapse button icon
    const expandToggleBtn = containerEl.querySelector('#lifeos-ai-rail-expand-toggle');
    if (expandToggleBtn) {
      expandToggleBtn.textContent = _isExpanded ? '↔' : '↔'; // Same icon, just toggles state
      expandToggleBtn.title = _isExpanded ? 'Collapse AI Rail' : 'Expand AI Rail';
    }
  }

  /**
   * Toggles the expanded/collapsed state of the AI Rail.
   */
  function toggleExpanded() {
    _isExpanded = !_isExpanded;
    sessionStorage.setItem(STORAGE_KEY_EXPANDED, _isExpanded);
    const containerEl = document.getElementById(CONTAINER_ID);
    if (containerEl) {
      applyState(containerEl);
    }
  }

  /**
   * Toggles the dock position of the AI Rail (top/bottom).
   */
  function toggleDockPosition() {
    _dockPosition = _dockPosition === 'bottom' ? 'top' : 'bottom';
    sessionStorage.setItem(STORAGE_KEY_DOCK_POSITION, _dockPosition);
    const containerEl = document.getElementById(CONTAINER_ID);
    if (containerEl) {
      applyState(containerEl);
    }
  }

  /**
   * Navigates to the full chat page.
   */
  function openFullChat() {
    window.location.href = '/overlay/lifeos-chat.html';
  }

  /**
   * Mounts the AI Rail into the specified container.
   * @param {object} options - Configuration options.
   * @param {function} options.focusChatInputCallback - Callback to focus the main chat input.
   */
  function mount(options) {
    _focusChatInputCallback = options.focusChatInputCallback;

    let rootEl = document.getElementById(ROOT_ID);
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = ROOT_ID;
      document.body.appendChild(rootEl);
    }

    // Prevent re-mounting if already present
    if (document.getElementById(CONTAINER_ID)) {
      console.warn('LifeOS AI Rail already mounted. Skipping.');
      return;
    }

    const railEl = createRailElement();
    rootEl.appendChild(railEl);

    applyState(railEl); // Apply initial state

    // Event Listeners
    const expandToggleBtn = railEl.querySelector('#lifeos-ai-rail-expand-toggle');
    if (expandToggleBtn) {
      expandToggleBtn.addEventListener('click', toggleExpanded);
    }

    const dockToggleBtn = railEl.querySelector('#lifeos-ai-rail-dock-toggle');
    if (dockToggleBtn) {
      dockToggleBtn.addEventListener('click', toggleDockPosition);
    }

    const fullChatBtn = railEl.querySelector('#lifeos-ai-rail-full-chat');
    if (fullChatBtn) {
      fullChatBtn.addEventListener('click', openFullChat);
    }

    const collapsedInput = railEl.querySelector('.lifeos-ai-rail-input-collapsed');
    if (collapsedInput) {
      collapsedInput.addEventListener('click', () => {
        if (_focusChatInputCallback) {
          _focusChatInputCallback();
        } else {
          openFullChat(); // Fallback to opening full chat if no callback
        }
      });
      collapsedInput.addEventListener('focus', () => {
        if (_focusChatInputCallback) {
          _focusChatInputCallback();
        } else {
          openFullChat();
        }
      });
    }

    const expandedInput = railEl.querySelector('.lifeos-ai-rail-input-expanded');
    if (expandedInput) {
      expandedInput.addEventListener('focus', () => {
        if (_focusChatInputCallback) {
          _focusChatInputCallback();
        } else {
          openFullChat();
        }
      });
    }

    // Theme changes are handled by CSS variables and data-theme attribute,
    // so no direct JS listener is needed here.
  }

  // Expose the mount function globally
  window.LifeOSDashboardAiRail = {
    mount: mount
  };
})();