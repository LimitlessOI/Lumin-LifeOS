(function() {
    const WIDGET_ID = 'lifeos-widget-lumin-quick';
    const STORAGE_KEY_HISTORY = 'lifeos-lumin-quick-history';
    const API_ENDPOINT = '/api/v1/lifeos/chat';
    const MAX_HISTORY_ITEMS = 3;

    let _containerEl = null;
    let _user = 'anonymous';
    let _commandKey = null;

    let _history = [];
    let _isLoading = false;
    let _error = null;

    // DOM elements
    let _inputEl = null;
    let _sendBtn = null;
    let _historyEl = null;
    let _loadingEl = null;
    let _errorEl = null;
    let _openFullChatLink = null;

    function getHistory() {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY_HISTORY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to read history from sessionStorage:', e);
            return [];
        }
    }

    function saveHistory(history) {
        try {
            sessionStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        } catch (e) {
            console.error('Failed to save history to sessionStorage:', e);
        }
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function render() {
        if (!_containerEl) return;

        _containerEl.innerHTML = ''; // Clear existing content

        const widgetWrapper = document.createElement('div');
        widgetWrapper.className = 'lifeos-lumin-quick-widget';
        widgetWrapper.style.fontFamily = 'sans-serif';
        widgetWrapper.style.fontSize = '14px';
        widgetWrapper.style.padding = '10px';
        widgetWrapper.style.border = '1px solid var(--dash-border, #eee)';
        widgetWrapper.style.borderRadius = '8px';
        widgetWrapper.style.maxWidth = '300px';
        widgetWrapper.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        widgetWrapper.style.backgroundColor = 'var(--dash-surface, #fff)';
        widgetWrapper.style.color = 'var(--dash-text, #333)';

        // History display
        _historyEl = document.createElement('div');
        _historyEl.className = 'lifeos-lumin-quick-history';
        _historyEl.style.marginBottom = '10px';
        _historyEl.style.maxHeight = '150px';
        _historyEl.style.overflowY = 'auto';
        _historyEl.style.borderBottom = '1px solid var(--dash-border, #eee)';
        _historyEl.style.paddingBottom = '10px';

        _history.slice().reverse().forEach(item => {
            const entry = document.createElement('div');
            entry.style.marginBottom = '5px';
            entry.innerHTML = `
                <div style="font-weight: bold; color: var(--dash-accent, #5b6af5);">You:</div>
                <div>${escapeHTML(item.message)}</div>
                <div style="font-weight: bold; margin-top: 5px;">Lumin:</div>
                <div>${escapeHTML(item.reply)}</div>
            `;
            _historyEl.appendChild(entry);
        });
        widgetWrapper.appendChild(_historyEl);

        // Input area
        const inputArea = document.createElement('div');
        inputArea.style.display = 'flex';
        inputArea.style.gap = '5px';

        _inputEl = document.createElement('input');
        _inputEl.type = 'text';
        _inputEl.placeholder = 'Ask Lumin anything...';
        _inputEl.style.flexGrow = '1';
        _inputEl.style.padding = '8px';
        _inputEl.style.border = '1px solid var(--dash-border, #ccc)';
        _inputEl.style.borderRadius = '4px';
        _inputEl.style.backgroundColor = 'var(--dash-bg, #f9f9f9)';
        _inputEl.style.color = 'var(--dash-text, #333)';
        _inputEl.disabled = _isLoading;
        _inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        inputArea.appendChild(_inputEl);

        _sendBtn = document.createElement('button');
        _sendBtn.textContent = 'Send';
        _sendBtn.style.padding = '8px 12px';
        _sendBtn.style.border = 'none';
        _sendBtn.style.borderRadius = '4px';
        _sendBtn.style.backgroundColor = 'var(--dash-accent, #5b6af5)';
        _sendBtn.style.color = '#fff';
        _sendBtn.style.cursor = 'pointer';
        _sendBtn.style.fontWeight = 'bold';
        _sendBtn.disabled = _isLoading;
        _sendBtn.addEventListener('click', sendMessage);
        inputArea.appendChild(_sendBtn);
        widgetWrapper.appendChild(inputArea);

        // Loading state
        _loadingEl = document.createElement('div');
        _loadingEl.className = 'lifeos-lumin-quick-loading';
        _loadingEl.style.marginTop = '10px';
        _loadingEl.style.color = 'var(--dash-muted, #666)';
        _loadingEl.style.display = _isLoading ? 'block' : 'none';
        _loadingEl.textContent = '...';
        widgetWrapper.appendChild(_loadingEl);

        // Error state
        _errorEl = document.createElement('div');
        _errorEl.className = 'lifeos-lumin-quick-error';
        _errorEl.style.marginTop = '10px';
        _errorEl.style.color = 'red';
        _errorEl.style.display = _error ? 'block' : 'none';
        _errorEl.textContent = _error || '';
        widgetWrapper.appendChild(_errorEl);

        // Open full chat link
        if (window.LifeOSDashboardAiRail && typeof window.LifeOSDashboardAiRail.expand === 'function') {
            _openFullChatLink = document.createElement('a');
            _openFullChatLink.href = '#';
            _openFullChatLink.textContent = 'Open full chat';
            _openFullChatLink.style.display = 'block';
            _openFullChatLink.style.marginTop = '10px';
            _openFullChatLink.style.textAlign = 'center';
            _openFullChatLink.style.color = 'var(--dash-accent, #5b6af5)';
            _openFullChatLink.style.textDecoration = 'underline';
            _openFullChatLink.style.cursor = 'pointer';
            _openFullChatLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.LifeOSDashboardAiRail.expand();
            });
            widgetWrapper.appendChild(_openFullChatLink);
        }

        _containerEl.appendChild(widgetWrapper);

        if (_historyEl) {
            _historyEl.scrollTop = _historyEl.scrollHeight;
        }
    }

    async function sendMessage() {
        const message = _inputEl.value.trim();
        if (!message || _isLoading) return;

        _isLoading = true;
        _error = null;
        render(); // Update UI to show loading state

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    user: _user,
                    commandKey: _commandKey,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const reply = data.reply || data.message || data.response;

            if (reply) {
                _history.push({ message, reply });
                if (_history.length > MAX_HISTORY_ITEMS) {
                    _history.shift();
                }
                saveHistory(_history);
            } else {
                throw new Error('No reply received from Lumin.');
            }

            _inputEl.value = '';
        } catch (e) {
            console.error('Lumin chat error:', e);
            _error = e.message || 'Failed to get a response from Lumin.';
        } finally {
            _isLoading = false;
            render(); // Re-render to update history, error, and loading states
        }
    }

    /**
     * Mounts the Lumin quick-entry widget into the specified container.
     * @param {object} options
     * @param {HTMLElement|string} [options.container] - The DOM element or ID string to mount into. Defaults to 'lifeos-widget-lumin-quick'.
     * @param {string} [options.user] - The user identifier for chat messages.
     * @param {string} [options.commandKey] - An optional command key for chat messages.
     */
    function mount({ container, user, commandKey } = {}) {
        if (typeof container === 'string') {
            _containerEl = document.getElementById(container);
        } else if (container instanceof HTMLElement) {
            _containerEl = container;
        } else {
            _containerEl = document.getElementById(WIDGET_ID);
        }

        if (!_containerEl) {
            console.error(`LifeOS Lumin Quick Widget: Container element with ID '${container || WIDGET_ID}' not found.`);
            return;
        }

        _user = user || _user;
        _commandKey = commandKey || _commandKey;
        _history = getHistory();

        render();
    }

    window.LifeOSWidgetLuminQuick = {
        mount
    };

})();