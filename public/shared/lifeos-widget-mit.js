(function(){
  const API_BASE_URL = '/api/v1/lifeos/commitments';
  let widgetContainer = null;
  let currentUser = null;
  let currentCommandKey = null;
  let currentTasks = [];
  let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function createWidgetElement() {
    const widget = document.createElement('div');
    widget.className = 'lifeos-mit-widget';
    widget.innerHTML = `
      <style>
        .lifeos-mit-widget {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
          background-color: var(--dash-surface, #ffffff);
          color: var(--dash-text, #1a1a22);
          border: 1px solid var(--dash-border, rgba(0,0,0,0.1));
          border-radius: var(--dash-radius-lg, 14px);
          padding: calc(var(--dash-space-unit, 8px) * 2);
          display: flex;
          flex-direction: column;
          gap: var(--dash-space-unit, 8px);
          box-sizing: border-box;
          min-width: 280px;
        }
        .lifeos-mit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--dash-space-unit, 8px);
        }
        .lifeos-mit-title {
          margin: 0;
          font-size: 1.2em;
          font-weight: 600;
        }
        .lifeos-mit-badge {
          background-color: var(--dash-accent, #5b6af5); /* Using --dash-accent for --c-today */
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8em;
          font-weight: 500;
        }
        .lifeos-mit-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--dash-space-unit, 8px);
        }
        .lifeos-mit-item {
          display: flex;
          align-items: center;
          gap: var(--dash-space-unit, 8px);
          padding: var(--dash-space-unit, 8px);
          border-radius: var(--dash-radius-lg, 14px);
          background-color: var(--dash-bg, #f6f7fb); /* Slightly different background for items */
          transition: background-color 0.2s ease-in-out;
        }
        .lifeos-mit-item.completed {
          opacity: 0.6;
          text-decoration: line-through;
        }
        .lifeos-mit-item input[type="checkbox"] {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border: 2px solid var(--dash-muted, #777788);
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: border-color 0.2s ease-in-out, background-color 0.2s ease-in-out;
        }
        .lifeos-mit-item input[type="checkbox"]:checked {
          background-color: var(--dash-accent, #5b6af5);
          border-color: var(--dash-accent, #5b6af5);
        }
        .lifeos-mit-item input[type="checkbox"]:checked::after {
          content: '✔';
          color: white;
          font-size: 12px;
          line-height: 1;
        }
        .lifeos-mit-item-title {
          flex-grow: 1;
          font-size: 0.95em;
        }
        .lifeos-mit-empty, .lifeos-mit-error, .lifeos-mit-loading {
          text-align: center;
          padding: calc(var(--dash-space-unit, 8px) * 2);
          color: var(--dash-muted, #777788);
        }
        .lifeos-mit-error button {
          background-color: var(--dash-accent, #5b6af5);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: var(--dash-radius-lg, 14px);
          cursor: pointer;
          margin-top: var(--dash-space-unit, 8px);
          transition: background-color 0.2s ease-in-out;
        }
        .lifeos-mit-error button:hover {
          background-color: var(--dash-accent, #5b6af5);
          filter: brightness(0.9);
        }
        .lifeos-mit-skeleton-item {
          height: 20px;
          background-color: var(--dash-bg, #f6f7fb);
          border-radius: 4px;
          animation: skeleton-loading 1.5s infinite linear;
        }
        @keyframes skeleton-loading {
          0% { opacity: 0.7; }
          50% { opacity: 0.4; }
          100% { opacity: 0.7; }
        }
        .lifeos-mit-skeleton-item:nth-child(1) { width: 90%; }
        .lifeos-mit-skeleton-item:nth-child(2) { width: 95%; }
        .lifeos-mit-skeleton-item:nth-child(3) { width: 80%; }
        .lifeos-mit-skeleton-item:nth-child(4) { width: 85%; }
        .lifeos-mit-skeleton-item:nth-child(5) { width: 70%; }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .lifeos-mit-item, .lifeos-mit-error button {
            transition: none !important;
          }
          .lifeos-mit-skeleton-item {
            animation: none !important;
            opacity: 0.6;
          }
        }
      </style>
      <div class="lifeos-mit-header">
        <h3 class="lifeos-mit-title">Today's MITs</h3>
        <span class="lifeos-mit-badge"></span>
      </div>
      <div class="lifeos-mit-content">
        <ul class="lifeos-mit-list"></ul>
      </div>
    `;
    return widget;
  }

  function renderLoadingState() {
    const list = widgetContainer.querySelector('.lifeos-mit-list');
    list.innerHTML = `
      <li class="lifeos-mit-loading">Loading tasks...</li>
      <li class="lifeos-mit-item lifeos-mit-skeleton-item"></li>
      <li class="lifeos-mit-item lifeos-mit-skeleton-item"></li>
      <li class="lifeos-mit-item lifeos-mit-skeleton-item"></li>
      <li class="lifeos-mit-item lifeos-mit-skeleton-item"></li>
      <li class="lifeos-mit-item lifeos-mit-skeleton-item"></li>
    `;
    updateBadge(0, 0);
  }

  function renderEmptyState() {
    const list = widgetContainer.querySelector('.lifeos-mit-list');
    list.innerHTML = `<li class="lifeos-mit-empty">No MITs set — add one in Commitments</li>`;
    updateBadge(0, 0);
  }

  function renderErrorState() {
    const list = widgetContainer.querySelector('.lifeos-mit-list');
    list.innerHTML = `
      <li class="lifeos-mit-error">
        <p>Could not load tasks</p>
        <button class="lifeos-mit-retry-button">Retry</button>
      </li>
    `;
    widgetContainer.querySelector('.lifeos-mit-retry-button').addEventListener('click', refresh);
    updateBadge(0, 0);
  }

  function updateBadge(done, total) {
    const badge = widgetContainer.querySelector('.lifeos-mit-badge');
    if (badge) {
      badge.textContent = `${done}/${total}`;
    }
  }

  async function fetchMITs() {
    if (!currentUser || !currentCommandKey) {
      console.warn('LifeOS MIT Widget: User or commandKey not set. Cannot fetch tasks.');
      renderErrorState();
      return;
    }

    renderLoadingState();

    try {
      const url = `${API_BASE_URL}?user=${encodeURIComponent(currentUser)}&status=active&limit=5`;
      const response = await fetch(url, {
        headers: {
          'X-Command-Key': currentCommandKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      currentTasks = data.commitments || []; // Assuming 'commitments' array in response
      renderTasks(currentTasks);

    } catch (error) {
      console.error('LifeOS MIT Widget: Failed to fetch MITs:', error);
      renderErrorState();
    }
  }

  async function completeMIT(taskId) {
    if (!currentCommandKey) {
      console.warn('LifeOS MIT Widget: commandKey not set for completion.');
      return;
    }

    try {
      const url = `${API_BASE_URL}/${taskId}/complete`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Command-Key': currentCommandKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Optimistically update UI
      const taskItem = widgetContainer.querySelector(`[data-task-id="${taskId}"]`);
      if (taskItem) {
        taskItem.classList.add('completed');
        const checkbox = taskItem.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = true;
      }
      // Refresh to get the latest state and ensure badge is correct
      refresh();

    } catch (error) {
      console.error(`LifeOS MIT Widget: Failed to complete task ${taskId}:`, error);
      // Revert checkbox state if completion failed
      const checkbox = widgetContainer.querySelector(`[data-task-id="${taskId}"] input[type="checkbox"]`);
      if (checkbox) checkbox.checked = false;
      alert('Failed to complete task. Please try again.'); // Simple user feedback
    }
  }

  function renderTasks(tasks) {
    const list = widgetContainer.querySelector('.lifeos-mit-list');
    list.innerHTML = ''; // Clear previous content

    if (tasks.length === 0) {
      renderEmptyState();
      return;
    }

    let completedCount = 0;
    tasks.forEach(task => {
      // Assuming tasks from /active endpoint are not completed,
      // but if the API returns a 'completed' status, we should respect it.
      const isCompleted = task.completed || false;
      if (isCompleted) completedCount++;

      const listItem = document.createElement('li');
      listItem.className = `lifeos-mit-item ${isCompleted ? 'completed' : ''}`;
      listItem.setAttribute('data-task-id', task.id);
      listItem.innerHTML = `
        <input type="checkbox" ${isCompleted ? 'checked' : ''} id="mit-task-${task.id}">
        <label for="mit-task-${task.id}" class="lifeos-mit-item-title">${task.title}</label>
      `;
      list.appendChild(listItem);

      const checkbox = listItem.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (event) => {
        if (event.target.checked) {
          completeMIT(task.id);
        }
        // The spec only mentions POST /complete, not uncompleting.
        // If unchecked, we don't have an API for uncompleting, so we don't handle it.
      });
    });

    updateBadge(completedCount, tasks.length);
  }

  function mount({ container, user, commandKey }) {
    if (!container) {
      container = document.getElementById('lifeos-widget-mit');
    }
    if (!container) {
      console.error('LifeOS MIT Widget: Container element not found. Please provide a container or ensure an element with id="lifeos-widget-mit" exists.');
      return;
    }

    widgetContainer = container;
    currentUser = user;
    currentCommandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

    // Clear existing content and append the widget
    widgetContainer.innerHTML = '';
    widgetContainer.appendChild(createWidgetElement());

    refresh();
  }

  function refresh() {
    fetchMITs();
  }

  window.LifeOSWidgetMIT = {
    mount,
    refresh
  };
})();