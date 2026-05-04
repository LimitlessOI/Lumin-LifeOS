(function() {
    const STORAGE_KEY_HISTORY = 'lifeos-lumin-quick-history';
    const API_ENDPOINT = '/api/v1/lifeos/chat';
    const MAX_HISTORY_INTERACTIONS = 3; // Keep last 3 user messages and 3 AI responses

    let currentUser = 'anonymous';
    let currentCommandKey = '';

    /**
     * Renders the Lumin quick-entry widget UI into the specified container.
     * @param {object} options
     * @param {HTMLElement} [options.container] - The DOM element to mount the widget into. Defaults to #lifeos-widget-lumin-quick.
     * @param {string} options.user - The current user identifier.
     * @param {string} options.commandKey - The command key for the chat API.
     */
    function mount({ container, user, commandKey }) {
        currentUser = user || 'anonymous';
        currentCommandKey = commandKey || '';

        let widgetContainer = container;
        if (!widgetContainer) {
            widgetContainer = document.getElementById('lifeos-widget-lumin-quick');
            if (!widgetContainer) {
                widgetContainer = document.createElement('div');
                widgetContainer.id = 'lifeos-widget-lumin-quick';
                document.body.appendChild(widgetContainer);
            }
        }

        widgetContainer.innerHTML = `
            <style>
                #lifeos-widget-lumin-quick {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    font-size: 14px;
                    color: var(--dash-text, #e8e8f0); /* Use dashboard tokens if available, fallback */
                    background-color: var(--dash-surface, #111118);
                    border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
                    border-radius: var(--dash-radius-lg, 14px);
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    max-width: 320px; /* Reasonable max-width for a quick widget */
                    box-sizing: border-box;
                }
                #lifeos-widget-lumin-quick .history {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    max-height: 150px; /* Limit history height */
                    overflow-y: auto;
                    padding-right: 4px; /* For scrollbar */
                }
                #lifeos-widget-lumin-quick .history-item {
                    padding: 6px 10px;
                    border-radius: 10px;
                    word-wrap: break-word;
                    line-height: 1.4;
                }
                #lifeos-widget-lumin-quick .history-item.user {
                    background-color: var(--dash-accent, #5b6af5);
                    align-self: flex-end;
                    color: white;
                    margin-left: 20%; /* Max width for user bubble */
                }
                #lifeos-widget-lumin-quick .history-item.ai {
                    background-color: var(--dash-muted, #555566);
                    align-self: flex-start;
                    margin-right: 20%; /* Max width for AI bubble */
                }
                #lifeos-widget-lumin-quick .input-area {
                    display: flex;
                    gap: 8px;
                }
                #lifeos-widget-lumin-quick input[type="text"] {
                    flex-grow: 1;
                    padding: 8px;
                    border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
                    border-radius: 8px;
                    background-color: var(--dash-bg, #0a0a0f);
                    color: var(--dash-text, #e8e8f0);
                    outline: none;
                }
                #lifeos-widget-lumin-quick input[type="text"]::placeholder {
                    color: var(--dash-muted, #555566);
                }
                #lifeos-widget-lumin-quick button {
                    padding: 8px 12px;
                    border: none;
                    border-radius: 8px;
                    background-color: var(--dash-accent, #5b6af5);
                    color: white;
                    cursor: pointer;
                    font-weight: bold;
                    transition: background-color 0.2s ease;
                }
                #lifeos-widget-lumin-quick button:hover:not(:disabled) {
                    background-color: #4a5ae0; /* Slightly darker accent */
                }
                #lifeos-widget-lumin-quick button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                #lifeos-widget-lumin-quick .status-message {
                    text-align: center;
                    font-style: italic;
                    color: var(--dash-muted, #555566);
                    min-height: 1.2em; /* Reserve space */
                }
                #lifeos-widget-lumin-quick .error-message {
                    color: red;
                    font-weight: bold;
                }
                #lifeos-widget-lumin-quick .full-chat-link {
                    text-align: center;
                    margin-top: 4px;
                }
                #lifeos-widget-lumin-quick .full-chat-link a {
                    color: var(--dash-accent, #5b6af5);
                    text-decoration: none;
                    cursor: pointer;
                }
                #lifeos-widget-lumin-quick .full-chat-link a:hover {
                    text-decoration: underline;
                }
            </style>
            <div class="history"></div>
            <div class="input-area">
                <input type="text" placeholder="Ask Lumin anything..." aria-label="Ask Lumin">
                <button class="send-btn">Send</button>
            </div>
            <div class="status-message"></div>
            <div class="full-chat-link"></div>
        `;

        const historyEl = widgetContainer.querySelector('.history');
        const inputEl = widgetContainer.querySelector('input[type="text"]');
        const sendBtn = widgetContainer.querySelector('.send-btn');
        const statusMessageEl = widgetContainer.querySelector('.status-message');
        const fullChatLinkEl = widgetContainer.querySelector('.full-chat-link');

        let history = loadHistory();
        let isLoading = false;

        function saveHistory() {
            sessionStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        }

        function loadHistory() {
            try {
                const stored = sessionStorage.getItem(STORAGE_KEY_HISTORY);
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                console.error('Failed to load Lumin quick history:', e);
                return [];
            }
        }

        function renderHistory() {
            historyEl.innerHTML = '';
            history.forEach(item => {
                const msgEl = document.createElement('div');
                msgEl.classList.add('history-item', item.type);
                msgEl.textContent = item.message;
                historyEl.appendChild(msgEl);
            });
            historyEl.scrollTop = historyEl.scrollHeight; // Scroll to bottom
        }

        function showLoading(show) {
            isLoading = show;
            if (show) {
                statusMessageEl.textContent = '...';
                statusMessageEl.classList.remove('error-message');
                sendBtn.disabled = true;
                inputEl.disabled = true;
            } else {
                statusMessageEl.textContent = '';
                sendBtn.disabled = false;
                inputEl.disabled = false;
            }
        }

        function showError(message) {
            statusMessageEl.textContent = message;
            statusMessageEl.classList.add('error-message');
            showLoading(false); // Ensure loading is off
        }

        async function sendMessage() {
            const message = inputEl.value.trim();
            if (!message) return;

            inputEl.value = '';
            showError(''); // Clear previous errors

            history.push({ type: 'user', message });
            // Keep only the last MAX_HISTORY_INTERACTIONS (user + AI response)
            // This means 2 * MAX_HISTORY_INTERACTIONS total messages
            if (history.length > 2 * MAX_HISTORY_INTERACTIONS) {
                history = history.slice(history.length - (2 * MAX_HISTORY_INTERACTIONS));
            }
            renderHistory();
            saveHistory();

            showLoading(true);

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        user: currentUser,
                        commandKey: currentCommandKey,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                    throw new Error(`API error: ${response.status} - ${errorData.message || response.statusText}`);
                }

                const data = await response.json();
                const reply = data.reply || data.message || data.response;

                if (reply) {
                    history.push({ type: 'ai', message: reply });
                    if (history.length > 2 * MAX_HISTORY_INTERACTIONS) {
                        history = history.slice(history.length - (2 * MAX_HISTORY_INTERACTIONS));
                    }
                    renderHistory();
                    saveHistory();
                } else {
                    showError('No reply received from Lumin.');
                }
            } catch (e) {
                console.error('Lumin chat fetch failed:', e);
                showError(`Error: ${e.message || 'Failed to connect to Lumin.'}`);
            } finally {
                showLoading(false);
            }
        }

        sendBtn.addEventListener('click', sendMessage);
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default form submission behavior
                sendMessage();
            }
        });

        // Check for LifeOSDashboardAiRail and expand()
        if (window.LifeOSDashboardAiRail && typeof window.LifeOSDashboardAiRail.expand === 'function') {
            const openChatLink = document.createElement('a');
            openChatLink.href = '#';
            openChatLink.textContent = 'Open full chat';
            openChatLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.LifeOSDashboardAiRail.expand();
            });
            fullChatLinkEl.appendChild(openChatLink);
        }

        renderHistory(); // Initial render of history
    }

    // Expose the mount function globally
    if (typeof window !== 'undefined') {
        window.LifeOSWidgetLuminQuick = { mount };
    }
})();