(function(){
  const HISTORY_KEY = 'lifeos-lumin-quick-history';
  const API_ENDPOINT = '/api/v1/lifeos/chat';
  const MAX_HISTORY_ITEMS = 3;

  let currentUser = 'anonymous';
  let currentCommandKey = null;

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

  function renderHistory(container, history) {
    const historyContainer = container.querySelector('.lifeos-lumin-quick-history');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';
    history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'lifeos-lumin-quick-response';
      div.innerHTML = `<strong>You:</strong> ${escapeHTML(item.message)}<br><strong>Lumin:</strong> ${escapeHTML(item.response)}`;
      historyContainer.appendChild(div);
    });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  async function sendMessage(container, message) {
    const input = container.querySelector('.lifeos-lumin-quick-input');
    const sendButton = container.querySelector('.lifeos-lumin-quick-send-btn');
    const statusArea = container.querySelector('.lifeos-lumin-quick-status');

    if (!message.trim()) return;

    input.value = ''; // Clear input immediately
    statusArea.textContent = '...'; // Show loading state
    statusArea.style.color = ''; // Reset color
    sendButton.disabled = true; // Disable button during fetch

    try {
      const body = { message, user: currentUser };
      if (currentCommandKey) {
        body.commandKey = currentCommandKey;
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
      }

      const data = await response.json();
      const luminResponse = data.reply || data.message || data.response || 'No response from Lumin.';

      let history = getHistory();
      history.push({ message, response: luminResponse });
      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(history.length - MAX_HISTORY_ITEMS);
      }
      saveHistory(history);
      renderHistory(container, history);
      statusArea.textContent = ''; // Clear loading state
    } catch (error) {
      console.error('Error sending message to Lumin:', error);
      statusArea.textContent = `Error: ${error.message}`;
      statusArea.style.color = 'red';
    } finally {
      sendButton.disabled = false; // Re-enable button
    }
  }

  function mount({ container, user, commandKey }) {
    if (!container) {
      console.error('Lumin Quick Widget: Container element not provided.');
      return;
    }

    currentUser = user || 'anonymous';
    currentCommandKey = commandKey || null;

    const hasAiRailExpand = window.LifeOSDashboardAiRail && typeof window.LifeOSDashboardAiRail.expand === 'function';

    container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border: 1px solid var(--dash-border, #ccc);
        border-radius: var(--dash-radius-lg, 8px);
        background-color: var(--dash-surface, #fff);
        color: var(--dash-text, #333);
        font-family: sans-serif;
        font-size: 14px;
      ">
        <div class="lifeos-lumin-quick-history" style="
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 150px;
          overflow-y: auto;
          padding-right: 4px;
        "></div>
        <div style="display: flex; gap: 8px;">
          <input
            type="text"
            class="lifeos-lumin-quick-input"
            placeholder="Ask Lumin anything..."
            style="
              flex-grow: 1;
              padding: 8px;
              border: 1px solid var(--dash-border, #ddd);
              border-radius: 4px;
              background-color: var(--dash-bg, #f9f9f9);
              color: var(--dash-text, #333);
            "
          />
          <button
            class="lifeos-lumin-quick-send-btn"
            style="
              padding: 8px 12px;
              border: none;
              border-radius: 4px;
              background-color: var(--dash-accent, #5b6af5);
              color: white;
              cursor: pointer;
              font-weight: bold;
            "
          >Send</button>
        </div>
        <div class="lifeos-lumin-quick-status" style="min-height: 1em; font-size: 0.9em;"></div>
        ${hasAiRailExpand ? `
          <a href="#" class="lifeos-lumin-quick-open-full-chat" style="
            color: var(--dash-accent, #5b6af5);
            text-decoration: none;
            font-size: 0.9em;
            text-align: right;
          ">Open full chat</a>
        ` : ''}
      </div>
    `;

    const inputEl = container.querySelector('.lifeos-lumin-quick-input');
    const sendBtn = container.querySelector('.lifeos-lumin-quick-send-btn');
    const openFullChatLink = container.querySelector('.lifeos-lumin-quick-open-full-chat');

    sendBtn.addEventListener('click', () => sendMessage(container, inputEl.value));
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(container, inputEl.value);
      }
    });

    if (openFullChatLink) {
      openFullChatLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.LifeOSDashboardAiRail.expand();
      });
    }

    renderHistory(container, getHistory());
  }

  window.LifeOSWidgetLuminQuick = { mount };
})();