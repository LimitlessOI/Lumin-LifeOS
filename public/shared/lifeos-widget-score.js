(function() {
    let _container = null;
    let _user = null;
    let _commandKey = null;
    const _isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const RADIUS = 40;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    // Helper to create and inject the style block into the document head
    function createStyleBlock() {
        const styleId = 'lifeos-score-widget-styles';
        let style = document.getElementById(styleId);
        if (style) return; // Style already exists, no need to re-add

        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Widget specific styles */
            .lifeos-score-widget {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
                color: var(--dash-text);
                background-color: var(--dash-surface);
                border-radius: var(--dash-radius-lg);
                padding: calc(var(--dash-space-unit) * 1.5);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: calc(var(--dash-space-unit) * 1.5);
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                min-width: 280px; /* Ensure it's not too small */
            }
            .score-date-heading {
                font-size: 1.1em;
                font-weight: 600;
                margin: 0;
                color: var(--dash-text);
            }
            .score-rings-container {
                display: flex;
                gap: calc(var(--dash-space-unit) * 2);
                flex-wrap: wrap;
                justify-content: center;
            }
            .score-ring-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                width: 100px; /* Fixed width for each ring item */
                position: relative; /* For shimmer */
                overflow: hidden; /* For shimmer */
                border-radius: var(--dash-radius-lg); /* For shimmer */
            }
            .score-ring-svg {
                width: 100px;
                height: 100px;
                transform: rotate(-90deg); /* Start from top */
            }
            .score-ring-bg {
                fill: none;
                stroke: var(--dash-border);
                stroke-width: 8;
            }
            .score-ring-progress {
                fill: none;
                stroke-width: 8;
                stroke-linecap: round;
                transform-origin: 50% 50%;
                transition: stroke-dashoffset 0.8s ease-out; /* Smooth transition for score change */
            }
            .score-value {
                font-size: 1.5em;
                font-weight: bold;
                fill: var(--dash-text);
                transform: rotate(90deg); /* Counter-rotate text */
            }
            .score-metric-name {
                margin-top: calc(var(--dash-space-unit) / 2);
                font-size: 0.85em;
                color: var(--dash-muted);
            }

            /* Color classes */
            .score-ring-green { stroke: #4CAF50; } /* Green */
            .score-ring-amber { stroke: #FFC107; } /* Amber */
            .score-ring-red { stroke: #F44336; }   /* Red */
            .score-ring-error { stroke: var(--dash-muted); } /* Grey for error */

            /* Loading animation for ring stroke */
            .score-ring-progress.score-ring-loading {
                stroke: var(--dash-accent);
                animation: ring-loading-animation 1.5s infinite ease-in-out;
            }
            @keyframes ring-loading-animation {
                0% { stroke-dashoffset: ${CIRCUMFERENCE * 0.75}; }
                50% { stroke-dashoffset: ${CIRCUMFERENCE * 0.25}; }
                100% { stroke-dashoffset: ${CIRCUMFERENCE * 0.75}; }
            }

            /* Shimmer effect for loading placeholder background */
            .score-ring-item.shimmer-bg::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                animation: shimmer-bg 1.5s infinite;
            }
            @keyframes shimmer-bg {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            /* Reduced motion overrides */
            @media (prefers-reduced-motion: reduce) {
                .score-ring-progress {
                    transition: none !important; /* Disable score change animation */
                }
                .score-ring-progress.score-ring-loading {
                    animation: none;
                    stroke-dashoffset: ${CIRCUMFERENCE * 0.5} !important; /* Static half-fill */
                }
                .score-ring-item.shimmer-bg::after {
                    animation: none;
                    background: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function getScoreColorClass(score) {
        if (score > 7) return 'score-ring-green';
        if (score >= 4) return 'score-ring-amber';
        return 'score-ring-red';
    }

    function createRing(metricName, score, maxScore, colorClass, isLoading, isError) {
        let strokeDashoffset;
        let displayScore = isError ? '—' : (score !== null ? score.toFixed(1) : '');
        let ringProgressClass = colorClass;
        let itemClasses = ['score-ring-item'];

        if (isLoading) {
            ringProgressClass = 'score-ring-loading';
            itemClasses.push('shimmer-bg');
            if (_isReducedMotion) {
                strokeDashoffset = CIRCUMFERENCE * 0.5; // Static half-fill for reduced motion
            } else {
                strokeDashoffset = CIRCUMFERENCE * 0.75; // Initial state for animation
            }
        } else if (isError) {
            ringProgressClass = 'score-ring-error';
            strokeDashoffset = CIRCUMFERENCE; // Fully empty for error
        } else {
            const normalizedScore = (score / maxScore) * 10; // Normalize to 0-10 for dash calculation
            strokeDashoffset = CIRCUMFERENCE - (normalizedScore / 10) * CIRCUMFERENCE;
        }

        const svg = `
            <div class="${itemClasses.join(' ')}">
                <svg viewBox="0 0 100 100" class="score-ring-svg">
                    <circle class="score-ring-bg" cx="50" cy="50" r="${RADIUS}"></circle>
                    <circle class="score-ring-progress ${ringProgressClass}"
                            cx="50" cy="50" r="${RADIUS}"
                            stroke-dasharray="${CIRCUMFERENCE}"
                            stroke-dashoffset="${strokeDashoffset}"
                    ></circle>
                    <text x="50" y="50" text-anchor="middle" alignment-baseline="middle" class="score-value">${displayScore}</text>
                </svg>
                <div class="score-metric-name">${metricName}</div>
            </div>
        `;
        return svg;
    }

    function renderSkeleton() {
        const today = new Date();
        const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        createStyleBlock(); // Ensure style block is in the head

        _container.innerHTML = `
            <h3 class="score-date-heading">${dateString}</h3>
            <div class="score-rings-container">
                ${createRing('Joy Score', null, 10, '', true, false)}
                ${createRing('Integrity Score', null, 10, '', true, false)}
                ${createRing('Energy Level', null, 10, '', true, false)}
            </div>
        `;
        _container.classList.add('lifeos-score-widget');
    }

    function renderScores(data) {
        const joyScore = data.joy_score;
        const integrityScore = data.integrity_score;
        const energyLevel = data.energy_level * 2; // Scale 0-5 to 0-10

        const ringsHtml = `
            ${createRing('Joy Score', joyScore, 10, getScoreColorClass(joyScore), false, false)}
            ${createRing('Integrity Score', integrityScore, 10, getScoreColorClass(integrityScore), false, false)}
            ${createRing('Energy Level', energyLevel, 10, getScoreColorClass(energyLevel), false, false)}
        `;
        _container.querySelector('.score-rings-container').innerHTML = ringsHtml;
    }

    function renderErrorState() {
        const ringsHtml = `
            ${createRing('Joy Score', null, 10, '', false, true)}
            ${createRing('Integrity Score', null, 10, '', false, true)}
            ${createRing('Energy Level', null, 10, '', false, true)}
        `;
        _container.querySelector('.score-rings-container').innerHTML = ringsHtml;
    }

    async function fetchAndRenderScores() {
        const today = new Date();
        const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        // Update date heading even during loading/error states
        const headingElement = _container.querySelector('.score-date-heading');
        if (headingElement) {
            headingElement.textContent = dateString;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (_commandKey) {
                headers['X-LifeOS-CommandKey'] = _commandKey;
            }
            const response = await fetch(`/api/v1/lifeos/scorecard/today?user=${_user}`, { headers });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderScores(data);
        } catch (error) {
            console.error('LifeOS Score Widget: Failed to fetch scores:', error);
            renderErrorState();
        }
    }

    function mount({ container, user, commandKey }) {
        _container = container || document.getElementById('lifeos-widget-score');
        _user = user;
        _commandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

        if (!_container) {
            console.error('LifeOS Score Widget: Container element not found.');
            return;
        }
        renderSkeleton(); // Render skeleton and ensure styles are loaded
        fetchAndRenderScores();
    }

    function refresh() {
        if (_container && _user) {
            renderSkeleton(); // Re-render skeleton to show loading state again
            fetchAndRenderScores();
        } else {
            console.warn('LifeOS Score Widget: Cannot refresh, widget not mounted or user not set.');
        }
    }

    window.LifeOSWidgetScore = { mount, refresh };
})();