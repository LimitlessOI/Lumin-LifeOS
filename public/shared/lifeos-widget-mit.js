(function(){
  const API_BASE_URL = '/api/v1/lifeos/commitments';
  const WIDGET_ID = 'lifeos-widget-mit';

  let _container = null;
  let _user = null;
  let _commandKey = null;
  let _prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getCommandKey() {
    return _commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');
  }

  function createEl(tag, classes = [], attributes = {}, textContent = '') {
    const el = document.createElement(tag);
    if (classes.length) el.className = classes.join(' ');
    for (const key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
    if (textContent) el.textContent = textContent;
    return el;
  }

  function renderLoadingState() {
    if (!_container) return;
    _container.innerHTML = '';
    _container.style.setProperty('background-color', 'var(--dash-surface, #fff)');
    _container.style.setProperty('color', 'var(--dash-text, #1a1a22)');
    _container.style.setProperty('border', '1px solid var(--dash-border, rgba(0,0,0,0.1))');
    _container.style.setProperty('border-radius', 'var(--dash-radius-lg, 14px)');
    _container.style.setProperty('padding', 'calc(2 * var(--dash-space-unit, 8px))');
    _container.style.setProperty('display', 'flex');
    _container.style.setProperty('flex-direction', 'column');
    _container.style.setProperty('gap', 'var(--dash-space-unit, 8px)');

    const title = createEl('h3', [], {}, "Today's MITs");
    title.style.setProperty('margin', '0');
    title.style.setProperty('font-size', '1.2em');
    _container.appendChild(title);

    const list = createEl('ul', [], { 'aria-label': 'Loading tasks' });
    list.style.setProperty('list-style', 'none');
    list.style.setProperty('padding', '0');
    list.style.setProperty('margin', '0');

    for (let i = 0; i < 3; i++) {
      const item = createEl('li', ['lifeos-mit-skeleton-item']);
      item.style.setProperty('display', 'flex');
      item.style.setProperty('align-items', 'center');
      item.style.setProperty('gap', 'var(--dash-space-unit, 8px)');
      item.style.setProperty('padding', 'calc(0.5 * var(--dash-space-unit, 8px)) 0');

      const checkbox = createEl('div', ['lifeos-mit-skeleton-checkbox']);
      checkbox.style.setProperty('width', '18px');
      checkbox.style.setProperty('height', '18px');
      checkbox.style.setProperty('border-radius', '4px');
      checkbox.style.setProperty('background-color', 'var(--dash-muted, #777788)');
      checkbox.style.setProperty('opacity', '0.7');
      item.appendChild(checkbox);

      const text = createEl('div', ['lifeos-mit-skeleton-text']);
      text.style.setProperty('flex-grow', '1');
      text.style.setProperty('height', '1em');
      text.style.setProperty('border-radius', '4px');
      text.style.setProperty('background-color', 'var(--dash-muted, #777788)');
      text.style.setProperty('opacity', '0.7');
      text.style.setProperty('width', `${70 + Math.random() * 20}%`); // Vary width
      item.appendChild(text);
      list.appendChild(item);
    }
    _container.appendChild(list);

    if (!_prefersReducedMotion) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes lifeos-skeleton-pulse {
          0% { opacity: 0.7; }
          50% { opacity: 0.4; }
          100% { opacity: 0.7; }
        }
        .lifeos-mit-skeleton-item div {
          animation: lifeos-skeleton-pulse 1.5s infinite ease-in-out;
        }
      `;
      _container.appendChild(style);
    }
  }

  function renderErrorState() {
    if (!_container) return;
    _container.innerHTML = '';
    _container.style.setProperty('background-color', 'var(--dash-surface, #fff)');
    _container.style.setProperty('color', 'var(--dash-text, #1a1a22)');
    _container.style.setProperty('border', '1px solid var(--dash-border, rgba(0,0,0,0.1))');
    _container.style.setProperty('border-radius', 'var(--dash-radius-lg, 14px)');
    _container.style.setProperty('padding', 'calc(2 * var(--dash-space-unit, 8px))');
    _container.style.setProperty('display', 'flex');
    _container.style.setProperty('flex-direction', 'column');
    _container.style.setProperty('gap', 'var(--dash-space-unit, 8px)');

    const title = createEl('h3', [], {}, "Today's MITs");
    title.style.setProperty('margin', '0');
    title.style.setProperty('font-size', '1.2em');
    _container.appendChild(title);

    const errorDiv = createEl('div', [], {}, 'Could not load tasks');
    errorDiv.style.setProperty('color', 'var(--dash-muted, #777788)');
    errorDiv.style.setProperty('text-align', 'center');
    errorDiv.style.setProperty('padding', 'calc(2 * var(--dash-space-unit, 8px)) 0');
    _container.appendChild(errorDiv);

    const retryButton = createEl('button', [], {}, 'Retry');
    retryButton.style.setProperty('background-color', 'var(--dash-accent, #5b6af5)');
    retryButton.style.setProperty('color', 'white');
    retryButton.style.setProperty('border', 'none');
    retryButton.style.setProperty('padding', 'calc(0.75 * var(--dash-space-unit, 8px)) calc(1.5 * var(--dash-space-unit, 8px))');
    retryButton.style.setProperty('border-radius', 'var(--dash-radius-lg, 14px)');
    retryButton.style.setProperty('cursor', 'pointer');
    retryButton.style.setProperty('font-size', '0.9em');
    retryButton.style.setProperty('align-self', 'center');
    retryButton.addEventListener('click', refresh);
    _container.appendChild(retryButton);
  }

  async function handleCheckboxChange(event) {
    const checkbox = event.target;
    const commitmentId = checkbox.dataset.id;
    const isChecked = checkbox.checked;

    const commandKey = getCommandKey();
    if (!commandKey) {
      console.error('Command key not available for completing task.');
      checkbox.checked = !isChecked; // Revert UI
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${commitmentId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${commandKey}`
        },
        body: JSON.stringify({ isComplete: isChecked })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Refresh the widget to show updated state and count
      refresh();
    } catch (error) {
      console.error('Failed to update commitment status:', error);
      checkbox.checked = !isChecked; // Revert UI on error
      alert('Failed to update task status. Please try again.');
    }
  }

  async function refresh() {
    if (!_container || !_user) {
      console.warn('Widget not mounted or user not set.');
      return;
    }

    renderLoadingState();

    const commandKey = getCommandKey();
    if (!commandKey) {
      console.error('Command key is missing. Cannot fetch commitments.');
      renderErrorState();
      return;
    }

    try {
      const url = `${API_BASE_URL}?user=${encodeURIComponent(_user)}&status=active&limit=5`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${commandKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const commitments = await response.json();
      renderCommitments(commitments);

    } catch (error) {
      console.error('Failed to fetch commitments:', error);
      renderErrorState();
    }
  }

  function renderCommitments(commitments) {
    if (!_container) return;
    _container.innerHTML = '';

    _container.style.setProperty('background-color', 'var(--dash-surface, #fff)');
    _container.style.setProperty('color', 'var(--dash-text, #1a1a22)');
    _container.style.setProperty('border', '1px solid var(--dash-border, rgba(0,0,0,0.1))');
    _container.style.setProperty('border-radius', 'var(--dash-radius-lg, 14px)');
    _container.style.setProperty('padding', 'calc(2 * var(--dash-space-unit, 8px))');
    _container.style.setProperty('display', 'flex');
    _container.style.setProperty('flex-direction', 'column');
    _container.style.setProperty('gap', 'var(--dash-space-unit, 8px)');

    const header = createEl('div', [], { 'style': 'display: flex; justify-content: space-between; align-items: center;' });
    const title = createEl('h3', [], {}, "Today's MITs");
    title.style.setProperty('margin', '0');
    title.style.setProperty('font-size', '1.2em');
    header.appendChild(title);

    const completedCount = commitments.filter(c => c.isComplete).length;
    const totalCount = commitments.length;
    const badge = createEl('span', ['lifeos-mit-badge'], {}, `${completedCount}/${totalCount}`);
    badge.style.setProperty('background-color', 'var(--dash-muted, #777788)');
    badge.style.setProperty('color', 'white');
    badge.style.setProperty('padding', 'calc(0.5 * var(--dash-space-unit, 8px)) calc(1 * var(--dash-space-unit, 8px))');
    badge.style.setProperty('border-radius', 'var(--dash-radius-lg, 14px)');
    badge.style.setProperty('font-size', '0.8em');
    header.appendChild(badge);
    _container.appendChild(header);

    if (commitments.length === 0) {
      const emptyState = createEl('p', [], {}, 'No MITs set — add one in Commitments');
      emptyState.style.setProperty('color', 'var(--dash-muted, #777788)');
      emptyState.style.setProperty('text-align', 'center');
      emptyState.style.setProperty('padding', 'calc(2 * var(--dash-space-unit, 8px)) 0');
      _container.appendChild(emptyState);
    } else {
      const list = createEl('ul', [], { 'aria-label': "Today's Most Important Tasks" });
      list.style.setProperty('list-style', 'none');
      list.style.setProperty('padding', '0');
      list.style.setProperty('margin', '0');

      commitments.forEach(commitment => {
        const listItem = createEl('li', ['lifeos-mit-item']);
        listItem.style.setProperty('display', 'flex');
        listItem.style.setProperty('align-items', 'center');
        listItem.style.setProperty('gap', 'var(--dash-space-unit, 8px)');
        listItem.style.setProperty('padding', 'calc(0.5 * var(--dash-space-unit, 8px)) 0');

        const checkbox = createEl('input', [], {
          type: 'checkbox',
          id: `mit-${commitment.id}`,
          'data-id': commitment.id,
          checked: commitment.isComplete
        });
        checkbox.style.setProperty('width', '18px');
        checkbox.style.setProperty('height', '18px');
        checkbox.style.setProperty('cursor', 'pointer');
        checkbox.style.setProperty('flex-shrink', '0');
        checkbox.addEventListener('change', handleCheckboxChange);
        listItem.appendChild(checkbox);

        const label = createEl('label', [], { htmlFor: `mit-${commitment.id}` }, commitment.title);
        label.style.setProperty('flex-grow', '1');
        label.style.setProperty('cursor', 'pointer');
        if (commitment.isComplete) {
          label.style.setProperty('text-decoration', 'line-through');
          label.style.setProperty('color', 'var(--dash-muted, #777788)');
        }
        listItem.appendChild(label);
        list.appendChild(listItem);
      });
      _container.appendChild(list);
    }
  }

  function mount({ container, user, commandKey }) {
    _container = container || document.getElementById(WIDGET_ID);
    if (!_container) {
      console.error(`Container element with id='${WIDGET_ID}' not found.`);
      return;
    }
    _user = user;
    _commandKey = commandKey;
    refresh();
  }

  window.LifeOSWidgetMIT = {
    mount,
    refresh
  };
})();