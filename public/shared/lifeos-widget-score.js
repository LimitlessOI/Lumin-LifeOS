(function(){
    const API_ENDPOINT = '/api/v1/lifeos/scorecard/today';
    const RING_RADIUS = 40;
    const RING_STROKE_WIDTH = 10;
    const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
    const VIEWBOX_SIZE = 100; // SVG viewBox="0 0 100 100"

    let _container = null;
    let _userHandle = null;
    let _commandKey = null;
    let _isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Helper to create SVG elements
    function createSvgElement(tag, attributes = {}) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const key in attributes) {
            el.setAttribute(key, attributes[key]);
        }
        return el;
    }

    // Helper to create HTML elements
    function createElement(tag, className = '', textContent = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent) el.textContent = textContent;
        return el;
    }

    function getRingColor(score, maxValue) {
        // Scale all scores to a 0-10 range for consistent color logic
        const scaledScore = (score / maxValue) * 10;
        if (scaledScore > 7) return 'var(--ring-color-green, #4CAF50)'; // Green
        if (scaledScore >= 4) return 'var(--ring-color-amber, #FFC107)'; // Amber
        return 'var(--ring-color-red, #F44336)'; // Red
    }

    function formatDate(dateString) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        try {
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (e) {
            return 'Invalid Date';
        }
    }

    function renderRing(score, metricName, maxValue, isLoading, isError) {
        const wrapper = createElement('div', 'lifeos-ring-wrapper');
        const svg = createSvgElement('svg', {
            viewBox: `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`,
            class: 'lifeos-ring-svg'
        });

        // Background circle (track)
        svg.appendChild(createSvgElement('circle', {
            cx: VIEWBOX_SIZE / 2,
            cy: VIEWBOX_SIZE / 2,
            r: RING_RADIUS,
            fill: 'none',
            stroke: 'var(--dash-border, #e0e0e0)',
            'stroke-width': RING_STROKE_WIDTH,
            class: 'lifeos-ring-track'
        }));

        const circle = createSvgElement('circle', {
            cx: VIEWBOX_SIZE / 2,
            cy: VIEWBOX_SIZE / 2,
            r: RING_RADIUS,
            fill: 'none',
            'stroke-width': RING_STROKE_WIDTH,
            'stroke-linecap': 'round',
            transform: `rotate(-90 ${VIEWBOX_SIZE / 2} ${VIEWBOX_SIZE / 2})`,
            class: 'lifeos-ring-progress'
        });

        const valueText = createSvgElement('text', {
            x: VIEWBOX_SIZE / 2,
            y: VIEWBOX_SIZE / 2,
            'text-anchor': 'middle',
            'dominant-baseline': 'middle',
            fill: 'var(--dash-text, #333)',
            'font-size': '1.5em',
            'font-weight': 'bold',
            class: 'lifeos-ring-value'
        });

        const metricText = createElement('div', 'lifeos-ring-metric', metricName);

        if (isLoading) {
            circle.setAttribute('stroke', 'var(--dash-muted, #ccc)');
            circle.setAttribute('stroke-dasharray', `${CIRCUMFERENCE * 0.7} ${CIRCUMFERENCE * 0.3}`);
            if (!_isReducedMotion) {
                circle.classList.add('lifeos-ring-loading');
            }
            valueText.textContent = '...';
        } else if (isError || score === null || score === undefined) {
            circle.setAttribute('stroke', 'var(--dash-muted, #ccc)');
            circle.setAttribute('stroke-dasharray', `${CIRCUMFERENCE * 0.1} ${CIRCUMFERENCE * 0.9}`); // Small segment for error
            valueText.textContent = '—';
        } else {
            const normalizedScore = Math.max(0, Math.min(1, score / maxValue)); // Ensure score is between 0 and maxValue
            const dashoffset = CIRCUMFERENCE * (1 - normalizedScore);
            circle.setAttribute('stroke', getRingColor(score, maxValue));
            circle.setAttribute('stroke-dasharray', `${CIRCUMFERENCE} ${CIRCUMFERENCE}`);
            circle.setAttribute('stroke-dashoffset', CIRCUMFERENCE); // Start full, animate to actual
            if (!_isReducedMotion) {
                circle.style.transition = 'stroke-dashoffset 1s ease-out';
            }
            // Trigger reflow to ensure transition works from initial state
            requestAnimationFrame(() => {
                circle.setAttribute('stroke-dashoffset', dashoffset);
            });
            valueText.textContent = score.toFixed(1); // Display score with one decimal
        }

        svg.appendChild(circle);
        svg.appendChild(valueText);
        wrapper.appendChild(svg);
        wrapper.appendChild(metricText);
        return wrapper;
    }

    function renderWidget(data, isLoading = false, isError = false) {
        if (!_container) return;

        _container.innerHTML = ''; // Clear previous content

        const widgetContent = createElement('div', 'lifeos-score-widget-content');

        const dateHeading = createElement('h3', 'lifeos-score-date');
        if (isLoading) {
            dateHeading.classList.add('lifeos-shimmer');
            dateHeading.textContent = 'Loading Date...';
        } else if (isError) {
            dateHeading.textContent = 'Error Loading Data';
        } else {
            dateHeading.textContent = data && data.date ? formatDate(data.date) : 'No Data';
        }
        widgetContent.appendChild(dateHeading);

        const ringsContainer = createElement('div', 'lifeos-rings-container');

        const joyScore = data?.joy_score;
        const integrityScore = data?.integrity_score;
        const energyLevel = data?.energy_level; // 0-5 scale

        ringsContainer.appendChild(renderRing(joyScore, 'Joy Score', 10, isLoading, isError));
        ringsContainer.appendChild(renderRing(integrityScore, 'Integrity Score', 10, isLoading, isError));
        ringsContainer.appendChild(renderRing(energyLevel, 'Energy Level', 5, isLoading, isError)); // Max value 5 for energy

        widgetContent.appendChild(ringsContainer);
        _container.appendChild(widgetContent);
    }

    async function fetchAndRender() {
        if (!_userHandle || !_commandKey) {
            console.error('LifeOSWidgetScore: User handle or command key not set.');
            renderWidget(null, false, true); // Render error state
            return;
        }

        renderWidget(null, true, false); // Render loading state

        try {
            const response = await fetch(`${API_ENDPOINT}?user=${_userHandle}`, {
                headers: {
                    'Authorization': `Bearer ${_commandKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            renderWidget(data, false, false); // Render actual data
        } catch (error) {
            console.error('LifeOSWidgetScore: Failed to fetch scorecard data:', error);
            renderWidget(null, false, true); // Render error state
        }
    }

    function mount({ container, user, commandKey }) {
        _container = container || document.getElementById('lifeos-widget-score');
        if (!_container) {
            console.error('LifeOSWidgetScore: Container element not found.');
            return;
        }

        _userHandle = user;
        _commandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

        // Inject basic styles for the widget if not already present
        if (!document.getElementById('lifeos-score-widget-styles')) {
            const style = createElement('style', '', `
                .lifeos-score-widget-content {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
                    text-align: center;
                    padding: var(--dash-space-unit, 8px);
                    background: var(--dash-surface, #fff);
                    color: var(--dash-text, #333);
                    border-radius: var(--dash-radius-lg, 14px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .lifeos-score-date {
                    margin-top: 0;
                    margin-bottom: var(--dash-space-unit, 8px);
                    color: var(--dash-muted, #777);
                    font-size: 0.9em;
                    min-height: 1.2em; /* Ensure height for shimmer */
                    width: 80%; /* For shimmer effect */
                }
                .lifeos-rings-container {
                    display: flex;
                    justify-content: space-around;
                    gap: var(--dash-space-unit, 8px);
                    flex-wrap: wrap;
                    width: 100%;
                    max-width: 350px; /* Limit width for better layout */
                }
                .lifeos-ring-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: var(--dash-space-unit, 8px);
                    flex: 1 1 30%; /* Allow rings to wrap */
                    min-width: 100px;
                }
                .lifeos-ring-svg {
                    width: 100px;
                    height: 100px;
                    margin-bottom: 5px;
                }
                .lifeos-ring-progress {
                    transition: stroke-dashoffset 1s ease-out; /* Default transition */
                }
                .lifeos-ring-loading {
                    animation: dash-shimmer 1.5s infinite linear;
                }
                .lifeos-shimmer {
                    background: linear-gradient(to right, var(--dash-surface, #fff) 8%, var(--dash-border, #eee) 18%, var(--dash-surface, #fff) 33%);
                    background-size: 800px 100px;
                    animation: shimmer 1.5s infinite linear;
                    color: transparent; /* Hide text during shimmer */
                    border-radius: 4px;
                }
                .lifeos-shimmer::before {
                    content: '\\00a0'; /* Non-breaking space to ensure height */
                }
                @keyframes shimmer {
                    0% { background-position: -800px 0; }
                    100% { background-position: 800px 0; }
                }
                @keyframes dash-shimmer {
                    0% { stroke-dashoffset: ${CIRCUMFERENCE * 0.7}; }
                    50% { stroke-dashoffset: ${CIRCUMFERENCE * 0.3}; }
                    100% { stroke-dashoffset: ${CIRCUMFERENCE * 0.7}; }
                }
                /* Define default ring colors if not provided by CSS vars */
                :root {
                    --ring-color-green: #4CAF50;
                    --ring-color-amber: #FFC107;
                    --ring-color-red: #F44336;
                }
            `);
            style.id = 'lifeos-score-widget-styles';
            document.head.appendChild(style);
        }

        fetchAndRender();
    }

    function refresh() {
        fetchAndRender();
    }

    window.LifeOSWidgetScore = {
        mount,
        refresh
    };
})();