(function(){
  let _container = null;
  let _user = null;
  let _commandKey = null;
  let _abortController = null;
  let _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const API_BASE = '/api/v1/lifeos/commitments';

  function getCommandKey() {
    return _commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');
  }

  function createEl(tag, classes = [], attributes = {}, textContent = '') {
    const el = document.createElement(tag);
    if (classes.length) el.classList.add(...classes);
    for (const key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
    if (textContent) el.textContent = textContent;
    return el;
  }

  function renderSkeleton() {
    if (!_container) return;
    _container.innerHTML = '';
    _container.style.setProperty('background-color', 'var(--dash-surface)');
    _container.style.setProperty('color', 'var(--dash-text)');
    _container.style.setProperty('border', '1px solid var(--dash-border)');
    _container.style.setProperty('border-radius', 'var(--dash-radius-lg)');
    _container.style.setProperty('padding', 'calc(2 * var(--dash-space-unit))');
    _container.style.setProperty('display', 'flex');
    _container.style.setProperty('flex-direction', 'column');
    _container.style.setProperty('gap', 'var(--dash-space-unit)');

    const header = createEl('div', ['mit-widget-header']);
    header.style.setProperty('display', 'flex');
    header.style.setProperty('justify-content', 'space-between');
    header.style.setProperty('align-items', 'center');
    header.style.setProperty('margin-bottom', 'var(--dash-space-unit)');

    const title = createEl('h3', [], {}, 'Today\'s MITs');
    title.style.setProperty('margin', '0');
    title.style.setProperty('font-size', '1.1em');
    header.appendChild(title);

    const countBadge = createEl('span', ['mit-count-badge']);
    countBadge.style.setProperty('background-color', 'var(--dash-accent)');
    countBadge.style.setProperty('color', 'var(--dash-text)');
    countBadge.style.setProperty('padding', '2px 8px');
    countBadge.style.setProperty('border-radius', '10px');
    countBadge.style.setProperty('font-size', '0.8em');
    countBadge.textContent = '.../...';
    header.appendChild(countBadge);
    _container.appendChild(header);

    const list = createEl('ul', ['mit-list']);
    list.style.setProperty('list-style', 'none');
    list.style.setProperty('padding', '0');
    list.style.setProperty('margin', '0');
    _container.appendChild(list);

    for (let i = 0; i < 3; i++) {
      const listItem = createEl('li', ['mit-item', 'skeleton']);
      listItem.style.setProperty('display', 'flex');
      listItem.style.setProperty('align-items', 'center');
      listItem.style.setProperty('gap', 'calc(1 * var(--dash-space-unit))');
      listItem.style.setProperty('padding', 'calc(0.5 * var(--dash-space-unit)) 0');
      listItem.style.setProperty('border-bottom', '1px solid var(--dash-border)');

      const checkbox = createEl('div', ['skeleton-checkbox']);
      checkbox.style.setProperty('width', '18px');
      checkbox.style.setProperty('height', '18px');
      checkbox.style.setProperty('border-radius', '4px');
      checkbox.style.setProperty('background-color', 'var(--dash-muted)');
      listItem.appendChild(checkbox);

      const text = createEl('div', ['skeleton-text']);
      text.style.setProperty('flex-grow', '1');
      text.style.setProperty('height', '1em');
      text.style.setProperty('background-color', 'var(--dash-muted)');
      text.style.setProperty('border-radius', '4px');
      text.style.setProperty('width', `${70 + Math.random() * 20}%`); // Vary width
      listItem.appendChild(text);
      list.appendChild(listItem);
    }

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse-skeleton {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
      .mit-item.skeleton > div {
        animation: pulse-skeleton 1.5s infinite ease-in-out;
      }
      .mit-item.skeleton:nth-child(2) > div { animation-delay: 0.1s; }
      .mit-item.skeleton:nth-child(3) > div { animation-delay: 0.2s; }
    `;
    _container.appendChild(style);
  }

  async function handleTaskCompletion(event) {
    const checkbox = event.target;
    const taskId = checkbox.dataset.taskId;
    const isChecked = checkbox.checked;

    // Optimistic UI update
    const listItem = checkbox.closest('.mit-item');
    if (listItem) {
      listItem.classList.toggle('completed', isChecked);
      const titleEl = listItem.querySelector('.mit-title');
      if (titleEl) {
        titleEl.style.textDecoration = isChecked ? 'line-through' : 'none';
        titleEl.style.opacity = isChecked ? '0.6' : '1';
      }
    }

    const currentCommandKey = getCommandKey();
    if (!currentCommandKey) {
      console.error('Command key is missing for task completion.');
      checkbox.checked = !isChecked; // Revert UI
      if (listItem) {
        listItem.classList.toggle('completed', !isChecked);
        const titleEl = listItem.querySelector('.mit-title');
        if (titleEl) {
          titleEl.style.textDecoration = !isChecked ? 'line-through' : 'none';
          titleEl.style.opacity = !isChecked ? '0.6' : '1';
        }
      }
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentCommandKey}`
        },
        body: JSON.stringify({ completed: isChecked })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Re-fetch to ensure count is accurate and list is up-to-date
      // Or, more simply, just update the count badge if the API confirms success
      refresh();

    } catch (error) {
      console.error('Failed to update task completion status:', error);
      // Revert UI on error
      checkbox.checked = !isChecked;
      if (listItem) {
        listItem.classList.toggle('completed', !isChecked);
        const titleEl = listItem.querySelector('.mit-title');
        if (titleEl) {
          titleEl.style.textDecoration = !isChecked ? 'line-through' : 'none';
          titleEl.style.opacity = !isChecked ? '0.6' : '1';
        }
      }
      // Optionally show a temporary error message to the user
    }
  }

  function renderErrorState() {
    if (!_container) return;
    _container.innerHTML = '';
    _container.style.setProperty('background-color', 'var(--dash-surface)');
    _container.style.setProperty('color', 'var(--dash-text)');
    _container.style.setProperty('border', '1px solid var(--dash-border)');
    _container.style.setProperty('border-radius', 'var(--dash-radius-lg)');
    _container.style.setProperty('padding', 'calc(2 * var(--dash-space-unit))');
    _container.style.setProperty('display', 'flex');
    _container.style.setProperty('flex-direction', 'column');
    _container.style.setProperty('align-items', 'center');
    _container.style.setProperty('justify-content', 'center');
    _container.style.setProperty('min-height', '120px');

    const errorMessage = createEl('p', [], {}, 'Could not load tasks');
    errorMessage.style.setProperty('margin-bottom', 'calc(1 * var(--dash-space-unit))');
    _container.appendChild(errorMessage);

    const retryButton = createEl('button', ['mit-retry-button'], {}, 'Retry');
    retryButton.style.setProperty('background-color', 'var(--dash-accent)');
    retryButton.style.setProperty('color', 'var(--dash-text)');
    retryButton.style.setProperty('border', 'none');
    retryButton.style.setProperty('padding', 'calc(1 * var(--dash-space-unit)) calc(2 * var(--dash-space-unit))');
    retryButton.style.setProperty('border-radius', 'var(--dash-radius-lg)');
    retryButton.style.setProperty('cursor', 'pointer');
    retryButton.style.setProperty('font-size', '0.9em');
    retryButton.addEventListener('click', refresh);
    _container.appendChild(retryButton);
  }

  async function fetchAndRenderTasks() {
    if (!_container || !_user) {
      console.warn('MITs widget not mounted or user not set.');
      return;
    }

    renderSkeleton(); // Show loading state

    if (_abortController) {
      _abortController.abort();
    }
    _abortController = new AbortController();
    const { signal } = _abortController;

    const currentCommandKey = getCommandKey();
    if (!currentCommandKey) {
      console.error('Command key is missing. Cannot fetch MITs.');
      renderErrorState();
      return;
    }

    try {
      const url = `${API_BASE}?user=${encodeURIComponent(_user)}&status=active&limit=5`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${currentCommandKey}`
        },
        signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tasks = await response.json();
      renderTasks(tasks);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted for MITs widget.');
        return;
      }
      console.error('Failed to fetch MITs:', error);
      renderErrorState();
    }
  }

  function renderTasks(tasks) {
    if (!_container) return;

    _container.innerHTML = ''; // Clear skeleton/previous content

    const header = createEl('div', ['mit-widget-header']);
    header.style.setProperty('display', 'flex');
    header.style.setProperty('justify-content', 'space-between');
    header.style.setProperty('align-items', 'center');
    header.style.setProperty('margin-bottom', 'calc(1 * var(--dash-space-unit))');

    const title = createEl('h3', [], {}, 'Today\'s MITs');
    title.style.setProperty('margin', '0');
    title.style.setProperty('font-size', '1.1em');
    header.appendChild(title);

    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const totalTasks = tasks.length;
    const countBadge = createEl('span', ['mit-count-badge']);
    countBadge.style.setProperty('background-color', 'var(--dash-accent)');
    countBadge.style.setProperty('color', 'var(--dash-text)');
    countBadge.style.setProperty('padding', '2px 8px');
    countBadge.style.setProperty('border-radius', '10px');
    countBadge.style.setProperty('font-size', '0.8em');
    countBadge.textContent = `${completedTasks}/${totalTasks}`;
    header.appendChild(countBadge);
    _container.appendChild(header);

    if (tasks.length === 0) {
      const emptyState = createEl('p', ['mit-empty-state'], {}, 'No MITs set — add one in Commitments');
      emptyState.style.setProperty('color', 'var(--dash-muted)');
      emptyState.style.setProperty('text-align', 'center');
      emptyState.style.setProperty('padding', 'calc(2 * var(--dash-space-unit))');
      _container.appendChild(emptyState);
      return;
    }

    const list = createEl('ul', ['mit-list']);
    list.style.setProperty('list-style', 'none');
    list.style.setProperty('padding', '0');
    list.style.setProperty('margin', '0');
    _container.appendChild(list);

    tasks.forEach(task => {
      const listItem = createEl('li', ['mit-item']);
      listItem.style.setProperty('display', 'flex');
      listItem.style.setProperty('align-items', 'center');
      listItem.style.setProperty('gap', 'calc(1 * var(--dash-space-unit))');
      listItem.style.setProperty('padding', 'calc(0.5 * var(--dash-space-unit)) 0');
      listItem.style.setProperty('border-bottom', '1px solid var(--dash-border)');
      listItem.style.setProperty('transition', _prefersReducedMotion ? 'none' : 'opacity 0.3s ease');

      const checkbox = createEl('input', ['mit-checkbox'], {
        type: 'checkbox',
        'data-task-id': task.id,
        id: `mit-task-${task.id}`
      });
      checkbox.checked = task.status === 'completed';
      checkbox.style.setProperty('width', '18px');
      checkbox.style.setProperty('height', '18px');
      checkbox.style.setProperty('cursor', 'pointer');
      checkbox.style.setProperty('accent-color', 'var(--dash-accent)'); // Use accent color for checkbox
      checkbox.addEventListener('change', handleTaskCompletion);
      listItem.appendChild(checkbox);

      const titleLabel = createEl('label', ['mit-title'], { htmlFor: `mit-task-${task.id}` }, task.title);
      titleLabel.style.setProperty('flex-grow', '1');
      titleLabel.style.setProperty('font-size', '0.95em');
      titleLabel.style.setProperty('cursor', 'pointer');
      if (task.status === 'completed') {
        titleLabel.style.setProperty('text-decoration', 'line-through');
        titleLabel.style.setProperty('opacity', '0.6');
      }
      listItem.appendChild(titleLabel);
      list.appendChild(listItem);
    });
  }

  const mount = ({ container, user, commandKey }) => {
    if (!container || !(container instanceof HTMLElement)) {
      console.error('Invalid container element provided for LifeOS MIT widget.');
      return;
    }
    _container = container;
    _user = user;
    _commandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

    // Apply base styles to the container
    _container.style.setProperty('background-color', 'var(--dash-surface)');
    _container.style.setProperty('color', 'var(--dash-text)');
    _container.style.setProperty('border', '1px solid var(--dash-border)');
    _container.style.setProperty('border-radius', 'var(--dash-radius-lg)');
    _container.style.setProperty('padding', 'calc(2 * var(--dash-space-unit))');
    _container.style.setProperty('display', 'flex');
    _container.style.setProperty('flex-direction', 'column');
    _container.style.setProperty('gap', 'var(--dash-space-unit)');
    _container.style.setProperty('box-sizing', 'border-box'); // Ensure padding is included in width/height

    fetchAndRenderTasks();
  };

  const refresh = () => {
    fetchAndRenderTasks();
  };

  window.LifeOSWidgetMIT = {
    mount,
    refresh
  };
})();