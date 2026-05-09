(function(){
  const SESSION_STORAGE_KEY = 'lifeos-lumin-quick-history';
  const API_ENDPOINT = '/api/v1/lifeos/chat';
  const DEFAULT_CONTAINER_ID = 'lifeos-widget-lumin-quick';

  let _container = null;
  let _user = 'anonymous';
  let _commandKey = null;
  let _history = []; // Stores up to 3 user messages and 3 assistant responses (6 total)
  let _isLoading = false;
  let _error = null;

  function getHistory() {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('LifeOSWidgetLuminQuick: Error parsing history from sessionStorage:', e);
      return [];
    }
  }

  function saveHistory(history) {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('LifeOSWidgetLuminQuick: Error saving history to sessionStorage:', e);
    }
  }

  function render() {
    if (!_container) return;

    _container.innerHTML = ''; // Clear existing content

    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'lifeos-lumin-quick-widget';
    widgetWrapper.style.fontFamily = 'sans-serif';
    widgetWrapper.style.fontSize = '14px';
    widgetWrapper.style.color = 'var(--dash-text, #e8e8f0)';
    widgetWrapper.style.backgroundColor = 'var(--dash-surface, #111118)';
    widgetWrapper.style.padding = '10px';
    widgetWrapper.style.borderRadius = 'var(--dash-radius-lg, 14px)';
    widgetWrapper.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    widgetWrapper.style.maxWidth = '300px';
    widgetWrapper.style.display = 'flex';
    widgetWrapper.style.flexDirection = 'column';
    widgetWrapper.style.gap = '8px';

    // History display
    const historyEl = document.createElement('div');
    historyEl.className = 'lifeos-lumin-quick-history';
    historyEl.style.display = 'flex';
    historyEl.style.flexDirection = 'column';
    historyEl.style.gap = '4px';
    historyEl.style.maxHeight = '150px'; // Limit height for quick view
    historyEl.style.overflowY = 'auto';
    historyEl.style.paddingRight = '5px'; // For scrollbar
    _history.forEach(item => {
      const msgEl = document.createElement('div');
      msgEl.className = `lifeos-lumin-quick-message ${item.role}`;
      msgEl.style.padding = '6px 8px';
      msgEl.style.borderRadius = '8px';
      msgEl.style.wordBreak = 'break-word';
      if (item.role === 'user') {
        msgEl.style.backgroundColor = 'rgba(91, 106, 245, 0.2)'; // dash-accent with transparency
        msgEl.style.alignSelf = 'flex-end';
      } else {
        msgEl.style.backgroundColor = 'rgba(255,255,255,0.05)';
        msgEl.style.alignSelf = 'flex-start';
      }
      msgEl.textContent = item.text;
      historyEl.appendChild(msgEl);
    });
    widgetWrapper.appendChild(historyEl);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.style.display = 'flex';
    inputArea.style.gap = '5px';

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'Ask Lumin anything...';
    inputEl.className = 'lifeos-lumin-quick-input';
    inputEl.style.flexGrow = '1';
    inputEl.style.padding = '8px';
    inputEl.style.border = '1px solid var(--dash-border, rgba(255,255,255,0.07))';
    inputEl.style.borderRadius = '8px';
    inputEl.style.backgroundColor = 'var(--dash-bg, #0a0a0f)';
    inputEl.style.color = 'var(--dash-text, #e8e8f0)';
    inputEl.style.outline = 'none';

    const sendBtn = document.createElement('button');
    sendBtn.className = 'lifeos-lumin-quick-send-btn';
    sendBtn.textContent = 'Send';
    sendBtn.style.padding = '8px 12px';
    sendBtn.style.border = 'none';
    sendBtn.style.borderRadius = '8px';
    sendBtn.style.backgroundColor = 'var(--dash-accent, #5b6af5)';
    sendBtn.style.color = 'white';
    sendBtn.style.cursor = 'pointer';
    sendBtn.style.fontWeight = 'bold';
    sendBtn.style.transition = 'background-color 0.2s ease';
    sendBtn.onmouseover = () => sendBtn.style.backgroundColor = '#4a5be0';
    sendBtn.onmouseout = () => sendBtn.style.backgroundColor = 'var(--dash-accent, #5b6af5)';
    sendBtn.disabled = _isLoading;

    inputArea.appendChild(inputEl);
    inputArea.appendChild(sendBtn);
    widgetWrapper.appendChild(inputArea);

    // Loading/Error state
    const statusEl = document.createElement('div');
    statusEl.className = 'lifeos-lumin-quick-status';
    statusEl.style.minHeight = '18px'; // Reserve space
    if (_isLoading) {
      statusEl.textContent = '...';
      statusEl.style.color = 'var(--dash-muted, #555566)';
    } else if (_error) {
      statusEl.textContent = _error;
      statusEl.style.color = 'red';
    }
    widgetWrapper.appendChild(statusEl);

    // "Open full chat" link
    if (window.LifeOSDashboardAiRail && typeof window.LifeOSDashboardAiRail.expand === 'function') {
      const fullChatLink = document.createElement('a');
      fullChatLink.href = '#';
      fullChatLink.textContent = 'Open full chat';
      fullChatLink.style.display = 'block';
      fullChatLink.style.marginTop = '8px';
      fullChatLink.style.textAlign = 'center';
      fullChatLink.style.color = 'var(--dash-accent, #5b6af5)';
      fullChatLink.style.textDecoration = 'none';
      fullChatLink.onclick = (e) => {
        e.preventDefault();
        window.LifeOSDashboardAiRail.expand();
      };
      widgetWrapper.appendChild(fullChatLink);
    }

    _container.appendChild(widgetWrapper);

    // Event listeners for the newly rendered elements
    sendBtn.addEventListener('click', () => sendMessage(inputEl.value, inputEl));
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputEl.value, inputEl);
      }
    });
    if (!_isLoading) {
      inputEl.focus();
    }
    // Scroll history to bottom
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  async function sendMessage(message, inputEl) {
    if (!message.trim() || _isLoading) return;

    _isLoading = true;
    _error = null;
    render(); // Show loading state

    const userMessage = { role: 'user', text: message };
    _history.push(userMessage);
    // Cap history at 3 user + 3 assistant messages = 6 total
    if (_history.length > 6) {
        _history = _history.slice(_history.length - 6);
    }
    saveHistory(_history);
    inputEl.value = ''; // Clear input immediately

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          user: _user,
          commandKey: _commandKey
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const replyText = data.reply || data.message || data.response || 'No response received.';
      _history.push({ role: 'assistant', text: replyText });
      // Cap history again after assistant response
      if (_history.length > 6) {
          _history = _history.slice(_history.length - 6);
      }
      saveHistory(_history);

    } catch (e) {
      console.error('LifeOSWidgetLuminQuick: Chat error:', e);
      _error = `Error: ${e.message}`;
      // If the last message was a user message and no assistant reply, remove it
      if (_history.length > 0 && _history[_history.length - 1].role === 'user') {
        _history.pop();
        saveHistory(_history);
      }
    } finally {
      _isLoading = false;
      render(); // Update with new history or error
    }
  }

  /**
   * Mounts the Lumin quick-entry widget into the DOM.
   * @param {object} options - Configuration options.
   * @param {HTMLElement|string} [options.container] - The DOM element or its ID to mount into. Defaults to 'lifeos-widget-lumin-quick'.
   * @param {string} options.user - The user identifier for chat messages.
   * @param {string} [options.commandKey] - Optional command key for the chat API.
   */
  function mount(options = {}) {
    const { container, user, commandKey } = options;

    if (typeof container === 'string') {
      _container = document.getElementById(container);
    } else if (container instanceof HTMLElement) {
      _container = container;
    } else {
      _container = document.getElementById(DEFAULT_CONTAINER_ID); // Fallback to default ID
    }

    if (!_container) {
      console.error(`LifeOSWidgetLuminQuick: Container element '${container || DEFAULT_CONTAINER_ID}' not found.`);
      return;
    }

    _user = user || _user;
    _commandKey = commandKey || _commandKey;

    _history = getHistory();
    render();
  }

  window.LifeOSWidgetLuminQuick = {
    mount: mount
  };
})();