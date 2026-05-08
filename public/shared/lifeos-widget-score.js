(function(){
  const API_ENDPOINT = '/api/v1/lifeos/scorecard/today';
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

  const RING_RADIUS = 40;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const RING_STROKE_WIDTH = 8;
  const RING_CENTER = 50;

  // Helper to create SVG elements
  function createSvgElement(tag, attributes = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
    return el;
  }

  // Helper to get ring color based on score
  function getRingColor(score, maxScore) {
    if (score === null || score === undefined) return 'var(--lifeos-ring-color-error)';
    const scaledScore = (score / maxScore) * 10; // Scale to 0-10 for consistent thresholds
    if (scaledScore > 7) return 'var(--lifeos-ring-color-green)';
    if (scaledScore >= 4) return 'var(--lifeos-ring-color-amber)';
    return 'var(--lifeos-ring-color-red)';
  }

  // Function to render a single ring gauge
  function renderRingGauge(score, maxScore, metricName, labelText, isLoading = false, isError = false) {
    let displayScore = isError ? '—' : (score !== null && score !== undefined ? Math.round(score) : '—');
    let dashOffset = RING_CIRCUMFERENCE;
    let color = getRingColor(score, maxScore);

    if (isLoading) {
      color = 'var(--lifeos-ring-color-loading)';
      displayScore = ''; // No score during loading
    } else if (!isError && score !== null && score !== undefined) {
      const percentage = score / maxScore;
      dashOffset = RING_CIRCUMFERENCE * (1 - percentage);
    } else { // Error state
      color = 'var(--lifeos-ring-color-error)';
      dashOffset = RING_CIRCUMFERENCE; // Full circle for error, but grey
    }

    const ringContainer = document.createElement('div');
    ringContainer.className = `lifeos-ring-gauge ${isLoading ? 'shimmer-wrapper' : ''}`;

    const svg = createSvgElement('svg', {
      viewBox: '0 0 100 100',
      width: '100',
      height: '100'
    });

    // Background circle
    svg.appendChild(createSvgElement('circle', {
      cx: RING_CENTER,
      cy: RING_CENTER,
      r: RING_RADIUS,
      fill: 'none',
      stroke: 'var(--lifeos-ring-color-bg)',
      'stroke-width': RING_STROKE_WIDTH,
    }));

    // Foreground arc
    const arc = createSvgElement('circle', {
      cx: RING_CENTER,
      cy: RING_CENTER,
      r: RING_RADIUS,
      fill: 'none',
      stroke: color,
      'stroke-width': RING_STROKE_WIDTH,
      'stroke-dasharray': RING_CIRCUMFERENCE,
      'stroke-dashoffset': dashOffset,
      'stroke-linecap': 'round',
      transform: `rotate(-90 ${RING_CENTER} ${RING_CENTER})`, // Start from top
    });

    if (isLoading && !prefersReducedMotion) {
      arc.style.animation = 'lifeos-ring-loading 1.5s infinite linear';
    } else if (!prefersReducedMotion && !isError && score !== null && score !== undefined) {
      arc.style.transition = 'stroke-dashoffset 0.5s ease-out';
    }

    svg.appendChild(arc);

    // Score text
    const scoreText = createSvgElement('text', {
      x: RING_CENTER,
      y: RING_CENTER + 5, // Adjust for vertical centering
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      fill: 'var(--dash-text)',
      'font-size': '24',
      'font-weight': 'bold',
    });
    scoreText.textContent = displayScore;
    svg.appendChild(scoreText);

    ringContainer.appendChild(svg);

    const metricLabel = document.createElement('div');
    metricLabel.className = 'lifeos-ring-label';
    metricLabel.textContent = metricName;
    ringContainer.appendChild(metricLabel);

    return ringContainer;
  }

  let _container = null;
  let _user = null;
  let _commandKey = null;

  function renderWidget(data, isLoading = false, isError = false) {
    if (!_container) return;

    _container.innerHTML = ''; // Clear previous content

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .lifeos-score-widget {
        font-family: sans-serif;
        color: var(--dash-text);
        background-color: var(--dash-surface);
        border-radius: var(--dash-radius-lg);
        padding: calc(2 * var(--dash-space-unit));
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--dash-space-unit);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .lifeos-score-date {
        font-size: 1.2em;
        font-weight: 600;
        margin: 0 0 var(--dash-space-unit) 0;
        color: var(--dash-text);
      }
      .lifeos-score-rings {
        display: flex;
        gap: calc(2 * var(--dash-space-unit));
        flex-wrap: wrap;
        justify-content: center;
      }
      .lifeos-ring-gauge {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        width: 100px; /* Fixed width for the SVG container */
      }
      .lifeos-ring-label {
        margin-top: calc(0.5 * var(--dash-space-unit));
        font-size: 0.9em;
        color: var(--dash-muted);
      }

      /* Custom CSS Variables for Ring Colors */
      :root {
        --lifeos-ring-color-green: #28a745; /* Green for good scores */
        --lifeos-ring-color-amber: #ffc107; /* Amber for medium scores */
        --lifeos-ring-color-red: #dc3545;   /* Red for low scores */
        --lifeos-ring-color-error: #6c757d; /* Grey for error state */
        --lifeos-ring-color-loading: var(--dash-muted); /* Muted for loading */
        --lifeos-ring-color-bg: rgba(var(--dash-text-rgb, 232,232,240), 0.1); /* Light background for the track */
      }
      /* Fallback for dash-text-rgb if not defined in tokens.css */
      :root {
        --dash-text-rgb: 232,232,240; /* Default for dark theme */
      }
      html[data-theme="light"] {
        --dash-text-rgb: 26,26,34; /* Override for light theme */
      }

      /* Shimmer effect for loading state */
      .shimmer-wrapper {
        position: relative;
        overflow: hidden;
        background-color: var(--dash-surface); /* Use a dashboard token for background */
        border-radius: var(--dash-radius-lg);
      }
      .shimmer-wrapper::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0));
        transform: translateX(-100%);
        animation: shimmer 1.5s infinite;
        border-radius: var(--dash-radius-lg); /* Apply radius to shimmer too */
      }
      @keyframes shimmer {
        100% {
          transform: translateX(100%);
        }
      }

      /* Ring loading animation */
      @keyframes lifeos-ring-loading {
        0% { stroke-dashoffset: ${RING_CIRCUMFERENCE}; }
        50% { stroke-dashoffset: ${RING_CIRCUMFERENCE * 0.5}; }
        100% { stroke-dashoffset: ${RING_CIRCUMFERENCE}; }
      }
      ${prefersReducedMotion ? `
        .shimmer-wrapper::after { animation: none !important; }
        .lifeos-ring-gauge circle { animation: none !important; transition: none !important; }
      ` : ''}
    `;
    _container.appendChild(styleEl);

    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'lifeos-score-widget';

    const dateHeading = document.createElement('h3');
    dateHeading.className = 'lifeos-score-date';
    dateHeading.textContent = isLoading ? 'Loading...' : (isError ? 'Error' : new Date(data.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }));
    widgetWrapper.appendChild(dateHeading);

    const ringsContainer = document.createElement('div');
    ringsContainer.className = 'lifeos-score-rings';

    if (isLoading) {
      ringsContainer.appendChild(renderRingGauge(null, 10, 'Joy', '', true));
      ringsContainer.appendChild(renderRingGauge(null, 10, 'Integrity', '', true));
      ringsContainer.appendChild(renderRingGauge(null, 10, 'Energy', '', true));
    } else if (isError) {
      ringsContainer.appendChild(renderRingGauge(null, 10, 'Joy', '', false, true));
      ringsContainer.appendChild(renderRingGauge(null, 10, 'Integrity', '', false, true));
      ringsContainer.appendChild(renderRingGauge(null, 10, 'Energy', '', false, true));
    } else {
      ringsContainer.appendChild(renderRingGauge(data.joy_score, 10, 'Joy', 'Joy Score'));
      ringsContainer.appendChild(renderRingGauge(data.integrity_score, 10, 'Integrity', 'Integrity Score'));
      // Energy level is 0-5, scaled to 0-10 for display and color logic
      ringsContainer.appendChild(renderRingGauge(data.energy_level * 2, 10, 'Energy', 'Energy Level'));
    }

    widgetWrapper.appendChild(ringsContainer);
    _container.appendChild(widgetWrapper);
  }

  async function refresh() {
    if (!_user) {
      console.error("LifeOSWidgetScore: User handle not set for refresh.");
      renderWidget(null, false, true); // Render error state
      return;
    }

    renderWidget(null, true); // Show loading state

    const effectiveCommandKey = _commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (effectiveCommandKey) {
        headers['X-Command-Key'] = effectiveCommandKey;
      }

      const response = await fetch(`${API_ENDPOINT}?user=${_user}`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Assuming data structure: { date: "YYYY-MM-DD", joy_score: N, integrity_score: N, energy_level: N }
      renderWidget(data, false, false); // Render actual data
    } catch (error) {
      console.error("LifeOSWidgetScore: Failed to fetch scorecard data:", error);
      renderWidget(null, false, true); // Show error state
    }
  }

  function mount({ container, user, commandKey }) {
    if (!container) {
      console.error("LifeOSWidgetScore: Container element is required for mounting.");
      return;
    }
    _container = container;
    _user = user;
    _commandKey = commandKey; // Prioritize explicit commandKey from mount options

    refresh(); // Initial data fetch and render
  }

  // Expose public API
  window.LifeOSWidgetScore = {
    mount,
    refresh
  };
})();