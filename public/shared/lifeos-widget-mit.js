(function(){
    const API_BASE = '/api/v1/lifeos/commitments';
    let currentContainer = null;
    let currentUser = null;
    let currentCommandKey = null;
    let isLoading = false;
    let tasks = [];
    let hasError = false;

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    function render() {
        if (!currentContainer) return;

        currentContainer.innerHTML = ''; // Clear previous content

        const widgetWrapper = createEl('div', ['lifeos-mit-widget']);
        widgetWrapper.style.backgroundColor = 'var(--dash-surface)';
        widgetWrapper.style.color = 'var(--dash-text)';
        widgetWrapper.style.border = '1px solid var(--dash-border)';
        widgetWrapper.style.borderRadius = 'var(--dash-radius-lg)';
        widgetWrapper.style.padding = 'calc(2 * var(--dash-space-unit))';
        widgetWrapper.style.display = 'flex';
        widgetWrapper.style.flexDirection = 'column';
        widgetWrapper.style.gap = 'var(--dash-space-unit)';
        widgetWrapper.style.fontFamily = 'sans-serif'; // Basic font for consistency

        if (prefersReducedMotion()) {
            widgetWrapper.style.transition = 'none';
        }

        const header = createEl('div', ['lifeos-mit-header']);
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = 'var(--dash-space-unit)';

        const title = createEl('h3', [], {}, "Today's MITs");
        title.style.margin = '0';
        title.style.fontSize = '1.1em';

        header.appendChild(title);

        if (!isLoading && !hasError && tasks.length > 0) {
            const completedCount = tasks.filter(t => t.isComplete).length;
            const totalCount = tasks.length;
            const badge = createEl('span', ['lifeos-mit-badge'], {}, `${completedCount}/${totalCount}`);
            badge.style.backgroundColor = 'var(--dash-accent)'; // Using --dash-accent for --c-today
            badge.style.color = 'var(--dash-text)';
            badge.style.padding = '2px 8px';
            badge.style.borderRadius = '10px';
            badge.style.fontSize = '0.8em';
            header.appendChild(badge);
        }
        widgetWrapper.appendChild(header);

        if (isLoading) {
            const loadingState = createEl('div', ['lifeos-mit-loading']);
            loadingState.style.display = 'flex';
            loadingState.style.flexDirection = 'column';
            loadingState.style.gap = 'var(--dash-space-unit)';
            for (let i = 0; i < 3; i++) { // Skeleton rows
                const skeleton = createEl('div', ['lifeos-mit-skeleton']);
                skeleton.style.height = '1.2em';
                skeleton.style.backgroundColor = 'var(--dash-muted)';
                skeleton.style.borderRadius = '4px';
                skeleton.style.opacity = '0.7';
                skeleton.style.width = `${80 + Math.random() * 20}%`; // Vary width
                skeleton.style.animation = prefersReducedMotion() ? 'none' : 'pulse 1.5s infinite ease-in-out';
                loadingState.appendChild(skeleton);
            }
            // Add pulse animation if not reduced motion
            if (!prefersReducedMotion()) {
                const styleEl = document.createElement('style');
                styleEl.textContent = `
                    @keyframes pulse {
                        0% { opacity: 0.7; }
                        50% { opacity: 0.4; }
                        100% { opacity: 0.7; }
                    }
                `;
                document.head.appendChild(styleEl);
            }
            widgetWrapper.appendChild(loadingState);
        } else if (hasError) {
            const errorState = createEl('div', ['lifeos-mit-error']);
            errorState.style.textAlign = 'center';
            errorState.style.padding = 'var(--dash-space-unit)';
            errorState.style.color = 'var(--dash-text)';

            const errorMessage = createEl('p', [], {}, 'Could not load tasks');
            errorMessage.style.margin = '0 0 var(--dash-space-unit) 0';
            errorState.appendChild(errorMessage);

            const retryButton = createEl('button', ['lifeos-mit-retry']);
            retryButton.textContent = 'Retry';
            retryButton.style.backgroundColor = 'var(--dash-accent)';
            retryButton.style.color = 'var(--dash-text)';
            retryButton.style.border = 'none';
            retryButton.style.padding = '8px 16px';
            retryButton.style.borderRadius = 'var(--dash-radius-lg)';
            retryButton.style.cursor = 'pointer';
            retryButton.style.fontSize = '0.9em';
            retryButton.addEventListener('click', refresh);
            errorState.appendChild(retryButton);
            widgetWrapper.appendChild(errorState);
        } else if (tasks.length === 0) {
            const emptyState = createEl('div', ['lifeos-mit-empty']);
            emptyState.style.textAlign = 'center';
            emptyState.style.padding = 'var(--dash-space-unit)';
            emptyState.style.color = 'var(--dash-muted)';
            emptyState.textContent = 'No MITs set — add one in Commitments';
            widgetWrapper.appendChild(emptyState);
        } else {
            const taskList = createEl('ul', ['lifeos-mit-list']);
            taskList.style.listStyle = 'none';
            taskList.style.padding = '0';
            taskList.style.margin = '0';
            taskList.style.display = 'flex';
            taskList.style.flexDirection = 'column';
            taskList.style.gap = 'var(--dash-space-unit)';

            tasks.forEach(task => {
                const listItem = createEl('li', ['lifeos-mit-item']);
                listItem.style.display = 'flex';
                listItem.style.alignItems = 'center';
                listItem.style.gap = 'var(--dash-space-unit)';

                const checkbox = createEl('input', ['lifeos-mit-checkbox'], { type: 'checkbox', id: `mit-task-${task.id}` });
                checkbox.checked = task.isComplete;
                checkbox.style.width = '18px';
                checkbox.style.height = '18px';
                checkbox.style.cursor = 'pointer';
                checkbox.style.accentColor = 'var(--dash-accent)'; // Use accent color for checkbox

                checkbox.addEventListener('change', async (e) => {
                    const originalChecked = !e.target.checked;
                    e.target.disabled = true;
                    try {
                        await completeTask(task.id, e.target.checked);
                        task.isComplete = e.target.checked;
                        render();
                    } catch (err) {
                        console.error('Failed to update task completion status:', err);
                        e.target.checked = originalChecked;
                        alert('Failed to update task. Please try again.');
                    } finally {
                        e.target.disabled = false;
                    }
                });

                const label = createEl('label', ['lifeos-mit-label'], { htmlFor: `mit-task-${task.id}` }, task.title);
                label.style.flexGrow = '1';
                label.style.cursor = 'pointer';
                if (task.isComplete) {
                    label.style.textDecoration = 'line-through';
                    label.style.color = 'var(--dash-muted)';
                } else {
                    label.style.textDecoration = 'none';
                    label.style.color = 'var(--dash-text)';
                }

                listItem.appendChild(checkbox);
                listItem.appendChild(label);
                taskList.appendChild(listItem);
            });
            widgetWrapper.appendChild(taskList);
        }

        currentContainer.appendChild(widgetWrapper);
    }

    async function fetchTasks() {
        if (!currentUser || !currentCommandKey) {
            console.warn('User or commandKey not set for MIT widget. Cannot fetch tasks.');
            hasError = true;
            isLoading = false;
            render();
            return;
        }

        isLoading = true;
        hasError = false;
        render(); // Show loading state

        try {
            const url = `${API_BASE}?user=${encodeURIComponent(currentUser)}&status=active&limit=5`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${currentCommandKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            tasks = data.map(task => ({
                id: task.id,
                title: task.title,
                isComplete: task.isComplete || false
            }));
            hasError = false;
        } catch (error) {
            console.error('Error fetching MITs:', error);
            hasError = true;
            tasks = [];
        } finally {
            isLoading = false;
            render();
        }
    }

    async function completeTask(taskId, isComplete) {
        if (!currentUser || !currentCommandKey) {
            throw new Error('User or commandKey not set for MIT widget. Cannot complete task.');
        }

        const url = `${API_BASE}/${taskId}/complete`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentCommandKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isComplete })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    }

    function mount({ container, user, commandKey }) {
        if (!container || !(container instanceof HTMLElement)) {
            console.error('Invalid container element provided to LifeOSWidgetMIT.mount');
            return;
        }
        currentContainer = container;
        currentUser = user;
        currentCommandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

        if (!currentCommandKey) {
            console.warn('commandKey not found. Widget may not function correctly without authentication.');
        }

        refresh(); // Initial fetch and render
    }

    function refresh() {
        fetchTasks();
    }

    window.LifeOSWidgetMIT = {
        mount,
        refresh
    };
})();