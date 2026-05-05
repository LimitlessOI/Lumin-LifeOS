/*
 * Technical Contract: Persistent AI Rail
 * This document outlines the technical contract for the "Persistent AI Rail," a new user interface component designed to provide continuous, context-aware AI interaction within the LifeOS dashboard. The rail will offer a consistent entry point for AI assistance, complementing existing Lumin and chat functionalities without replacing them.
 * - Core Functionality:
 * - Persistent UI Element: A dedicated UI component that remains visible and accessible across various dashboard views.
 * - Docking: The rail will be dockable to either the top or bottom of the primary dashboard viewport, allowing users to choose their preferred placement.
 * - Collapsed State: When not actively in use, the rail will collapse into a compact, one-line strip, minimizing screen real estate usage. This strip will provide a clear visual indicator of its presence and a quick way to expand it.
 * - Expanded State: Upon user interaction (e.g., click on the collapsed strip), the rail will expand to reveal a full transcript of the ongoing AI conversation, along with input controls.
 * - Voice/Text Parity: Users will be able to interact with the AI using both voice input and text input, with full functional parity between the two modes. The system will seamlessly convert voice to text for processing and text to voice for output.
 * - Read-Aloud Functionality: The AI's responses within the expanded transcript will include a "read-aloud" option, allowing users to listen to the AI's output.
 * - Relationship to Existing Lumin/Chat Entry Points:
 * The Persistent AI Rail is an additional interaction modality. It is designed to provide a persistent, always-on assistant experience. It will leverage the same underlying AI services and models as existing Lumin and chat entry points but will offer a distinct user experience focused on continuity and accessibility. It will not replace or deprecate any existing Lumin or chat features.
 * - What Must Not Break:
 * - Existing Lumin Functionality: All current Lumin features, including contextual suggestions, quick actions, and embedded AI interactions, must continue to function as designed.
 * - Existing Chat Entry Points: Any dedicated chat interfaces or modals must remain fully operational and accessible.
 * - Builder Endpoints: All existing `/api/v1/lifeos/builder/` and `/api/v1/builder/` endpoints and their associated functionality (build, execute, review, status, etc.) must remain unaffected and stable.
 * - Core Platform Stability: The introduction of the AI rail must not introduce performance regressions, memory leaks, or instability to the core LifeOS platform.
 * - Authentication and Authorization: Existing auth and authz mechanisms for AI interactions must be respected and enforced by the new rail.
 * Configuration Integrity: No changes to core platform configuration files (`config/.js`) should be made without explicit architectural review and approval.
 * - Non-goals
 * - Replacement of Existing Chat UIs: The Persistent AI Rail is not intended to replace or deprecate existing, dedicated chat interfaces within LifeOS. It is a complementary feature.
 * - Offline Functionality: Initial phases will not focus on offline AI interaction capabilities.
 * - Deep Integration with Every Dashboard Widget: While context-aware, the rail is not intended to have direct, embedded control over every individual dashboard widget's state in its initial release. Its primary focus is conversational AI.
 * - Custom AI Model Training: This project does not involve training new AI models; it focuses on the UI and interaction layer with existing models.
 * - Phases
 * Phase 1: UI Scaffolding and Basic Text Interaction
 * - Implement the persistent UI container for the rail.
 * - Develop collapsed and expanded states with basic styling.
 * - Integrate text input and display of AI text responses.
 * - Connect to existing AI service endpoints for text-based conversation.
 * - Implement docking mechanism (top/bottom).
 * Phase 2: Voice Input and Read-Aloud
 * - Integrate browser-based speech-to-text for voice input.
 * - Implement text-to-speech for AI response read-aloud functionality.
 * - Ensure voice/text parity in interaction flow.
 * Phase 3: Contextual Awareness and Refinements
 * - Implement basic contextual awareness (e.g., current dashboard view, active project).
 * - UI/UX refinements based on user feedback and testing.
 * - Performance optimizations.
 * - Open Questions
 * - Default Dock Position: Should the rail default to top or bottom for new users? Is this configurable?
 * - Initial State: Should the rail be collapsed or expanded by default on page load?
 * - Integration with Global State Management: How will the rail's state (collapsed/expanded, conversation history) integrate with the existing global state management system (if any) to ensure persistence across navigation?
 * - Accessibility Requirements: What are the specific accessibility (WCAG) requirements for voice interaction and read-aloud features?
 * - Error Handling and Feedback: How will network errors, AI service errors, or input validation errors be communicated to the user within the rail?
 * - Conversation History Persistence: How will conversation history be stored and retrieved across user sessions? (e.g., local storage, backend db).
 */
