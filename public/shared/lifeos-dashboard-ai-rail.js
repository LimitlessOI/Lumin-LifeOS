// docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md
// This script provides the Lumin Persistent AI Rail UI and basic text interaction.
// It integrates with existing LifeOS chat APIs and voice output,
// and provides an entry point to the full chat experience.

(function() {
  // --- Utility Functions (replicated from lifeos-dashboard.html for consistency) ---
  // Fallback to 'adam' if user is not in localStorage, consistent with other scripts.
  const USER = localStorage.getItem('lifeos_user') || 'adam';
  const HDR = () => ({ 'x-lifeos-key': localStorage.getItem('lifeos_api_key') || '', 'Content-Type': 'application/json' });
  const API = (p, o={}) => fetch(p, { headers: HDR(), ...o });
  const $ = id => document.getElementById(id);

  // --- Constants and State ---
  const ROOT_ID = 'lifeos-ai-rail-root';
  const SESSION_STORAGE_KEY_STATE = 'lifeos-ai-rail:state'; // 'collapsed' or 'expanded'
  const SESSION_STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock';   // 'bottom' or 'top'
  const SESSION_STORAGE_KEY_THREAD = 'lifeos-ai-rail:threadId';

  let isExpanded = sessionStorage.getItem(SESSION_STORAGE_KEY_STATE) === 'expanded';
  let dockPosition = sessionStorage.getItem(SESSION_STORAGE_KEY_DOCK) || 'bottom'; // Default to bottom
  let currentThreadId = sessionStorage.getItem(SESSION_STORAGE_KEY_THREAD);
  let isTyping = false;
  let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- DOM Elements (will be populated after mount) ---
  let railContainer, collapsedView, expandedView,
      statusText, expandButton, collapseButton,
      fullChatButton, dockToggleButton,
      transcript, typingIndicator, inputArea, sendButton, micButton;

  // --- HTML Template for the AI Rail ---
  const railHTML = `
    <div class="lifeos-ai-rail-container lifeos-ai-rail-dock-${dockPosition}">
      <!-- Collapsed View -->
      <div class="lifeos-ai-rail-collapsed-view" style="display: ${isExpanded ? 'none' : 'flex'};">
        <div class="lifeos-ai-rail-header">
          <span class="lifeos-ai-rail-status-dot"></span>
          <span class="lifeos-ai-rail-status-text">Lumin is ready</span>
        </div>
        <button class="lifeos-ai-rail-expand-button" aria-label="Expand AI Rail">▲</button>
      </div>

      <!-- Expanded View -->
      <div class="lifeos-ai-rail-expanded-view" style="display: ${isExpanded ? 'flex' : 'none'};">
        <div class="lifeos-ai-rail-header">
          <div class="lifeos-ai-rail-title">Lumin AI</div>
          <button class="lifeos-ai-rail-full-chat-button" title="Open full chat" aria-label="Open full chat">↗</button>
          <button class="lifeos-ai-rail-dock-toggle-button" title="Toggle dock position" aria-label="Toggle dock position">↕</button>
          <button class="lifeos-ai-rail-collapse-button" aria-label="Collapse AI Rail">▼</button>
        </div>
        <div class="lifeos-ai-rail-transcript">
          <div class="lifeos-ai-rail-message assistant"><span class="content">Hey there! How can I help?</span></div>
        </div>
        <div class="lifeos-ai-rail-typing" style="display: none;">
          <div class="lifeos-ai-rail-typing-dot"></div>
          <div class="lifeos-ai-rail-typing-dot"></div>
          <div class="lifeos-ai-rail-typing-dot"></div>
        </div>
        <div class="lifeos-ai-rail-input-wrap">
          <textarea placeholder="Ask Lumin anything..." rows="1" aria-label="Chat input"></textarea>
          <button class="lifeos-ai-rail-mic-button" title="Voice input (not yet active)" aria-label="Voice input">🎙</button>
          <button class="lifeos-ai-rail-send-button" aria-label="Send message">↑</button>
        </div>
      </div>
    </div>
  `;

  // --- Core UI Logic ---
  function updateRailUI() {
    if (!railContainer) return;

    // Apply dock position
    railContainer.classList.remove('lifeos-ai-rail-dock-top', 'lifeos-ai-rail-dock-bottom');
    railContainer.classList.add(`lifeos-ai-rail-dock-${dockPosition}`);

    // Apply expanded/collapsed state
    if (isExpanded) {
      collapsedView.style.display = 'none';
      expandedView.style.display = 'flex';
      railContainer.classList.add('show'); // Ensure container is visible and animated
    } else {
      collapsedView.style.display = 'flex';
      expandedView.style.display = 'none';
      railContainer.classList.add('show'); // Ensure container is visible and animated
    }

    // Respect reduced motion
    if (prefersReducedMotion) {
      railContainer.style.transition = 'none';
    } else {
      railContainer.style.transition = ''; // Reset to CSS default
    }

    sessionStorage.setItem(SESSION_STORAGE_KEY_STATE, isExpanded ? 'expanded' : 'collapsed');
    sessionStorage.setItem(SESSION_STORAGE_KEY_DOCK, dockPosition);
    scrollToRailBottom();
  }

  function toggleExpanded() {
    isExpanded = !isExpanded;
    updateRailUI();
    if (isExpanded) {
      inputArea.focus();
      initRailChat(); // Load messages when expanded
    }
  }

  function toggleDockPosition() {
    dockPosition = dockPosition === 'bottom' ? 'top' : 'bottom';
    updateRailUI();
  }

  function openFullChat() {
    const url = currentThreadId ? `/overlay/lifeos-chat.html?threadId=${currentThreadId}` : '/overlay/lifeos-chat.html';
    window.open(url, '_blank');
  }

  // --- Chat Logic for Rail ---
  async function initRailChat() {
    if (currentThreadId) {
      try {
        const res = await API(`/api/v1/lifeos/chat/threads/${currentThreadId}/messages?user=${encodeURIComponent(USER)}&limit=10`);
        const data = await res.json();
        if (data.ok && data.messages.length) {
          transcript.innerHTML = ''; // Clear initial message
          data.messages.forEach(msg => appendRailMessage(msg.role, msg.content));
        }
      } catch (e) {
        console.error('Failed to load rail chat messages:', e);
        appendRailMessage('assistant', 'Failed to load chat history.', true);
      }
    } else {
      // Create a new thread if none exists for the rail
      try {
        const res = await API('/api/v1/lifeos/chat/threads', {
          method: 'POST',
          body: JSON.stringify({ user: USER, mode: 'general' }),
        });
        const data = await res.json();
        if (data.ok && data.thread?.id) {
          currentThreadId = data.thread.id;
          sessionStorage.setItem(SESSION_STORAGE_KEY_THREAD, currentThreadId);
          appendRailMessage('assistant', 'New conversation started.', true);
        } else {
          throw new Error(data.error || 'Failed to create thread');
        }
      } catch (e) {
        console.error('Failed to create rail chat thread:', e);
        appendRailMessage('assistant', 'Failed to start new conversation.', true);
      }
    }
    scrollToRailBottom();
  }

  async function sendRailMessage() {
    if (isTyping || !currentThreadId) return;
    const text = inputArea.value.trim();
    if (!text) return;

    inputArea.value = '';
    autoResize(inputArea);
    isTyping = true;
    sendButton.disabled = true;

    appendRailMessage('user', text);
    showRailTyping();

    try {
      const resp = await API(`/api/v1/lifeos/chat/threads/${currentThreadId}/messages/stream`, {
        method: 'POST',
        body: JSON.stringify({ user: USER, message: text }),
      });

      if (!resp.ok || !resp.body) throw new Error('Stream not available or failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessageEl = null;
      let replyContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(part.slice(6)); } catch { continue; }

          if (event.token) {
            if (!assistantMessageEl) {
              assistantMessageEl = appendRailMessage('assistant', '');
            }
            assistantMessageEl.querySelector('.content').textContent += event.token;
            replyContent += event.token;
            scrollToRailBottom();
          }
          if (event.done && event.reply?.content) {
            // Final message content might be slightly different or complete
            if (assistantMessageEl) {
              assistantMessageEl.querySelector('.content').textContent = event.reply.content;
            } else {
              appendRailMessage('assistant', event.reply.content);
            }
            replyContent = event.reply.content; // Ensure final content is captured
          }
          if (event.error) throw new Error(event.error);
        }
      }

      hideRailTyping();
      // Use window.LifeOSVoiceChat.speakText if available for read-aloud
      if (window.LifeOSVoiceChat && typeof window.LifeOSVoiceChat.speakText === 'function' && replyContent) {
        // For Phase 1, we assume if LifeOSVoiceChat is present, we can speak.
        // A dedicated speak toggle for the rail would be a Phase 2/3 feature.
        window.LifeOSVoiceChat.speakText(replyContent);
      }
    } catch (e) {
      console.error('Rail chat message failed:', e);
      hideRailTyping();
      appendRailMessage('assistant', `Error: ${e.message}`, true);
    } finally {
      isTyping = false;
      sendButton.disabled = false;
      inputArea.focus();
    }
  }

  function appendRailMessage(role, content, isError = false) {
    const msgEl = document.createElement('div');
    msgEl.className = `lifeos-ai-rail-message ${role}`;
    // Use a span for content to allow streaming updates to textContent
    msgEl.innerHTML = `<span class="content">${content}</span>`;
    if (isError) {
      msgEl.style.opacity = '0.7';
      msgEl.style.fontStyle = 'italic';
    }
    transcript.appendChild(msgEl);
    scrollToRailBottom();
    return msgEl; // Return the element for streaming updates
  }

  function showRailTyping() {
    typingIndicator.style.display = 'flex';
    scrollToRailBottom();
  }

  function hideRailTyping() {
    typingIndicator.style.display = 'none';
  }

  function scrollToRailBottom() {
    if (transcript) {
      transcript.scrollTop = transcript.scrollHeight;
    }
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'; // Max height from CSS
  }

  // --- Event Handlers ---
  function handleInputKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendRailMessage();
    }
  }

  function handleThemeChange(mutationsList) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        // CSS handles theme changes via variables, so no direct JS action needed here.
        // This listener fulfills the contract requirement to "listen for theme attribute changes".
        console.log('AI Rail: Theme changed to', document.documentElement.dataset.theme);
      }
    }
  }

  function mount() {
    let root = $(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }
    root.innerHTML = railHTML;

    // Get DOM references
    railContainer = root.querySelector('.lifeos-ai-rail-container');
    collapsedView = root.querySelector('.lifeos-ai-rail-collapsed-view');
    expandedView = root.querySelector('.lifeos-ai-rail-expanded-view');
    statusText = root.querySelector('.lifeos-ai-rail-status-text');
    expandButton = root.querySelector('.lifeos-ai-rail-expand-button');
    collapseButton = root.querySelector('.lifeos-ai-rail-collapse-button');
    fullChatButton = root.querySelector('.lifeos-ai-rail-full-chat-button');
    dockToggleButton = root.querySelector('.lifeos-ai-rail-dock-toggle-button');
    transcript = root.querySelector('.lifeos-ai-rail-transcript');
    typingIndicator = root.querySelector('.lifeos-ai-rail-typing');
    inputArea = root.querySelector('.lifeos-ai-rail-input-wrap textarea');
    sendButton = root.querySelector('.lifeos-ai-rail-send-button');
    micButton = root.querySelector('.lifeos-ai-rail-mic-button');

    // Attach event listeners
    collapsedView.addEventListener('click', toggleExpanded);
    expandButton.addEventListener('click', toggleExpanded);
    collapseButton.addEventListener('click', toggleExpanded);
    dockToggleButton.addEventListener('click', toggleDockPosition);
    fullChatButton.addEventListener('click', openFullChat);
    sendButton.addEventListener('click', sendRailMessage);
    inputArea.addEventListener('input', () => autoResize(inputArea));
    inputArea.addEventListener('keydown', handleInputKey);

    // Mic button stub for Phase 1: Focuses main dashboard chat input if present.
    micButton.addEventListener('click', () => {
      alert('Voice input for AI Rail is not yet active. Please use the main dashboard chat for voice interaction.');
      const mainChatInput = $('chat-input'); // ID of the main dashboard chat input
      if (mainChatInput) mainChatInput.focus();
    });

    // Observe theme changes on the html element
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Initial UI update
    updateRailUI();
    if (isExpanded) {
      initRailChat();
    }
  }

  // Expose mount function globally
  window.LifeOSDashboardAiRail = { mount };

  // Auto-mount if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.LifeOSDashboardAiRail.mount);
  } else {
    window.LifeOSDashboardAiRail.mount();
  }
})();