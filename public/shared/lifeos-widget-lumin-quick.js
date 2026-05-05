(function(){
  const HISTORY_KEY = 'lifeos-lumin-quick-history';
  const MAX_HISTORY = 3;
  const API_ENDPOINT = '/api/v1/lifeos/chat';

  let currentUser = 'anonymous'; // Default, will be overridden by mount
  let currentCommandKey = null; // Default, will be overridden by mount

  function getHistory() {
    try {
      const history = sessionStorage.getItem(HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (e) {
      console.error('Error parsing Lumin quick history from sessionStorage:', e);
      return [];
    }
  }

  function saveHistory(history) {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving Lumin quick history to sessionStorage:', e);
    }
  }

  function renderHistory(containerEl) {
    const historyContainer = containerEl.querySelector('.lumin-quick-history');
    if (!historyContainer) return;

    historyContainer.innerHTML = ''; // Clear existing history
    const history = getHistory();

    history.forEach(item => {
      const p = document.createElement('p');
      p.textContent = item;
      p.style.cssText = 'margin: 4px 0; padding: 4px 8px; background-color: #f0f0f0; border-radius: 4px; font-size: 0.9em; word-wrap: break-word;'; // Basic styling
      historyContainer.appendChild(p);
    });
    historyContainer.scrollTop = historyContainer.scrollHeight; // Scroll to bottom
  }

  function showLoading(containerEl) {
    const loadingEl = containerEl.querySelector('.lumin-quick-loading');
    if (loadingEl) {
      loadingEl.style.display = 'inline';
    }
    const errorEl = containerEl.querySelector('.lumin-quick-error');
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
  }

  function hideLoading(containerEl) {
    const loadingEl = containerEl.querySelector('.lumin-quick-loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }

  function showError(containerEl, message) {
    const errorEl = containerEl.querySelector('.lumin-quick-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  async function sendMessage(containerEl, inputEl) {
    const message = inputEl.value.trim();
    if (!message) return;

    inputEl.value = ''; // Clear input immediately
    showLoading(containerEl);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          user: currentUser,
          commandKey: currentCommandKey
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || data.message || data.response;

      if (reply) {
        let history = getHistory();
        history.push(reply);
        if (history.length > MAX_HISTORY) {
          history = history.slice(history.length - MAX_HISTORY);
        }
        saveHistory(history);
        renderHistory(containerEl);
      } else {
        showError(containerEl, 'No reply received from Lumin.');
      }

    } catch (error) {
      console.error('Lumin quick chat error:', error);
      showError(containerEl, `Error: ${error.message || 'Failed to send message.'}`);
    } finally {
      hideLoading(containerEl);
    }
  }

  function mount(options) {
    const { container, user, commandKey } = options;
    let containerEl;

    if (typeof container === 'string') {
      containerEl = document.getElementById(container);
    } else if (container instanceof HTMLElement) {
      containerEl = container;
    }

    if (!containerEl) {
      console.error(`Lumin Quick Widget: Container element '${container}' not found.`);
      return;
    }

    currentUser = user || 'anonymous';
    currentCommandKey = commandKey || null;

    // Inject styles and HTML
    containerEl.innerHTML = `
      <style>
        .lumin-quick-widget {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
          font-size: 14px;
          color: #333;
          background-color: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          max-width: 300px;
          margin: 10px;
          display: flex;
          flex-direction: column;
        }
        .lumin-quick-history {
          min-height: 60px;
          max-height: 150px;
          overflow-y: auto;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        .lumin-quick-history p {
          margin: 4px 0;
          padding: 4px 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          font-size: 0.9em;
          word-wrap: break-word;
        }
        .lumin-quick-input-area {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        .lumin-quick-input {
          flex-grow: 1;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1em;
          box-sizing: border-box; /* Include padding and border in the element's total width and height */
        }
        .lumin-quick-send-btn {
          padding: 8px 12px;
          background-color: #5b6af5; /* Using accent color from tokens.css */
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1em;
          flex-shrink: 0;
        }
        .lumin-quick-send-btn:hover {
          background-color: #4a59d0;
        }
        .lumin-quick-status {
          min-height: 1.2em;
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        .lumin-quick-error {
          color: red;
          font-size: 0.9em;
        }
        .lumin-quick-footer {
          text-align: right;
          font-size: 0.8em;
          flex-shrink: 0;
        }
        .lumin-quick-footer a {
          color: #5b6af5;
          text-decoration: none;
        }
        .lumin-quick-footer a:hover {
          text-decoration: underline;
        }
      </style>
      <div class="lumin-quick-widget">
        <div class="lumin-quick-history"></div>
        <div class="lumin-quick-input-area">
          <input type="text" class="lumin-quick-input" placeholder="Ask Lumin anything...">
          <button class="lumin-quick-send-btn">Send</button>
        </div>
        <div class="lumin-quick-status">
          <span class="lumin-quick-loading" style="display: none;">...</span>
          <span class="lumin-quick-error" style="display: none;"></span>
        </div>
        <div class="lumin-quick-footer"></div>
      </div>
    `;

    // Apply basic dark mode styles if data-theme="dark" is set on root
    if (document.documentElement.dataset.theme === 'dark') {
      const styleEl = containerEl.querySelector('style');
      if (styleEl) {
        styleEl.textContent += `
          .lumin-quick-widget {
            background-color: #111118; /* dash-surface */
            color: #e8e8f0; /* dash-text */
            border-color: rgba(255,255,255,0.07); /* dash-border */
          }
          .lumin-quick-history {
            border-bottom-color: rgba(255,255,255,0.1);
          }
          .lumin-quick-history p {
            background-color: #22222a;
          }
          .lumin-quick-input {
            background-color: #0a0a0f; /* dash-bg */
            color: #e8e8f0;
            border-color: #555566; /* dash-muted */
          }
          .lumin-quick-send-btn {
            background-color: #5b6af5; /* dash-accent */
          }
          .lumin-quick-send-btn:hover {
            background-color: #4a59d0;
          }
          .lumin-quick-error {
            color: #ff6b6b; /* A suitable red for dark mode */
          }
          .lumin-quick-footer a {
            color: #5b6af5;
          }
        `;
      }
    }


    const inputEl = containerEl.querySelector('.lumin-quick-input');
    const sendBtn = containerEl.querySelector('.lumin-quick-send-btn');
    // const footerEl = containerEl.querySelector('.lumin-quick-footer'); // Not used due to contradiction

    sendBtn.addEventListener('click', () => sendMessage(containerEl, inputEl));
    inputEl.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage(containerEl, inputEl);
      }
    });

    renderHistory(containerEl);

    // The "Open full chat" link feature is omitted due to the contradiction stated above.
  }

  window.LifeOSWidgetLuminQuick = { mount };
})();