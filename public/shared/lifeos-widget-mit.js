(function(){
  const API_BASE_URL = '/api/v1/lifeos/commitments';
  const COMPLETE_API_BASE_URL = '/api/v1/lifeos/commitments';

  let _container = null;
  let _user = null;
  let _commandKey = null;
  let _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function createAndAppend(tag, parent, classes = [], styles = {}, textContent = '') {
    const el = document.createElement(tag);
    if (classes.length) el.classList.add(...classes);
    Object.assign(el.style, styles);
    if (textContent) el.textContent = textContent;
    parent.appendChild(el);
    return el;
  }

  function renderLoadingState() {
    _container.innerHTML = '';
    const wrapper = createAndAppend('div', _container, [], {
      padding: 'var(--dash-space-unit, 8px) * 2',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dash-space-unit, 8px)',
      transition: _prefersReducedMotion ? 'none' : 'opacity 0.3s ease-out',
      opacity: '0.7'
    });
    createAndAppend('div', wrapper, [], {
      height: '1.2em',
      width: '70%',
      background: 'var(--dash-border)',
      borderRadius: '4px'
    });
    for (let i = 0; i < 3; i++) {
      createAndAppend('div', wrapper, [], {
        height: '1em',
        width: `${70 - i * 10}%`,
        background: 'var(--dash-border)',
        borderRadius: '4px'
      });
    }
  }

  function renderErrorState(message = 'Could not load tasks') {
    _container.innerHTML = '';
    const errorWrapper = createAndAppend('div', _container, [], {
      padding: 'var(--dash-space-unit, 8px) * 2',
      textAlign: 'center',
      color: 'var(--dash-text)'
    });
    createAndAppend('p', errorWrapper, [], {}, message);
    const retryButton = createAndAppend('button', errorWrapper, [], {
      background: 'var(--dash-accent)',
      color: 'var(--dash-surface)',
      border: 'none',
      padding: '0.5em 1em',
      borderRadius: 'var(--dash-radius-lg, 14px)',
      cursor: 'pointer',
      fontSize: '0.9em'
    }, 'Retry');
    retryButton.addEventListener('click', refresh);
  }

  function renderEmptyState() {
    _container.innerHTML = '';
    createAndAppend('p', _container, [], {
      padding: 'var(--dash-space-unit, 8px) * 2',
      textAlign: 'center',
      color: 'var(--dash-muted)'
    }, 'No MITs set — add one in Commitments');
  }

  async function handleCheckboxChange(taskId, isChecked) {
    if (!isChecked) return; // Only handle completion for now

    const url = `${COMPLETE_API_BASE_URL}/${taskId}/complete`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Command-Key': _commandKey
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Refresh the list to reflect the change
      refresh();
    } catch (error) {
      console.error('Failed to complete task:', error);
      // Optionally, revert the checkbox state or show a temporary error
      alert('Failed to complete task. Please try again.');
      refresh(); // Re-fetch to ensure UI consistency
    }
  }

  function renderTasks(tasks) {
    _container.innerHTML = '';

    const header = createAndAppend('div', _container, ['mit-header'], {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 'var(--dash-space-unit, 8px)',
      padding: '0 var(--dash-space-unit, 8px)'
    });
    createAndAppend('h3', header, [], {
      margin: '0',
      fontSize: '1.2em',
      color: 'var(--dash-text)'
    }, "Today's MITs");

    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const totalTasks = tasks.length;
    const badge = createAndAppend('span', header, ['mit-badge'], {
      background: 'var(--dash-accent)',
      color: 'var(--dash-surface)',
      padding: '0.2em 0.6em',
      borderRadius: '999px',
      fontSize: '0.8em',
      fontWeight: 'bold'
    }, `${completedTasks}/${totalTasks}`);

    const ul = createAndAppend('ul', _container, ['mit-list'], {
      listStyle: 'none',
      padding: '0',
      margin: '0'
    });

    tasks.forEach(task => {
      const li = createAndAppend('li', ul, [], {
        display: 'flex',
        alignItems: 'center',
        padding: 'var(--dash-space-unit, 8px)',
        borderBottom: '1px solid var(--dash-border)',
        transition: _prefersReducedMotion ? 'none' : 'background-color 0.2s ease-in-out',
        cursor: 'pointer'
      });
      li.addEventListener('mouseenter', () => li.style.backgroundColor = 'rgba(255,255,255,0.05)');
      li.addEventListener('mouseleave', () => li.style.backgroundColor = 'transparent');

      const checkbox = createAndAppend('input', li, [], {
        marginRight: 'var(--dash-space-unit, 8px)',
        accentColor: 'var(--dash-accent)'
      });
      checkbox.type = 'checkbox';
      checkbox.id = `mit-task-${task.id}`;
      checkbox.checked = task.status === 'completed';
      checkbox.disabled = task.status === 'completed'; // Disable if already completed

      const label = createAndAppend('label', li, [], {
        flexGrow: '1',
        color: 'var(--dash-text)',
        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
        opacity: task.status === 'completed' ? '0.7' : '1'
      }, task.title);
      label.htmlFor = `mit-task-${task.id}`;

      if (task.status !== 'completed') {
        checkbox.addEventListener('change', (e) => handleCheckboxChange(task.id, e.target.checked));
      }
    });

    if (tasks.length > 0) {
      ul.lastElementChild.style.borderBottom = 'none'; // Remove border from last item
    }
  }

  async function refresh() {
    if (!_container || !_user || !_commandKey) {
      console.error('LifeOSWidgetMIT: Widget not properly mounted or missing user/commandKey.');
      renderErrorState('Widget configuration error.');
      return;
    }

    renderLoadingState();

    try {
      const url = `${API_BASE_URL}?user=${_user}&status=active&limit=5`;
      const response = await fetch(url, {
        headers: {
          'X-Command-Key': _commandKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const tasks = data.commitments || [];

      if (tasks.length === 0) {
        renderEmptyState();
      } else {
        renderTasks(tasks);
      }

    } catch (error) {
      console.error('LifeOSWidgetMIT: Fetch failed:', error);
      renderErrorState();
    }
  }

  function mount({ container, user, commandKey }) {
    if (!container || !user) {
      console.error('LifeOSWidgetMIT: mount requires a container element and user handle.');
      return;
    }

    _container = container;
    _user = user;
    _commandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

    if (!_commandKey) {
      console.error('LifeOSWidgetMIT: commandKey is missing. Widget may not function correctly.');
      renderErrorState('Missing commandKey. Please configure.');
      return;
    }

    // Apply base styling to the container
    Object.assign(_container.style, {
      background: 'var(--dash-surface)',
      color: 'var(--dash-text)',
      border: '1px solid var(--dash-border)',
      borderRadius: 'var(--dash-radius-lg, 14px)',
      padding: 'var(--dash-space-unit, 8px) * 2',
      fontFamily: 'sans-serif', // Basic fallback
      fontSize: '14px'
    });

    refresh();
  }

  window.LifeOSWidgetMIT = {
    mount,
    refresh
  };
})();