(function() {
  // Constants for sessionStorage keys, CSS classes, etc.
  const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock-position';
  const STORAGE_KEY_EXPANDED = 'lifeos-ai-rail:expanded-state';
  const DOCK_CLASS_TOP = 'lifeos-ai-rail-dock-top';
  const DOCK_CLASS_BOTTOM = 'lifeos-ai-rail-dock-bottom';
  const RAIL_CLASS_COLLAPSED = 'lifeos-ai-rail-collapsed';
  const RAIL_CLASS_EXPANDED = 'lifeos-ai-rail-expanded';

  let rootEl;
  let railEl;
  let headerEl;
  let toggleBtn;
  let dockBtn;
  let openChatBtn;
  let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function saveState() {
    if (rootEl) {
      sessionStorage.setItem(STORAGE_KEY_DOCK, rootEl.classList.contains(DOCK_CLASS_TOP) ? 'top' : 'bottom');
    }
    if (railEl) {
      sessionStorage.setItem(STORAGE_KEY_EXPANDED, railEl.classList.contains(RAIL_CLASS_EXPANDED) ? 'expanded' : 'collapsed');
    }
  }

  function loadState() {
    const dock = sessionStorage.getItem(STORAGE_KEY_DOCK);
    const expanded = sessionStorage.getItem(STORAGE_KEY_EXPANDED);

    // Apply dock position, default to bottom
    if (dock === 'top') {
      rootEl.classList.add(DOCK_CLASS_TOP);
      rootEl.classList.remove(DOCK_CLASS_BOTTOM);
      if (dockBtn) {
        dockBtn.innerHTML = '⬇'; // Down arrow for dock bottom
        dockBtn.title = 'Dock to bottom';
      }
    } else {
      rootEl.classList.add(DOCK_CLASS_BOTTOM);
      rootEl.classList.remove(DOCK_CLASS_TOP);
      if (dockBtn) {
        dockBtn.innerHTML = '⬆'; // Up arrow for dock top
        dockBtn.title = 'Dock to top';
      }
    }

    // Apply expanded state, default to collapsed
    if (expanded === 'expanded') {
      railEl.classList.add(RAIL_CLASS_EXPANDED);
      railEl.classList.remove(RAIL_CLASS_COLLAPSED);
      if (toggleBtn) {
        toggleBtn.innerHTML = '▼'; // Down arrow for collapse
        toggleBtn.title = 'Collapse AI Rail';
      }
    } else {
      railEl.classList.add(RAIL_CLASS_COLLAPSED);
      railEl.classList.remove(RAIL_CLASS_EXPANDED);
      if (toggleBtn) {
        toggleBtn.innerHTML = '▲'; // Up arrow for expand
        toggleBtn.title = 'Expand AI Rail';
      }
    }
  }

  function toggleExpanded() {
    if (railEl.classList.contains(RAIL_CLASS_EXPANDED)) {
      railEl.classList.remove(RAIL_CLASS_EXPANDED);
      railEl.classList.add(RAIL_CLASS_COLLAPSED);
      if (toggleBtn) {
        toggleBtn.innerHTML = '▲'; // Up arrow for expand
        toggleBtn.title = 'Expand AI Rail';
      }
    } else {
      railEl.classList.remove(RAIL_CLASS_COLLAPSED);
      railEl.classList.add(RAIL_CLASS_EXPANDED);
      if (toggleBtn) {
        toggleBtn.innerHTML = '▼'; // Down arrow for collapse
        toggleBtn.title = 'Collapse AI Rail';
      }
    }
    saveState();
  }

  function toggleDockPosition() {
    if (rootEl.classList.contains(DOCK_CLASS_BOTTOM)) {
      rootEl.classList.remove(DOCK_CLASS_BOTTOM);
      rootEl.classList.add(DOCK_CLASS_TOP);
      if (dockBtn) {
        dockBtn.innerHTML = '⬇'; // Down arrow for dock bottom
        dockBtn.title = 'Dock to bottom';
      }
    } else {
      rootEl.classList.remove(DOCK_CLASS_TOP);
      rootEl.classList.add(DOCK_CLASS_BOTTOM);
      if (dockBtn) {
        dockBtn.innerHTML = '⬆'; // Up arrow for dock top
        dockBtn.title = 'Dock to top';
      }
    }
    saveState();
  }

  function openFullChat(e) {
    // Prevent event from bubbling up to toggleExpanded if clicked on header
    if (e) e.stopPropagation();

    // Check if dashboard chat input exists and focus it
    const dashboardChatInput = document.getElementById('chat-input');
    if (dashboardChatInput) {
      dashboardChatInput.focus();
      // If the dashboard chat is part of a collapsible section,
      // this would be the place to expand it.
      // Based on public/overlay/lifeos-dashboard.html, the chat is always visible.
    } else {
      // Fallback: open the full chat page in a new window/tab
      window.open('/overlay/lifeos-chat.html', '_blank');
    }
  }

  function applyReducedMotion() {
    if (prefersReducedMotion) {
      if (railEl) railEl.style.transition = 'none';
    } else {
      if (railEl) railEl.style.transition = ''; // Reset to CSS default
    }
  }

  function observeThemeChanges() {
    const htmlEl = document.documentElement;
    if (!htmlEl) return;

    // Using MutationObserver to detect changes to data-theme attribute
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          // No direct action needed for the rail itself as it uses CSS variables,
          // but this confirms the observation mechanism works.
        }
      });
    });

    observer.observe(htmlEl, { attributes: true });
  }

  function mount(containerId) {
    containerId = containerId || 'lifeos-ai-rail-root';
    rootEl = document.getElementById(containerId);

    // The root element is expected to exist based on public/overlay/lifeos-dashboard.html
    if (!rootEl) {
      console.error('LifeOS AI Rail: Root element #' + containerId + ' not found.');
      return;
    }

    rootEl.innerHTML = `
      <div class="lifeos-ai-rail-container">
        <div class="lifeos-ai-rail">
          <div class="lifeos-ai-rail-header">
            <div class="lifeos-ai-rail-header-content">
              <span class="lifeos-ai-rail-icon">✦</span>
              <span class="lifeos-ai-rail-prompt">How can I help?</span>
            </div>
            <div class="lifeos-ai-rail-header-actions">
              <button class="lifeos-ai-rail-action-btn" id="lifeos-ai-rail-dock-btn" title="Dock to top">⬆</button>
              <button class="lifeos-ai-rail-action-btn" id="lifeos-ai-rail-toggle-btn" title="Expand AI Rail">▲</button>
            </div>
          </div>
          <div class="lifeos-ai-rail-expanded-content">
            <div class="lifeos-ai-rail-transcript">
              <div class="lifeos-ai-rail-msg assistant">Hello! I'm Lumin, your personal AI. How can I assist you today?</div>
            </div>
            <div class="lifeos-ai-rail-input-area">
              <textarea class="lifeos-ai-rail-input" placeholder="Ask Lumin anything..."></textarea>
              <button class="lifeos-ai-rail-action-btn" id="lifeos-ai-rail-open-chat-btn" title="Open full chat">💬</button>
            </div>
          </div>
        </div>
      </div>
    `;

    railEl = rootEl.querySelector('.lifeos-ai-rail');
    headerEl = rootEl.querySelector('.lifeos-ai-rail-header');
    toggleBtn = document.getElementById('lifeos-ai-rail-toggle-btn');
    dockBtn = document.getElementById('lifeos-ai-rail-dock-btn');
    openChatBtn = document.getElementById('lifeos-ai-rail-open-chat-btn');

    // Event listeners
    if (headerEl) headerEl.addEventListener('click', toggleExpanded);
    if (toggleBtn) toggleBtn.addEventListener('click', toggleExpanded);
    if (dockBtn) dockBtn.addEventListener('click', toggleDockPosition);
    if (openChatBtn) openChatBtn.addEventListener('click', openFullChat);

    loadState();
    applyReducedMotion();
    observeThemeChanges();
  }

  // Expose mount function globally
  window.LifeOSDashboardAiRail = { mount: mount };

  // Initial mount on DOMContentLoaded if not explicitly called
  document.addEventListener('DOMContentLoaded', function() {
    // Check if the mount function has already been called (e.g., manually in the HTML)
    if (!window.LifeOSDashboardAiRail.isMounted) {
      window.LifeOSDashboardAiRail.mount();
      window.LifeOSDashboardAiRail.isMounted = true; // Mark as mounted
    }
  });

})();