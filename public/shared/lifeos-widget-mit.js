(function(){
    // Private variables and functions
    let _container = null;
    let _user = null;
    let _commandKey = null;
    let _tasks = []; // Stores tasks fetched from API, initially all 'active'
    let _isLoading = false;
    let _hasError = false;

    const API_BASE_URL = '/api/v1/lifeos/commitments';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; // Not directly used for animations, but good practice to check.

    // Helper to create DOM elements
    function createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        for (const key in attributes) {
            if (key === 'style') {
                Object.assign(element.style, attributes[key]);
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, attributes[key]);
            } else {
                element[key] = attributes[key];
            }
        }
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        return element;
    }

    // Render function
    function render() {
        if (!_container) return;

        _container.innerHTML = ''; // Clear existing content

        // Widget wrapper styles
        const widgetWrapper = createElement('div', {
            style: {
                backgroundColor: 'var(--dash-surface)',
                color: 'var(--dash-text)',
                border: '1px solid var(--dash-border)',
                borderRadius: 'var(--dash-radius-lg)',
                padding: `calc(2 * var(--dash-space-unit))`,
                fontFamily: 'sans-serif', // Basic fallback
                boxSizing: 'border-box'
            }
        });

        // Header
        const completedCount = _tasks.filter(t => t.status === 'complete').length;
        const totalCount = _tasks.length;

        const header = createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: `var(--dash-space-unit)`
            }
        }, [
            createElement('h3', {
                style: {
                    margin: '0',
                    color: 'var(--dash-accent)'
                }
            }, ['Today\'s MITs']),
            createElement('span', {
                id: 'mit-count',
                style: {
                    backgroundColor: 'var(--dash-border)',
                    padding: `calc(0.5 * var(--dash-space-unit)) calc(1 * var(--dash-space-unit))`,
                    borderRadius: `calc(2 * var(--dash-space-unit))`,
                    fontSize: '0.8em'
                }
            }, [`${completedCount}/${totalCount}`])
        ]);
        widgetWrapper.appendChild(header);

        const contentArea = createElement('div', { id: 'mit-content' });
        widgetWrapper.appendChild(contentArea);

        if (_isLoading) {
            // Loading state (skeleton rows)
            for (let i = 0; i < 3; i++) {
                contentArea.appendChild(createElement('div', {
                    className: 'mit-skeleton-item',
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: `var(--dash-space-unit)`,
                        opacity: '0.7'
                    }
                }, [
                    createElement('input', { type: 'checkbox', disabled: true, style: { marginRight: `var(--dash-space-unit)` } }),
                    createElement('div', {
                        style: {
                            backgroundColor: 'var(--dash-border)',
                            height: '1em',
                            width: '80%',
                            borderRadius: `calc(0.5 * var(--dash-space-unit))`
                        }
                    })
                ]));
            }
        } else if (_hasError) {
            // Error state
            const retryButton = createElement('button', {
                id: 'mit-retry-button',
                style: {
                    backgroundColor: 'var(--dash-accent)',
                    color: 'var(--dash-text)',
                    border: 'none',
                    padding: `calc(1 * var(--dash-space-unit)) calc(2 * var(--dash-space-unit))`,
                    borderRadius: `calc(1 * var(--dash-space-unit))`,
                    cursor: 'pointer',
                    marginTop: `var(--dash-space-unit)`
                }
            }, ['Retry']);
            retryButton.addEventListener('click', fetchTasks);

            contentArea.appendChild(createElement('div', {
                style: { textAlign: 'center', padding: `var(--dash-space-unit)` }
            }, [
                createElement('p', {}, ['Could not load tasks']),
                retryButton
            ]));
        } else if (_tasks.length === 0) {
            // Empty state
            contentArea.appendChild(createElement('div', {
                style: { textAlign: 'center', padding: `var(--dash-space-unit)` }
            }, [
                createElement('p', {}, ['No MITs set — add one in Commitments'])
            ]));
        } else {
            // Task list
            const ul = createElement('ul', {
                style: { listStyle: 'none', padding: '0', margin: '0' }
            });
            _tasks.forEach(task => {
                const isComplete = task.status === 'complete';
                const li = createElement('li', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: `var(--dash-space-unit)`
                    }
                }, [
                    createElement('input', {
                        type: 'checkbox',
                        checked: isComplete,
                        'data-id': task.id,
                        id: `mit-task-${task.id}`, // Unique ID for checkbox
                        style: { marginRight: `var(--dash-space-unit)` }
                    }),
                    createElement('label', {
                        htmlFor: `mit-task-${task.id}`, // Associate label with checkbox
                        style: {
                            textDecoration: isComplete ? 'line-through' : 'none',
                            color: isComplete ? 'var(--dash-muted)' : 'var(--dash-text)',
                            flexGrow: '1', // Allow label to take available space
                            cursor: 'pointer' // Indicate it's clickable
                        }
                    }, [task.title])
                ]);
                li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => handleCheckboxChange(e, task.id));
                ul.appendChild(li);
            });
            contentArea.appendChild(ul);
        }

        _container.appendChild(widgetWrapper);
    }

    // Fetch tasks from API
    async function fetchTasks() {
        if (!_user) {
            console.error('LifeOSWidgetMIT: User handle not set.');
            _hasError = true;
            render();
            return;
        }

        _isLoading = true;
        _hasError = false;
        render(); // Show loading state

        try {
            // Always fetch active tasks as per spec
            const url = `${API_BASE_URL}?user=${_user}&status=active&limit=5`;
            const headers = { 'Content-Type': 'application/json' };
            if (_commandKey) {
                headers['X-Command-Key'] = _commandKey;
            }

            const response = await fetch(url, { headers });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Assuming data is an array of tasks, each with id, title, status.
            // All tasks fetched here are 'active' by definition of the query.
            _tasks = data.map(task => ({
                id: task.id,
                title: task.title,
                status: 'active' // API returns active, so initially all are active
            }));
            _hasError = false;
        } catch (error) {
            console.error('LifeOSWidgetMIT: Failed to fetch tasks:', error);
            _hasError = true;
            _tasks = []; // Clear tasks on error
        } finally {
            _isLoading = false;
            render(); // Render with fetched data or error
        }
    }

    // Handle checkbox change
    async function handleCheckboxChange(event, taskId) {
        const isChecked = event.target.checked;
        
        // Optimistically update UI
        const taskIndex = _tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            _tasks[taskIndex].status = isChecked ? 'complete' : 'active';
            render();
        }

        try {
            const url = `${API_BASE_URL}/${taskId}/complete`;
            const headers = { 'Content-Type': 'application/json' };
            if (_commandKey) {
                headers['X-Command-Key'] = _commandKey;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // If successful, the task is now complete. Re-fetch to get the updated list of active* tasks.
            // This will remove the just-completed task from the list.
            await fetchTasks();

        } catch (error) {
            console.error(`LifeOSWidgetMIT: Failed to update task ${taskId}:`, error);
            _hasError = true;
            // Revert optimistic update on failure
            if (taskIndex > -1) {
                _tasks[taskIndex].status = isChecked ? 'active' : 'complete'; // Revert
            }
            render(); // Show error and reverted state
        }
    }

    // Public API
    const LifeOSWidgetMIT = {
        mount: function({ container, user, commandKey }) {
            _container = container || document.getElementById('lifeos-widget-mit');
            if (!_container) {
                console.error('LifeOSWidgetMIT: Container element not found.');
                return;
            }
            _user = user;
            // Prioritize argument, then window, then localStorage
            _commandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

            fetchTasks();
        },
        refresh: function() {
            fetchTasks();
        }
    };

    // Expose to global scope
    window.LifeOSWidgetMIT = LifeOSWidgetMIT;

})();