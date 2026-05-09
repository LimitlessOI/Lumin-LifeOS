(function(){
  const API_BASE = '/api/v1/lifeos/commitments';
  let _container = null;
  let _user = null;
  let _commandKey = null;
  let _currentMITs = [];
  let _isFetching = false;

  // Respect prefers-reduced-motion for any future animations, currently minimal impact on static skeleton
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getCommandKey(providedKey) {
    return providedKey || window.lifeosCommandKey || localStorage.getItem('commandKey');
  }

  function renderLoadingState() {
    if (!_container) return;
    _container.innerHTML = `
      <div style="
        background-color: var(--bg-surface, #111118);
        color: var(--text-primary, #e8e8f0);
        border: 1px solid var(--border-subtle, rgba(255,255,255,0.07));
        border-radius: 14px;
        padding: 16px;
        font-family: sans-serif;
        box-sizing: border-box;
      ">
        <h3 style="margin: 0 0 12px 0; font-size: 1.2em;">Today's MITs</h3>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="width: 60px; height: 20px; background-color: var(--border-subtle, rgba(255,255,255,0.07)); border-radius: 4px;"></div>
          <div style="width: 40px; height: 20px; background-color: var(--border-subtle, rgba(255,255,255,0.07)); border-radius: 4px;"></div>
        </div>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${Array(3).fill(0).map(() => `
            <li style="display: flex; align-items: center; margin-bottom: 8px;">
              <div style="width: 18px; height: 18px; background-color: var(--border-subtle, rgba(255,255,255,0.07)); border-radius: 4px; margin-right: 8px;"></div>
              <div style="flex-grow: 1; height: 18px; background-color: var(--border-subtle, rgba(255,255,255,0.07)); border-radius: 4px;"></div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  function renderErrorState(message = 'Could not load tasks') {
    if (!_container) return;
    _container.innerHTML = `
      <div style="
        background-color: var(--bg-surface, #111118);
        color: var(--text-primary, #e8e8f0);
        border: 1px solid var(--border-subtle, rgba(255,255,255,0.07));
        border-radius: 14px;
        padding: 16px;
        font-family: sans-serif;
        text-align: center;
        box-sizing: border-box;
      ">
        <p style="margin-bottom: 12px;">${message}</p>
        <button id="lifeos-mit-retry-button" style="
          background-color: var(--c-today, #5b6af5);
          color: var(--text-primary, #e8e8f0);
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9em;
          transition: background-color 0.2s ease;
        ">Retry</button>
      </div>
    `;
    document.getElementById('lifeos-mit-retry-button').addEventListener('click', refresh);
  }

  async function fetchMITs() {
    if (!_user || !_commandKey) {
      renderErrorState('User handle or command key missing.');
      return;
    }
    _isFetching = true;
    renderLoadingState();
    try {
      const url = `${API_BASE}?user=${encodeURIComponent(_user)}&status=active&limit=5`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${_commandKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      _currentMITs = data;
      renderMITs();
    } catch (error) {
      console.error('LifeOS MIT Widget: Failed to fetch MITs:', error);
      renderErrorState();
    } finally {
      _isFetching = false;
    }
  }

  async function completeMIT(id, isCompleted) {
    if (!_commandKey) {
      console.error('LifeOS MIT Widget: Command key missing for completion.');
      renderErrorState('Authentication error: Cannot complete task.');
      return;
    }
    try {
      const url = `${API_BASE}/${id}/complete`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${_commandKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed: isCompleted })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Optimistically update UI
      const updatedMITs = _currentMITs.map(mit =>
        mit.id === id ? { ...mit, status: isCompleted ? 'completed' : 'pending' } : mit
      );
      _currentMITs = updatedMITs;
      renderMITs();
    } catch (error) {
      console.error(`LifeOS MIT Widget: Failed to complete MIT ${id}:`, error);
      renderErrorState('Failed to update task status. Please retry.');
      // Re-fetch to ensure consistency if optimistic update failed
      refresh();
    }
  }

  function renderMITs() {
    if (!_container) return;

    const completedCount = _currentMITs.filter(mit => mit.status === 'completed').length;
    const totalCount = _currentMITs.length;

    let content;
    if (totalCount === 0) {
      content = `
        <p style="text-align: center; margin-top: 20px; color: var(--text-primary, #e8e8f0);">
          No MITs set — add one in Commitments
        </p>
      `;
    } else {
      content = `
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${_currentMITs.map(mit => `
            <li style="display: flex; align-items: center; margin-bottom: 8px;">
              <input type="checkbox" id="mit-${mit.id}" data-mit-id="${mit.id}" ${mit.status === 'completed' ? 'checked' : ''}
                style="
                  margin-right: 8px;
                  width: 18px;
                  height: 18px;
                  accent-color: var(--c-today, #5b6af5); /* Checkbox color */
                  cursor: pointer;
                "
              >
              <label for="mit-${mit.id}" style="
                flex-grow: 1;
                color: var(--text-primary, #e8e8f0);
                text-decoration: ${mit.status === 'completed' ? 'line-through' : 'none'};
                opacity: ${mit.status === 'completed' ? '0.7' : '1'};
                cursor: pointer;
              ">${mit.title}</label>
            </li>
          `).join('')}
        </ul>
      `;
    }

    _container.innerHTML = `
      <div style="
        background-color: var(--bg-surface, #111118);
        color: var(--text-primary, #e8e8f0);
        border: 1px solid var(--border-subtle, rgba(255,255,255,0.07));
        border-radius: 14px;
        padding: 16px;
        font-family: sans-serif;
        box-sizing: border-box;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 1.2em;">Today's MITs</h3>
          <span style="
            background-color: var(--c-today, #5b6af5);
            color: var(--text-primary, #e8e8f0);
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
          ">${completedCount}/${totalCount}</span>
        </div>
        ${content}
      </div>
    `;

    _container.querySelectorAll('input[type="checkbox"][data-mit-id]').forEach(checkbox => {
      checkbox.addEventListener('change', (event) => {
        const mitId = event.target.dataset.mitId;
        const isChecked = event.target.checked;
        completeMIT(mitId, isChecked);
      });
    });
  }

  function mount({ container, user, commandKey }) {
    if (!container) {
      console.error('LifeOS MIT Widget: Container element not provided.');
      return;
    }
    _container = container;
    _user = user;
    _commandKey = getCommandKey(commandKey);

    if (!_user) {
      renderErrorState('User handle is required to load MITs.');
      return;
    }
    if (!_commandKey) {
      renderErrorState('Command key is required for authentication.');
      return;
    }

    refresh();
  }

  function refresh() {
    if (_isFetching) return; // Prevent multiple simultaneous fetches
    fetchMITs();
  }

  // Expose public API
  window.LifeOSWidgetMIT = {
    mount,
    refresh
  };

})();