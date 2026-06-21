/**
 * SYNOPSIS: js — public/shared/lifeos-widget-score.js.
 */
(function(){
    const API_ENDPOINT = '/api/v1/lifeos/scorecard/today';
    const WIDGET_ID = 'lifeos-widget-score';

    let _container = null;
    let _user = null;
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

    // Helper to get score color
    function getScoreColor(score, metricName) {
        if (score === null || score === undefined) {
            return 'var(--dash-muted)'; // Error state color
        }
        // Energy level is 0-5, scaled to 0-10 for color logic
        const effectiveScore = metricName === 'Energy Level' ? score * 2 : score;

        if (effectiveScore > 7) {
            return 'hsl(120, 70%, 45%)'; // Green
        } else if (effectiveScore >= 4) {
            return 'hsl(40, 90%, 55%)'; // Amber
        } else {
            return 'hsl(0, 70%, 55%)'; // Red
        }
    }

    function renderRing(score, maxScore, metricName, isLoading, isError) {
        const radius = 40;
        const circumference = 2 * Math.PI * radius;
        const strokeWidth = 8;

        const svg = createSvgElement('svg', {
            viewBox: '0 0 100 100',
            class: 'score-ring-svg'
        });

        // Background circle
        svg.appendChild(createSvgElement('circle', {
            cx: 50,
            cy: 50,
            r: radius,
            fill: 'none',
            stroke: 'var(--dash-border)',
            'stroke-width': strokeWidth
        }));

        const scoreValue = isError ? '—' : (score !== null && score !== undefined ? score.toFixed(1) : '—');
        const displayScore = isError ? 0 : (score !== null && score !== undefined ? Math.min(score, maxScore) : 0);
        const dashOffset = circumference - (displayScore / maxScore) * circumference;
        const color = getScoreColor(score, metricName);

        const foregroundCircle = createSvgElement('circle', {
            cx: 50,
            cy: 50,
            r: radius,
            fill: 'none',
            stroke: color,
            'stroke-width': strokeWidth,
            'stroke-dasharray': `${circumference} ${circumference}`,
            'stroke-dashoffset': isLoading && !_isReducedMotion ? circumference : dashOffset, // Start at full for loading animation
            transform: 'rotate(-90 50 50)',
            class: isLoading && !_isReducedMotion ? 'score-ring-loading' : ''
        });
        svg.appendChild(foregroundCircle);

        // Value text
        svg.appendChild(createSvgElement('text', {
            x: 50,
            y: 50,
            'text-anchor': 'middle',
            'dominant-baseline': 'middle',
            fill: 'var(--dash-text)',
            'font-size': '20px',
            'font-weight': 'bold',
            class: 'score-value'
        })).textContent = scoreValue;

        const wrapper = document.createElement('div');
        wrapper.className = 'score-ring-wrapper';
        wrapper.appendChild(svg);

        const metricNameEl = document.createElement('div');
        metricNameEl.className = 'metric-name';
        metricNameEl.textContent = metricName;
        metricNameEl.style.color = 'var(--dash-muted)';
        metricNameEl.style.fontSize = '12px';
        metricNameEl.style.marginTop = '4px';
        wrapper.appendChild(metricNameEl);

        return wrapper;
    }

    function renderLoadingState(container) {
        container.innerHTML = `
            <style>
                .lifeos-score-widget {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: var(--dash-space-unit);
                    background-color: var(--dash-surface);
                    border-radius: var(--dash-radius-lg);
                    border: 1px solid var(--dash-border);
                    color: var(--dash-text);
                    font-family: sans-serif;
                    min-width: 200px; /* Ensure it has some width for shimmer */
                }
                .lifeos-score-widget h3 {
                    margin: 0 0 var(--dash-space-unit) 0;
                    font-size: 16px;
                    color: var(--dash-text);
                }
                .score-rings-container {
                    display: flex;
                    gap: var(--dash-space-unit);
                    justify-content: center;
                    width: 100%;
                }
                .score-ring-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex: 1;
                    min-width: 80px; /* Prevent rings from collapsing too much */
                }
                .score-ring-svg {
                    width: 80px;
                    height: 80px;
                }
                .shimmer-loading {
                    background: linear-gradient(to right, var(--dash-surface) 8%, var(--dash-muted) 18%, var(--dash-surface) 33%);
                    background-size: 800px 100%;
                    animation: shimmer 1.5s infinite linear;
                    border-radius: 4px;
                    overflow: hidden; /* Hide gradient overflow */
                }
                .shimmer-loading.text {
                    height: 1em;
                    width: 70%;
                    margin-bottom: var(--dash-space-unit);
                }
                .shimmer-loading.ring-svg {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                }
                .shimmer-loading.metric-name {
                    height: 1em;
                    width: 50%;
                    margin-top: 4px;
                }
                @keyframes shimmer {
                    0% { background-position: -800px 0; }
                    100% { background-position: 800px 0; }
                }
                .score-ring-loading {
                    transition: stroke-dashoffset 1s ease-out;
                }
                @media (prefers-reduced-motion: reduce) {
                    .score-ring-loading {
                        transition: none;
                    }
                    .shimmer-loading {
                        animation: none;
                        background: var(--dash-muted);
                    }
                }
            </style>
            <div class="lifeos-score-widget">
                <h3 class="shimmer-loading text"></h3>
                <div class="score-rings-container">
                    <div class="score-ring-wrapper">
                        <div class="shimmer-loading ring-svg"></div>
                        <div class="shimmer-loading metric-name"></div>
                    </div>
                    <div class="score-ring-wrapper">
                        <div class="shimmer-loading ring-svg"></div>
                        <div class="shimmer-loading metric-name"></div>
                    </div>
                    <div class="score-ring-wrapper">
                        <div class="shimmer-loading ring-svg"></div>
                        <div class="shimmer-loading metric-name"></div>
                    </div>
                </div>
            </div>
        `;
    }

    async function fetchAndRender() {
        if (!_container || !_user || !_commandKey) {
            console.error('LifeOSWidgetScore: Widget not properly mounted. Missing container, user, or commandKey.');
            return;
        }

        renderLoadingState(_container);

        try {
            const response = await fetch(`${API_ENDPOINT}?user=${_user}`, {
                headers: {
                    'X-Command-Key': _commandKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            const today = new Date(data.date || Date.now());
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = today.toLocaleDateString(undefined, dateOptions);

            _container.innerHTML = `
                <div class="lifeos-score-widget">
                    <h3>${formattedDate}</h3>
                    <div class="score-rings-container"></div>
                </div>
            `;
            const ringsContainer = _container.querySelector('.score-rings-container');

            const joyScore = data.joy_score;
            const integrityScore = data.integrity_score;
            const energyLevel = data.energy_level; // 0-5, will be scaled for display/color

            ringsContainer.appendChild(renderRing(joyScore, 10, 'Joy Score', false, joyScore === null || joyScore === undefined));
            ringsContainer.appendChild(renderRing(integrityScore, 10, 'Integrity Score', false, integrityScore === null || integrityScore === undefined));
            ringsContainer.appendChild(renderRing(energyLevel, 5, 'Energy Level', false, energyLevel === null || energyLevel === undefined));

            // Trigger animation for rings if not reduced motion
            if (!_isReducedMotion) {
                setTimeout(() => {
                    _container.querySelectorAll('.score-ring-svg circle:nth-child(2)').forEach((circle, index) => {
                        const scoreData = [joyScore, integrityScore, energyLevel][index];
                        const maxScoreData = [10, 10, 5][index];
                        const metricNameData = ['Joy Score', 'Integrity Score', 'Energy Level'][index];
                        const displayScore = scoreData !== null && scoreData !== undefined ? Math.min(scoreData, maxScoreData) : 0;
                        const circumference = 2 * Math.PI * 40;
                        const dashOffset = circumference - (displayScore / maxScoreData) * circumference;
                        circle.style.strokeDashoffset = dashOffset;
                        circle.classList.remove('score-ring-loading');
                    });
                }, 50); // Small delay to ensure DOM is painted before transition
            }

        } catch (error) {
            console.error('LifeOSWidgetScore: Failed to fetch or render scorecard data:', error);
            const today = new Date();
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = today.toLocaleDateString(undefined, dateOptions);

            _container.innerHTML = `
                <div class="lifeos-score-widget">
                    <h3>${formattedDate}</h3>
                    <div class="score-rings-container"></div>
                </div>
            `;
            const ringsContainer = _container.querySelector('.score-rings-container');
            ringsContainer.appendChild(renderRing(null, 10, 'Joy Score', false, true));
            ringsContainer.appendChild(renderRing(null, 10, 'Integrity Score', false, true));
            ringsContainer.appendChild(renderRing(null, 5, 'Energy Level', false, true));
        }
    }

    function mount({ container, user, commandKey }) {
        _container = container || document.getElementById(WIDGET_ID);
        _user = user;
        _commandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

        if (!_container) {
            console.error(`LifeOSWidgetScore: Container element with ID '${WIDGET_ID}' not found.`);
            return;
        }
        if (!_user) {
            console.error('LifeOSWidgetScore: User handle is required for mounting.');
            return;
        }
        if (!_commandKey) {
            console.warn('LifeOSWidgetScore: commandKey not found. API requests may fail.');
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