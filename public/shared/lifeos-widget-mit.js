(function(){
  const API_BASE = '/api/v1/lifeos/commitments';
  let _container = null;
  let _user = null;
  let _commandKey = null;
  let _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function $$ (selector, parent = document) {
    return parent.querySelectorAll(selector);
  }

  async function apiFetch(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-lifeos-key': _commandKey || localStorage.getItem('commandKey') || window.lifeosCommandKey || '',
      ...options.headers
    };
    const response = await fetch(path, { ...options, headers });
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  function renderWidgetShell() {
    _container.innerHTML = `
      <style>
        .lifeos-mit-widget {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg, 14px);
          padding: 20px;
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
        }
        .lifeos-mit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .lifeos-mit-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted, #555566); /* Fallback if not defined */
        }
        .lifeos-mit-badge {
          background: var(--c-today);
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 10px;
          min-width: 40px;
          text-align: center;
        }
        .lifeos-mit-list {
          flex-grow: 1;
        }
        .lifeos-mit-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
        }
        .lifeos-mit-item:last-of-type {
          border-bottom: none;
        }
        .lifeos-mit-check {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          border: 2px solid var(--border-focus, rgba(255,255,255,0.18));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, border-color 0.2s;
          margin-top: 1px;
        }
        .lifeos-mit-check.done {
          background: var(--c-today);
          border-color: var(--c-today);
        }
        .lifeos-mit-check svg {
          display: none;
        }
        .lifeos-mit-check.done svg {
          display: block;
        }
        .lifeos-mit-check.done svg polyline {
          stroke-dasharray: 20;
          stroke-dashoffset: 20; /* Start off-screen */
          animation: check-draw 0.25s ease forwards;
        }
        .lifeos-mit-text {
          flex: 1;
          font-size: 15px;
          line-height: 1.4;
          color: var(--text-primary);
          transition: color 0.2s;
        }
        .lifeos-mit-text.done {
          color: var(--text-muted);
          text-decoration: line-through;
        }
        .lifeos-mit-empty, .lifeos-mit-error {
          text-align: center;
          padding: 20px 0;
          color: var(--text-muted);
          font-size: 14px;
        }
        .lifeos-mit-empty span, .lifeos-mit-error span {
          display: block;
          font-size: 28px;
          margin-bottom: 6px;
        }
        .lifeos-mit-error button {
          background: var(--c-today);
          color: #fff;
          border: none;
          border-radius: var(--radius-md, 10px);
          font-size: 14px;
          font-weight: 600;
          padding: 8px 16px;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.15s;
          margin-top: 10px;
        }
        .lifeos-mit-error button:hover {
          opacity: 0.85;
        }
        .lifeos-mit-skeleton {
          background: linear-gradient(90deg, var(--bg-surface2, #17171f) 25%, var(--bg-overlay, #1e1e28) 50%, var(--bg-surface2, #17171f) 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s infinite;
          border-radius: var(--radius-sm, 6px);
          height: 14px;
          margin-bottom: 10px;
        }
        .lifeos-mit-skeleton:last-child {
          width: 60%;
        }

        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes check-draw {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lifeos-mit-check.done svg polyline {
            animation: none;
            stroke-dashoffset: 0;
          }
          .lifeos-mit-skeleton {
            animation: none;
          }
        }
      </style>
      <div class="lifeos-mit-widget">
        <div class="lifeos-mit-header">
          <div class="lifeos-mit-title">Today's MITs</div>
          <div class="lifeos-mit-badge" id="lifeos-mit-count"></div>
        </div>
        <div class="lifeos-mit-list" id="lifeos-mit-list-content"></div>
      </div>
    `;
  }

  function renderLoadingState() {
    const listContent = $('#lifeos-mit-list-content', _container);
    if (listContent) {
      listContent.innerHTML = `
        <div class="lifeos-mit-skeleton" style="width: 90%;"></div>
        <div class="lifeos-mit-skeleton" style="width: 70%;"></div>
        <div class="lifeos-mit-skeleton" style="width: 80%;"></div>
      `;
    }
    const countBadge = $('#lifeos-mit-count', _container);
    if (countBadge) countBadge.textContent = 'Loading...';
  }

  function renderEmptyState() {
    const listContent = $('#lifeos-mit-list-content', _container);
    if (listContent) {
      listContent.innerHTML = `
        <div class="lifeos-mit-empty">
          <span>✅</span>
          No MITs set — add one in Commitments
        </div>
      `;
    }
    const countBadge = $('#lifeos-mit-count', _container);
    if (countBadge) countBadge.textContent = '0/0';
  }

  function renderErrorState(error) {
    const listContent = $('#lifeos-mit-list-content', _container);
    if (listContent) {
      listContent.innerHTML = `
        <div class="lifeos-mit-error">
          <span>⚠️</span>
          Could not load tasks
          <button id="lifeos-mit-retry-btn">Retry</button>
        </div>
      `;
      $('#lifeos-mit-retry-btn', _container).addEventListener('click', loadMITs);
    }
    const countBadge = $('#lifeos-mit-count', _container);
    if (countBadge) countBadge.textContent = 'Error';
  }

  async function toggleMITCompletion(id, isCompleted) {
    try {
      await apiFetch(`${API_BASE}/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ completed: isCompleted })
      });
      // Refresh the list to reflect changes and update counts
      loadMITs();
    } catch (error) {
      console.error('Failed to toggle MIT completion:', error);
      // Optionally, revert UI state or show a temporary error message
      loadMITs(); // Re-fetch to ensure consistency
    }
  }

  function renderTasks(tasks) {
    const listContent = $('#lifeos-mit-list-content', _container);
    if (!listContent) return;

    if (tasks.length === 0) {
      renderEmptyState();
      return;
    }

    let completedCount = 0;
    const taskHtml = tasks.map(task => {
      const isDone = task.completed_at !== null;
      if (isDone) completedCount++;
      return `
        <div class="lifeos-mit-item" data-id="${task.id}" data-completed="${isDone}">
          <div class="lifeos-mit-check ${isDone ? 'done' : ''}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polyline points="2,6 5,9 10,3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="lifeos-mit-text ${isDone ? 'done' : ''}">${task.title || task.text || 'Untitled Task'}</div>
        </div>
      `;
    }).join('');

    listContent.innerHTML = taskHtml;

    $$('.lifeos-mit-item', listContent).forEach(itemEl => {
      itemEl.addEventListener('click', () => {
        const id = itemEl.dataset.id;
        const isCurrentlyCompleted = itemEl.dataset.completed === 'true';
        toggleMITCompletion(id, !isCurrentlyCompleted);
      });
    });

    const countBadge = $('#lifeos-mit-count', _container);
    if (countBadge) {
      countBadge.textContent = `${completedCount}/${tasks.length}`;
    }
  }

  async function loadMITs() {
    if (!_container || !_user) {
      console.warn('LifeOS MIT Widget not properly initialized.');
      return;
    }

    renderLoadingState();

    try {
      const data = await apiFetch(`${API_BASE}?user=${_user}&status=active&limit=5`);
      const commitments = data.commitments || [];
      const mitTasks = commitments.filter(c => c.is_mit); // Ensure only MITs are shown

      renderTasks(mitTasks);
    } catch (error) {
      console.error('Error loading MITs:', error);
      renderErrorState(error);
    }
  }

  const LifeOSWidgetMIT = {
    mount: function({ container, user, commandKey }) {
      if (!container) {
        console.error('LifeOSWidgetMIT: Container element is required for mounting.');
        return;
      }
      _container = container;
      _user = user;
      _commandKey = commandKey || localStorage.getItem('commandKey') || window.lifeosCommandKey;

      renderWidgetShell();
      loadMITs();
    },
    refresh: function() {
      loadMITs();
    }
  };

  window.LifeOSWidgetMIT = LifeOSWidgetMIT;
})();