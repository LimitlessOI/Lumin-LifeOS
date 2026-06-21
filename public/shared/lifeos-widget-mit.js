/**
 * SYNOPSIS: js — public/shared/lifeos-widget-mit.js.
 */
(function(){
  let _container = null;
  let _user = null;
  let _commandKey = null;

  const API_BASE = '/api/v1/lifeos/commitments';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function createElement(tag, classes = [], attributes = {}, textContent = '') {
    const el = document.createElement(tag);
    if (classes.length) {
      el.className = classes.join(' ');
    }
    for (const key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
    if (textContent) {
      el.textContent = textContent;
    }
    return el;
  }

  function clearContainer() {
    if (_container) {
      _container.innerHTML = '';
    }
  }

  function renderLoading() {
    clearContainer();
    const widget = createElement('div', ['lifeos-mit-widget'], {
      style: `
        background-color: var(--dash-surface, #111118);
        color: var(--dash-text, #e8e8f0);
        border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
        padding: 16px;
        border-radius: var(--dash-radius-lg, 14px);
        font-family: sans-serif;
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-sizing: border-box;
      `
    });
    widget.appendChild(createElement('h3', [], {
      style: `
        margin: 0 0 10px 0;
        font-size: 1.2em;
        color: var(--dash-text, #e8e8f0);
      `
    }, 'Today\'s MITs'));

    const loadingList = createElement('ul', [], {
      style: `
        list-style: none;
        padding: 0;
        margin: 0;
      `
    });

    for (let i = 0; i < 3; i++) {
      const listItem = createElement('li', [], {
        style: `
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          border-bottom: 1px solid var(--dash-border, rgba(255,255,255,0.07));
        `
      });
      const checkbox = createElement('div', ['skeleton-checkbox'], {
        style: `
          width: 18px;
          height: 18px;
          border: 1px solid var(--dash-muted, #555566);
          border-radius: 4px;
          background-color: var(--dash-muted, #555566);
          ${prefersReducedMotion ? '' : 'animation: pulse 1.5s infinite ease-in-out;'}
        `
      });
      const textLine = createElement('div', ['skeleton-text'], {
        style: `
          flex-grow: 1;
          height: 1em;
          background-color: var(--dash-muted, #555566);
          border-radius: 4px;
          width: ${70 + Math.random() * 20}%; /* Random width for visual variety */
          ${prefersReducedMotion ? '' : 'animation: pulse 1.5s infinite ease-in-out;'}
        `
      });
      listItem.appendChild(checkbox);
      listItem.appendChild(textLine);
      loadingList.appendChild(listItem);
    }
    widget.appendChild(loadingList);

    if (!prefersReducedMotion) {
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `;
      document.head.appendChild(styleEl);
    }

    _container.appendChild(widget);
  }

  function renderEmpty() {
    clearContainer();
    const widget = createElement('div', ['lifeos-mit-widget'], {
      style: `
        background-color: var(--dash-surface, #111118);
        color: var(--dash-text, #e8e8f0);
        border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
        padding: 16px;
        border-radius: var(--dash-radius-lg, 14px);
        font-family: sans-serif;
        text-align: center;
        box-sizing: border-box;
      `
    });
    widget.appendChild(createElement('h3', [], {
      style: `
        margin: 0 0 10px 0;
        font-size: 1.2em;
        color: var(--dash-text, #e8e8f0);
      `
    }, 'Today\'s MITs'));
    widget.appendChild(createElement('p', [], {
      style: `
        color: var(--dash-muted, #555566);
        margin-top: 15px;
      `
    }, 'No MITs set — add one in Commitments'));
    _container.appendChild(widget);
  }

  function renderError(retryCallback) {
    clearContainer();
    const widget = createElement('div', ['lifeos-mit-widget'], {
      style: `
        background-color: var(--dash-surface, #111118);
        color: var(--dash-text, #e8e8f0);
        border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
        padding: 16px;
        border-radius: var(--dash-radius-lg, 14px);
        font-family: sans-serif;
        text-align: center;
        box-sizing: border-box;
      `
    });
    widget.appendChild(createElement('h3', [], {
      style: `
        margin: 0 0 10px 0;
        font-size: 1.2em;
        color: var(--dash-text, #e8e8f0);
      `
    }, 'Today\'s MITs'));
    widget.appendChild(createElement('p', [], {
      style: `
        color: var(--dash-muted, #555566);
        margin-top: 15px;
      `
    }, 'Could not load tasks'));
    const retryButton = createElement('button', [], {
      style: `
        background-color: var(--dash-accent, #5b6af5);
        color: var(--dash-text, #e8e8f0);
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        margin-top: 10px;
        font-size: 0.9em;
      `
    }, 'Retry');
    retryButton.addEventListener('click', retryCallback);
    widget.appendChild(retryButton);
    _container.appendChild(widget);
  }

  async function fetchMITs(user, commandKey) {
    if (!user || !commandKey) {
      throw new Error('User handle or command key is missing.');
    }
    const url = `${API_BASE}?user=${encodeURIComponent(user)}&status=active&limit=5`;
    const headers = {
      'Authorization': `Bearer ${commandKey}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async function completeMIT(id, commandKey) {
    if (!id || !commandKey) {
      throw new Error('Task ID or command key is missing.');
    }
    const url = `${API_BASE}/${encodeURIComponent(id)}/complete`;
    const headers = {
      'Authorization': `Bearer ${commandKey}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: headers
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  function renderMITs(tasks) {
    clearContainer();
    const widget = createElement('div', ['lifeos-mit-widget'], {
      style: `
        background-color: var(--dash-surface, #111118);
        color: var(--dash-text, #e8e8f0);
        border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
        padding: 16px;
        border-radius: var(--dash-radius-lg, 14px);
        font-family: sans-serif;
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-sizing: border-box;
      `
    });

    const header = createElement('div', [], {
      style: `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      `
    });
    header.appendChild(createElement('h3', [], {
      style: `
        margin: 0;
        font-size: 1.2em;
        color: var(--dash-text, #e8e8f0);
      `
    }, 'Today\'s MITs'));

    const completedCount = tasks.filter(task => task.completed).length;
    const totalCount = tasks.length;
    const badge = createElement('span', ['mit-count-badge'], {
      style: `
        background-color: var(--dash-accent, #5b6af5);
        color: var(--dash-text, #e8e8f0);
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: bold;
      `
    }, `${completedCount}/${totalCount}`);
    header.appendChild(badge);
    widget.appendChild(header);

    const taskList = createElement('ul', [], {
      style: `
        list-style: none;
        padding: 0;
        margin: 0;
      `
    });

    tasks.forEach(task => {
      const listItem = createElement('li', [], {
        style: `
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          border-bottom: 1px solid var(--dash-border, rgba(255,255,255,0.07));
          ${task.completed ? 'opacity: 0.7; text-decoration: line-through;' : ''}
        `
      });
      const checkbox = createElement('input', [], {
        type: 'checkbox',
        id: `mit-${task.id}`,
        style: `
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--dash-accent, #5b6af5);
        `
      });
      checkbox.checked = task.completed;
      checkbox.disabled = task.completed;

      const label = createElement('label', [], {
        for: `mit-${task.id}`,
        style: `
          flex-grow: 1;
          cursor: ${task.completed ? 'default' : 'pointer'};
          color: var(--dash-text, #e8e8f0);
        `
      }, task.title);

      checkbox.addEventListener('change', async (e) => {
        if (e.target.checked) {
          e.target.disabled = true;
          label.style.opacity = '0.7';
          label.style.textDecoration = 'line-through';
          try {
            await completeMIT(task.id, _commandKey);
            LifeOSWidgetMIT.refresh();
          } catch (error) {
            console.error('Failed to complete MIT:', error);
            e.target.checked = false;
            e.target.disabled = false;
            label.style.opacity = '1';
            label.style.textDecoration = 'none';
            renderError(LifeOSWidgetMIT.refresh);
          }
        }
      });

      listItem.appendChild(checkbox);
      listItem.appendChild(label);
      taskList.appendChild(listItem);
    });
    widget.appendChild(taskList);
    _container.appendChild(widget);
  }

  const LifeOSWidgetMIT = {
    mount: async function({ container, user, commandKey }) {
      if (!container || !(container instanceof HTMLElement)) {
        console.error('LifeOSWidgetMIT: Invalid container element provided.');
        return;
      }
      _container = container;
      _user = user;
      _commandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

      if (!_user || !_commandKey) {
        console.error('LifeOSWidgetMIT: User handle or commandKey is missing. Cannot mount widget.');
        renderError(LifeOSWidgetMIT.refresh);
        return;
      }

      await this.refresh();
    },

    refresh: async function() {
      if (!_container || !_user || !_commandKey) {
        console.warn('LifeOSWidgetMIT: Widget not mounted or essential data missing. Cannot refresh.');
        return;
      }

      renderLoading();
      try {
        const tasks = await fetchMITs(_user, _commandKey);
        if (tasks && tasks.length > 0) {
          renderMITs(tasks);
        } else {
          renderEmpty();
        }
      } catch (error) {
        console.error('LifeOSWidgetMIT: Failed to fetch MITs:', error);
        renderError(LifeOSWidgetMIT.refresh);
      }
    }
  };

  window.LifeOSWidgetMIT = LifeOSWidgetMIT;
})();