// DASHBOARD_AI_RAIL_CONTRACT.md
(function() {
  // Constants for sessionStorage keys
  const COLLAPSED_KEY = 'lifeos-ai-rail:collapsed';
  const DOCK_POSITION_KEY = 'lifeos-ai-rail:dock-position'; // 'bottom' or 'top'

  let aiRailRoot;
  let isCollapsed = true;
  let dockPosition = 'bottom'; // Default

  function saveState() {
    sessionStorage.setItem(COLLAPSED_KEY, isCollapsed);
    sessionStorage.setItem(DOCK_POSITION_KEY, dockPosition);
  }

  function loadState() {
    const storedCollapsed = sessionStorage.getItem(COLLAPSED_KEY);
    const storedDockPosition = sessionStorage.getItem(DOCK_POSITION_KEY);

    if (storedCollapsed !== null) {
      isCollapsed = storedCollapsed === 'true';
    }
    if (storedDockPosition) {
      dockPosition = storedDockPosition;
    }
  }

  function updateClasses() {
    if (!aiRailRoot) return;

    aiRailRoot.classList.toggle('lifeos-ai-rail-root--collapsed', isCollapsed);
    aiRailRoot.classList.toggle('lifeos-ai-rail-root--dock-bottom', dockPosition === 'bottom');
    aiRailRoot.classList.toggle('lifeos-ai-rail-root--dock-top', dockPosition === 'top');

    // Update toggle button text/icon
    const toggleBtn = aiRailRoot.querySelector('.lifeos-ai-rail-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = isCollapsed ? '⬆️' : '⬇️';
      toggleBtn.title = isCollapsed ? 'Expand AI Rail' : 'Collapse AI Rail';
    }
    const dockToggleBtn = aiRailRoot.querySelector('.lifeos-ai-rail-dock-toggle');
    if (dockToggleBtn) {
      dockToggleBtn.textContent = dockPosition === 'bottom' ? '⬆️' : '⬇️';
      dockToggleBtn.title = dockPosition === 'bottom' ? 'Dock to Top' : 'Dock to Bottom';
    }
  }

  function toggleCollapsed() {
    isCollapsed = !isCollapsed;
    saveState();
    updateClasses();
  }

  function toggleDockPosition() {
    dockPosition = dockPosition === 'bottom' ? 'top' : 'bottom';
    saveState();
    updateClasses();
  }

  function autoResizeRailInput(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'; // Max height 160px, similar to main chat
  }

  function handleRailInput(event) {
    // Only trigger on Enter keypress (without Shift) or explicit button click
    if (event.type === 'keypress') {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevent new line
      } else {
        return; // Not Enter key, or Shift+Enter
      }
    } else if (event.type === 'click') {
      if (!event.target.classList.contains('lifeos-ai-rail-send-btn')) return; // Only send button click
    }

    const railInput = aiRailRoot.querySelector('.lifeos-ai-rail-input');
    const text = railInput.value.trim();

    if (!text) return;

    const mainChatInput = document.getElementById('chat-input');
    if (mainChatInput) {
      mainChatInput.value = text;
      mainChatInput.focus();
      // Trigger the main dashboard's send function if available
      if (typeof window.sendChat === 'function') {
        window.sendChat();
      }
    } else {
      // Fallback: if main chat input not found, just clear rail input
      console.warn('LifeOS AI Rail: Could not find main chat input (#chat-input).');
    }
    railInput.value = '';
    autoResizeRailInput(railInput); // Reset height after clearing
  }

  function mountAiRail() {
    aiRailRoot = document.getElementById('lifeos-ai-rail-root');
    if (!aiRailRoot) {
      aiRailRoot = document.createElement('div');
      aiRailRoot.id = 'lifeos-ai-rail-root';
      document.body.appendChild(aiRailRoot);
    }

    aiRailRoot.innerHTML = `
      <div class="lifeos-ai-rail-header">
        <div class="lifeos-ai-rail-title">AI Rail</div>
        <div class="lifeos-ai-rail-controls">
          <button class="lifeos-ai-rail-dock-toggle" title="Toggle dock position">⬆️</button>
          <button class="lifeos-ai-rail-toggle" title="Toggle collapsed/expanded">⬇️</button>
        </div>
      </div>
      <div class="lifeos-ai-rail-content">
        <div class="lifeos-ai-rail-transcript">
          <div class="lifeos-ai-rail-message assistant">Hello! How can I assist you today?</div>
        </div>
        <div class="lifeos-ai-rail-input-area">
          <textarea class="lifeos-ai-rail-input" placeholder="Ask Lumin a quick question..." rows="1"></textarea>
          <button class="lifeos-ai-rail-send-btn">Send</button>
        </div>
      </div>
    `;

    loadState();
    updateClasses();

    // Event listeners
    aiRailRoot.querySelector('.lifeos-ai-rail-toggle').addEventListener('click', toggleCollapsed);
    aiRailRoot.querySelector('.lifeos-ai-rail-dock-toggle').addEventListener('click', toggleDockPosition);
    aiRailRoot.querySelector('.lifeos-ai-rail-send-btn').addEventListener('click', handleRailInput);
    const railInputEl = aiRailRoot.querySelector('.lifeos-ai-rail-input');
    railInputEl.addEventListener('keypress', handleRailInput);
    railInputEl.addEventListener('input', () => autoResizeRailInput(railInputEl));

    // Theme listener: The rail's CSS uses CSS variables, which automatically adapt to theme changes
    // driven by `document.documentElement.dataset.theme`. No explicit JS listener is needed
    // unless the rail itself had JS-driven styling that needed to react.
    // Reduced motion: Modern browsers handle `prefers-reduced-motion` for CSS transitions automatically.
  }

  // Expose mount function globally as per spec
  window.LifeOSDashboardAiRail = { mount: mountAiRail };

  // Self-mount logic:
  // If the DOM is already loaded, mount immediately.
  // Otherwise, wait for DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAiRail);
  } else {
    mountAiRail();
  }
})();