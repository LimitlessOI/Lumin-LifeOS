(function(){
  let _container = null;
  let _user = null;
  let _commandKey = null;
  let _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const API_BASE_URL = '/api/v1/lifeos/commitments';

  // Helper to create DOM elements
  function createElement(tag, classes = [], attributes = {}, textContent = '') {
    const el = document.createElement(tag);
    if (classes.length) el.className = classes.join(' ');
    for (const key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
    if (textContent) el.textContent = textContent;
    return el;
  }

  // Render loading state (skeleton rows)
  function renderLoadingState() {
    if (!_container) return;
    _container.innerHTML = `
      <div style="
        background: var(--dash-surface);
        border: 1px solid var(--dash-border);
        border-radius: var(--dash-radius-lg, 14px);
        padding: calc(var(--dash-space-unit, 8px) * 2);
        color: var(--dash-text);
        font-family: sans-serif;
        display: flex;
        flex-direction: column;
        gap: var(--dash-space-unit, 8px);
      ">
        <h3 style="
          color: var(--dash-accent);
          margin: 0 0 calc(var(--dash-space-unit, 8px) * 1.5) 0;
          font-size: 1.1em;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          Today's MITs
          <span style="
            background: var(--dash-muted);
            color: var(--dash-surface);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.8em;
            opacity: 0.7;
          ">0/0</span>
        </h3>
        <div style="
          display: flex;
          align-items: center;
          gap: var(--dash-space-unit, 8px);
          margin-bottom: var(--dash-space-unit, 8px);
        ">
          <div style="
            width: 20px;
            height: 20px;
            border: 1px solid var(--dash-muted);
            border-radius: 4px;
            flex-shrink: 0;
          "></div>
          <div style="
            flex-grow: 1;
            height: 1em;
            background: var(--dash-muted);
            border-radius: 4px;
            opacity: 0.6;
          "></div>
        </div>
        <div style="
          display: flex;
          align-items: center;
          gap: var(--dash-space-unit, 8px);
          margin-bottom: var(--dash-space-unit, 8px);
        ">
          <div style="
            width: 20px;
            height: 20px;
            border: 1px solid var(--dash-muted);
            border-radius: 4px;
            flex-shrink: 0;
          "></div>
          <div style="
            flex-grow: 1;
            height: 1em;
            background: var(--dash-muted);
            border-radius: 4px;
            opacity: 0.6;
          "></div>
        </div>
        <div style="
          display: flex;
          align-items: center;
          gap: var(--dash-space-unit, 8px);
        ">
          <div style="
            width: 20px;
            height: 20px;
            border: 1px solid var(--dash-muted);
            border-radius: 4px;
            flex-shrink: 0;
          "></div>
          <div style="
            flex-grow: 1;
            height: 1em;
            background: var(--dash-muted);
            border-radius: 4px;
            opacity: 0.6;
          "></div>
        </div>
      </div>
    `;
  }

  // Render error state
  function renderErrorState(message = 'Could not load tasks') {
    if (!_container) return;
    _container.innerHTML = `
      <div style="
        background: var(--dash-surface);
        border: 1px solid var(--dash-border);
        border-radius: var(--dash-radius-lg, 14px);
        padding: calc(var(--dash-space-unit, 8px) * 2);
        color: var(--dash-text);
        font-family: sans-serif;
        text-align: center;
      ">
        <h3 style="
          color: var(--dash-accent);
          margin: 0 0 calc(var(--dash-space-unit, 8px) * 1.5) 0;
          font-size: 1.1em;
        ">Today's MITs</h3>
        <p style="color: var(--dash-muted); margin-bottom: var(--dash-space-unit, 8px);">${message}</p>
        <button id="lifeos-mit-retry-button" style="
          background: var(--dash-accent);
          color: var(--dash-surface);
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9em;
          ${_prefersReducedMotion ? '' : 'transition: background 0.2s ease-in-out;'}
        ">Retry</button>
      </div>
    `;
    document.getElementById('lifeos-mit-retry-button')?.addEventListener('click', refresh);
  }

  // Render empty state
  function renderEmptyState() {
    if (!_container) return;
    _container.innerHTML = `
      <div style="
        background: var(--dash-surface);
        border: 1px solid var(--dash-border);
        border-radius: var(--dash-radius-lg, 14px);
        padding: calc(var(--dash-space-unit, 8px) * 2);
        color: var(--dash-text);
        font-family: sans-serif;
        text-align: center;
      ">
        <h3 style="
          color: var(--dash-accent);
          margin: 0 0 calc(var(--dash-space-unit, 8px) * 1.5) 0;
          font-size: 1.1em;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          Today's MITs
          <span style="
            background: var(--dash-muted);
            color: var(--dash-surface);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.8em;
            opacity: 0.7;
          ">0/0</span>
        </h3>
        <p style="color: var(--dash-muted);">No MITs set — add one in Commitments</p>
      </div>
    `;
  }

  async function handleTaskCompletion(taskId, checkbox) {
    if (!_commandKey) {
      console.error('Command key not available for task completion.');
      checkbox.checked = false; // Revert checkbox state
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${_commandKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Task completed successfully, refresh the list to remove it
      refresh();
    } catch (error) {
      console.error('Failed to complete task:', error);
      checkbox.checked = false; // Revert checkbox state on error
      renderErrorState('Failed to complete task. Please retry.');
    }
  }

  async function fetchTasks() {
    if (!_user || !_commandKey) {
      renderErrorState('User handle or command key not set.');
      return;
    }

    renderLoadingState();

    try {
      const url = `${API_BASE_URL}?user=${_user}&status=active&limit=5`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${_commandKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tasks = await response.json();
      renderTasks(tasks);

    } catch (error) {
      console.error('Failed to fetch MITs:', error);
      renderErrorState();
    }
  }

  function renderTasks(tasks) {
    if (!_container) return;

    const totalTasks = tasks.length;
    const completedTasks = 0; // All fetched tasks are active, so none are completed yet in this view

    _container.innerHTML = ''; // Clear previous content

    const widgetWrapper = createElement('div', [], {
      style: `
        background: var(--dash-surface);
        border: 1px solid var(--dash-border);
        border-radius: var(--dash-radius-lg, 14px);
        padding: calc(var(--dash-space-unit, 8px) * 2);
        color: var(--dash-text);
        font-family: sans-serif;
        display: flex;
        flex-direction: column;
        gap: var(--dash-space-unit, 8px);
      `
    });

    const header = createElement('h3', [], {
      style: `
        color: var(--dash-accent);
        margin: 0 0 calc(var(--dash-space-unit, 8px) * 1.5) 0;
        font-size: 1.1em;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `
    }, 'Today\'s MITs');

    const countBadge = createElement('span', [], {
      style: `
        background: var(--dash-muted);
        color: var(--dash-surface);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.8em;
        opacity: 0.7;
      `
    }, `${completedTasks}/${totalTasks}`);
    header.appendChild(countBadge);
    widgetWrapper.appendChild(header);

    if (tasks.length === 0) {
      const emptyMessage = createElement('p', [], {
        style: `color: var(--dash-muted);`
      }, 'No MITs set — add one in Commitments');
      widgetWrapper.appendChild(emptyMessage);
    } else {
      tasks.forEach(task => {
        const taskItem = createElement('div', [], {
          style: `
            display: flex;
            align-items: center;
            gap: var(--dash-space-unit, 8px);
          `
        });

        const checkbox = createElement('input', [], {
          type: 'checkbox',
          id: `mit-task-${task.id}`,
          style: `
            width: 20px;
            height: 20px;
            accent-color: var(--dash-accent); /* Use accent color for checkbox */
            flex-shrink: 0;
          `
        });
        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            handleTaskCompletion(task.id, checkbox);
          }
        });

        const label = createElement('label', [], {
          for: `mit-task-${task.id}`,
          style: `
            flex-grow: 1;
            cursor: pointer;
          `
        }, task.title);

        taskItem.appendChild(checkbox);
        taskItem.appendChild(label);
        widgetWrapper.appendChild(taskItem);
      });
    }
    _container.appendChild(widgetWrapper);
  }

  function mount({ container, user, commandKey }) {
    _container = container || document.getElementById('lifeos-widget-mit');
    if (!_container) {
      console.error('LifeOS MIT Widget: Container element not found.');
      return;
    }

    _user = user;
    _commandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

    if (!_user) {
      console.error('LifeOS MIT Widget: User handle not provided.');
      renderErrorState('User handle missing.');
      return;
    }

    if (!_commandKey) {
      console.error('LifeOS MIT Widget: Command key not found.');
      renderErrorState('Command key missing.');
      return;
    }

    fetchTasks();
  }

  function refresh() {
    fetchTasks();
  }

  window.LifeOSWidgetMIT = {
    mount,
    refresh
  };
})();