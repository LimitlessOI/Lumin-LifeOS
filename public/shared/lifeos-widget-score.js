(function(){
    const API_BASE_URL = '/api/v1/lifeos/scorecard/today';
    const RING_RADIUS = 40;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
    const VIEWBOX_SIZE = 100;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Helper to create SVG elements
    function createSvgElement(tag, attributes = {}) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const key in attributes) {
            el.setAttribute(key, attributes[key]);
        }
        return el;
    }

    // Helper to create a single ring gauge
    function createRingGauge(metricName, score, maxScore, isLoading, isError) {
        const wrapper = document.createElement('div');
        wrapper.className = 'lifeos-score-ring-wrapper';

        const svg = createSvgElement('svg', {
            viewBox: `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`,
            class: 'lifeos-score-ring-svg'
        });

        // Background track
        svg.appendChild(createSvgElement('circle', {
            cx: VIEWBOX_SIZE / 2,
            cy: VIEWBOX_SIZE / 2,
            r: RING_RADIUS,
            fill: 'none',
            stroke: 'var(--dash-border)',
            'stroke-width': '8'
        }));

        let displayScore = isError ? '—' : (score !== null ? score.toFixed(0) : '');
        let strokeColor = 'var(--dash-muted)'; // Default for loading/error

        if (!isLoading && !isError && score !== null) {
            if (score > 7) {
                strokeColor = 'var(--lifeos-color-green, #4CAF50)'; // Green fallback
            } else if (score >= 4) {
                strokeColor = 'var(--lifeos-color-amber, #FFC107)'; // Amber fallback
            } else {
                strokeColor = 'var(--lifeos-color-red, #F44336)'; // Red fallback
            }
        } else if (isError) {
            strokeColor = 'var(--dash-muted)'; // Grey for error
        }

        const progressCircle = createSvgElement('circle', {
            cx: VIEWBOX_SIZE / 2,
            cy: VIEWBOX_SIZE / 2,
            r: RING_RADIUS,
            fill: 'none',
            stroke: strokeColor,
            'stroke-width': '8',
            'stroke-linecap': 'round',
            transform: `rotate(-90 ${VIEWBOX_SIZE / 2} ${VIEWBOX_SIZE / 2})`
        });

        if (!isLoading && !isError && score !== null) {
            const progress = Math.min(Math.max(score / maxScore, 0), 1);
            const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
            progressCircle.setAttribute('stroke-dasharray', `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`);
            progressCircle.setAttribute('stroke-dashoffset', dashOffset);
            if (!prefersReducedMotion) {
                progressCircle.style.transition = 'stroke-dashoffset 0.8s ease-out';
            }
        } else if (isLoading) {
            progressCircle.setAttribute('stroke-dasharray', `${RING_CIRCUMFERENCE * 0.3} ${RING_CIRCUMFERENCE * 0.7}`);
            progressCircle.setAttribute('stroke-dashoffset', 0); // Start at 0 for animation
            if (!prefersReducedMotion) {
                progressCircle.style.animation = `lifeos-shimmer 1.5s infinite linear`;
            }
        } else if (isError) {
             progressCircle.setAttribute('stroke-dasharray', `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`);
             progressCircle.setAttribute('stroke-dashoffset', 0); // Full grey circle
        }

        svg.appendChild(progressCircle);

        // Value label
        const valueText = createSvgElement('text', {
            x: VIEWBOX_SIZE / 2,
            y: VIEWBOX_SIZE / 2 + 5, // Adjust for vertical centering
            'text-anchor': 'middle',
            'dominant-baseline': 'middle',
            fill: 'var(--dash-text)',
            'font-size': '24px',
            'font-weight': 'bold',
            class: 'lifeos-score-value'
        });
        valueText.textContent = displayScore;
        svg.appendChild(valueText);

        wrapper.appendChild(svg);

        // Metric name below
        const nameLabel = document.createElement('div');
        nameLabel.className = 'lifeos-score-metric-name';
        nameLabel.textContent = metricName.replace('_score', '').replace('_level', '').replace(/_/g, ' ');
        wrapper.appendChild(nameLabel);

        return wrapper;
    }

    // Main widget rendering function
    function renderWidget(container, data, isLoading, isError) {
        container.innerHTML = ''; // Clear previous content
        container.classList.toggle('lifeos-widget-loading', isLoading);
        container.classList.toggle('lifeos-widget-error', isError);

        const widgetContent = document.createElement('div');
        widgetContent.className = 'lifeos-score-widget-content';

        // Date heading
        const dateHeading = document.createElement('h3');
        dateHeading.className = 'lifeos-score-date-heading';
        dateHeading.textContent = isLoading ? 'Loading...' : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        widgetContent.appendChild(dateHeading);

        const ringsContainer = document.createElement('div');
        ringsContainer.className = 'lifeos-score-rings-container';

        const scores = [
            { name: 'joy_score', value: data?.joy_score, max: 10 },
            { name: 'integrity_score', value: data?.integrity_score, max: 10 },
            { name: 'energy_level', value: data?.energy_level ? data.energy_level * 2 : null, max: 10 } // Scale 0-5 to 0-10
        ];

        scores.forEach(s => {
            ringsContainer.appendChild(createRingGauge(s.name, s.value, s.max, isLoading, isError));
        });

        widgetContent.appendChild(ringsContainer);
        container.appendChild(widgetContent);

        // Inject basic styles if not already present (for shimmer and layout)
        if (!document.getElementById('lifeos-score-widget-styles')) {
            const style = document.createElement('style');
            style.id = 'lifeos-score-widget-styles';
            style.textContent = `
                .lifeos-score-widget-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: calc(2 * var(--dash-space-unit));
                    padding: calc(4 * var(--dash-space-unit));
                    background: var(--dash-surface);
                    border: 1px solid var(--dash-border);
                    border-radius: var(--dash-radius-lg);
                    color: var(--dash-text);
                    font-family: sans-serif;
                }
                .lifeos-score-date-heading {
                    margin: 0;
                    font-size: 1.2em;
                    color: var(--dash-text);
                }
                .lifeos-score-rings-container {
                    display: flex;
                    gap: calc(4 * var(--dash-space-unit));
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .lifeos-score-ring-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100px; /* Fixed width for each ring */
                    text-align: center;
                }
                .lifeos-score-ring-svg {
                    width: 100%;
                    height: auto;
                }
                .lifeos-score-metric-name {
                    margin-top: calc(1 * var(--dash-space-unit));
                    font-size: 0.8em;
                    color: var(--dash-muted);
                    text-transform: capitalize;
                }
                /* Shimmer animation */
                @keyframes lifeos-shimmer {
                    0% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: ${RING_CIRCUMFERENCE}; }
                }
                .lifeos-widget-loading .lifeos-score-value {
                    opacity: 0.5;
                }
                .lifeos-widget-loading .lifeos-score-metric-name {
                    opacity: 0.5;
                }
                /* Custom colors for scores */
                :root {
                    --lifeos-color-green: #4CAF50;
                    --lifeos-color-amber: #FFC107;
                    --lifeos-color-red: #F44336;
                }
            `;
            document.head.appendChild(style);
        }
    }

    let _container = null;
    let _user = null;
    let _commandKey = null;

    async function refresh() {
        if (!_container || !_user) {
            console.warn('LifeOSWidgetScore: Widget not mounted or user not provided.');
            return;
        }

        renderWidget(_container, null, true, false); // Show loading state

        try {
            const finalCommandKey = _commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');
            if (!finalCommandKey) {
                throw new Error('Command key not found. Cannot fetch scorecard.');
            }

            const response = await fetch(`${API_BASE_URL}?user=${_user}`, {
                headers: {
                    'Authorization': `Bearer ${finalCommandKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            renderWidget(_container, data, false, false); // Show data
        } catch (error) {
            console.error('LifeOSWidgetScore: Failed to fetch scorecard data:', error);
            renderWidget(_container, null, false, true); // Show error state
        }
    }

    function mount({ container, user, commandKey }) {
        if (!container || !user) {
            console.error('LifeOSWidgetScore: mount requires a container element and a user handle.');
            return;
        }
        _container = container;
        _user = user;
        _commandKey = commandKey; // Prioritize explicit commandKey from mount options

        refresh(); // Initial data fetch and render
    }

    // Expose to global scope
    window.LifeOSWidgetScore = {
        mount,
        refresh
    };

})();