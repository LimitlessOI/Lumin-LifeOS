(function(){
  const API_BASE_URL = '/api/v1/lifeos/scorecard/today';
  const RING_RADIUS = 40;
  const RING_STROKE_WIDTH = 10;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const SVG_VIEWBOX = '0 0 100 100';

  let _containerElement = null;
  let _userHandle = null;
  let _commandKey = null;
  let _dateHeading = null;
  let _ringsContainer = null;

  // Define custom CSS variables for ring colors if not in tokens.css
  // These will be injected into the style tag for the widget.
  const WIDGET_STYLES = `
    :root {
      --lifeos-ring-green: #4CAF50; /* Green for good scores */
      --lifeos-ring-amber: #FFC107; /* Amber for medium scores */
      --lifeos-ring-red: #F44336;   /* Red for low scores */
      --lifeos-ring-background: var(--dash-surface); /* Background of the ring track */
      --lifeos-ring-text: var(--dash-text);
      --lifeos-ring-muted: var(--dash-muted);
    }
    .lifeos-score-widget {
      font-family: sans-serif;
      color: var(--lifeos-ring-text);
      padding: var(--dash-space-unit);
      border-radius: var(--dash-radius-lg);
      background-color: var(--dash-surface);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--dash-space-unit);
    }
    .lifeos-score-widget h3 {
      margin: 0;
      font-size: 1.2em;
      color: var(--lifeos-ring-text);
    }
    .lifeos-rings-container {
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
      width: 100px; /* SVG width */
    }
    .lifeos-ring-gauge svg {
      width: 100px;
      height: 100px;
      transform: rotate(-90deg); /* Start stroke from top */
    }
    .lifeos-ring-gauge circle {
      fill: none;
      stroke-width: ${RING_STROKE_WIDTH};
      stroke-linecap: round;
    }
    .lifeos-ring-gauge .ring-bg {
      stroke: var(--lifeos-ring-background);
    }
    .lifeos-ring-gauge .ring-fg {
      transition: stroke-dasharray 0.5s ease-out;
    }
    .lifeos-ring-gauge .ring-value,
    .lifeos-ring-gauge .ring-metric {
      font-size: 0.9em;
      fill: var(--lifeos-ring-text);
      text-anchor: middle;
      dominant-baseline: central;
    }
    .lifeos-ring-gauge .ring-value {
      font-weight: bold;
      font-size: 1.5em;
    }
    .lifeos-ring-gauge .ring-metric {
      margin-top: calc(0.5 * var(--dash-space-unit));
      font-size: 0.8em;
      color: var(--lifeos-ring-muted);
    }

    /* Loading Shimmer Effect */
    .lifeos-ring-gauge.loading .ring-bg,
    .lifeos-ring-gauge.loading .ring-fg {
      stroke: var(--lifeos-ring-muted);
      animation: shimmer 1.5s infinite linear;
      background: linear-gradient(to right, var(--dash-surface) 0%, var(--dash-muted) 20%, var(--dash-surface) 40%);
      background-size: 200% 100%;
      -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke-width="10" fill="none" stroke="white"/></svg>');
      mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke-width="10" fill="none" stroke="white"/></svg>');
      mask-size: 100% 100%;
      -webkit-mask-size: 100% 100%;
    }
    .lifeos-ring-gauge.loading .ring-value,
    .lifeos-ring-gauge.loading .ring-metric {
      fill: var(--lifeos-ring-muted);
    }
    .lifeos-ring-gauge.loading .ring-value {
      opacity: 0; /* Hide text during shimmer */
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion) {
      .lifeos-ring-gauge .ring-fg {
        transition: none !important;
      }
      .lifeos-ring-gauge.loading .ring-bg,
      .lifeos-ring-gauge.loading .ring-fg {
        animation: none !important;
        background: none !important;
        stroke: var(--lifeos-ring-muted) !important;
      }
    }
  `;

  function _injectStyles() {
    if (document.getElementById('lifeos-widget-score-styles')) {
      return;
    }
    const styleTag = document.createElement('style');
    styleTag.id = 'lifeos-widget-score-styles';
    styleTag.textContent = WIDGET_STYLES;
    document.head.appendChild(styleTag);
  }

  function _getScoreColor(score) {
    if (score === null || score === undefined) {
      return 'var(--lifeos-ring-muted)'; // Error state color
    }
    if (score >= 7) return 'var(--lifeos-ring-green)';
    if (score >= 4) return 'var(--lifeos-ring-amber)';
    return 'var(--lifeos-ring-red)';
  }

  function _getTodayDateString() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString(undefined, options);
  }

  function _prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function _createRingGaugeElement(metricName) {
    const gaugeDiv = document.createElement('div');
    gaugeDiv.className = 'lifeos-ring-gauge';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', SVG_VIEWBOX);

    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('cx', 50);
    bgCircle.setAttribute('cy', 50);
    bgCircle.setAttribute('r', RING_RADIUS);
    bgCircle.className = 'ring-bg';
    svg.appendChild(bgCircle);

    const fgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fgCircle.setAttribute('cx', 50);
    fgCircle.setAttribute('cy', 50);
    fgCircle.setAttribute('r', RING_RADIUS);
    fgCircle.className = 'ring-fg';
    fgCircle.style.strokeDasharray = `0 ${RING_CIRCUMFERENCE}`; // Initial state for animation
    svg.appendChild(fgCircle);

    const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valueText.setAttribute('x', 50);
    valueText.setAttribute('y', 50);
    valueText.className = 'ring-value';
    valueText.textContent = '—'; // Default loading/error state
    svg.appendChild(valueText);

    gaugeDiv.appendChild(svg);

    const metricNameDiv = document.createElement('div');
    metricNameDiv.className = 'ring-metric';
    metricNameDiv.textContent = metricName;
    gaugeDiv.appendChild(metricNameDiv);

    return { gaugeDiv, fgCircle, valueText };
  }

  function _renderRing(score, maxScore, metricName, targetElement) {
    const { gaugeDiv, fgCircle, valueText } = _createRingGaugeElement(metricName);
    targetElement.appendChild(gaugeDiv);

    const displayScore = (score === null || score === undefined) ? '—' : score.toFixed(0);
    valueText.textContent = displayScore;

    const color = _getScoreColor(score);
    fgCircle.style.stroke = color;

    if (score === null || score === undefined) {
      gaugeDiv.classList.add('error');
      fgCircle.style.strokeDasharray = `0 ${RING_CIRCUMFERENCE}`; // No fill for error
    } else {
      gaugeDiv.classList.remove('error');
      const percentage = Math.min(Math.max(score / maxScore, 0), 1);
      const dashOffset = percentage * RING_CIRCUMFERENCE;
      fgCircle.style.strokeDasharray = `${dashOffset} ${RING_CIRCUMFERENCE}`;
      if (_prefersReducedMotion()) {
        fgCircle.style.transition = 'none'; // Disable transition if reduced motion
      }
    }
    return gaugeDiv;
  }

  function _showLoadingState() {
    _ringsContainer.innerHTML = ''; // Clear previous rings
    _dateHeading.textContent = 'Loading...';

    const metrics = ['Joy Score', 'Integrity Score', 'Energy Level'];
    metrics.forEach(metric => {
      const { gaugeDiv, fgCircle, valueText } = _createRingGaugeElement(metric);
      gaugeDiv.classList.add('loading');
      fgCircle.style.stroke = 'var(--lifeos-ring-muted)';
      valueText.textContent = ''; // Hide text during shimmer
      _ringsContainer.appendChild(gaugeDiv);
    });
  }

  function _showErrorState() {
    _ringsContainer.innerHTML = '';
    _dateHeading.textContent = 'Error loading scores';

    const metrics = ['Joy Score', 'Integrity Score', 'Energy Level'];
    metrics.forEach(metric => {
      _renderRing(null, 10, metric, _ringsContainer); // Render with null score for error
    });
  }

  async function _fetchAndRender() {
    if (!_containerElement || !_userHandle) {
      console.error('LifeOSWidgetScore: Widget not properly mounted. Missing container or user handle.');
      return;
    }

    _showLoadingState();

    const finalCommandKey = _commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');
    if (!finalCommandKey) {
      console.error('LifeOSWidgetScore: commandKey is missing. Cannot fetch data.');
      _showErrorState();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}?user=${_userHandle}`, {
        headers: {
          'Authorization': `Bearer ${finalCommandKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      _dateHeading.textContent = _getTodayDateString();
      _ringsContainer.innerHTML = ''; // Clear loading rings

      const joyScore = data.joy_score;
      const integrityScore = data.integrity_score;
      const energyLevelScaled = data.energy_level !== null && data.energy_level !== undefined ? data.energy_level * 2 : null; // Scale 0-5 to 0-10

      _renderRing(joyScore, 10, 'Joy Score', _ringsContainer);
      _renderRing(integrityScore, 10, 'Integrity Score', _ringsContainer);
      _renderRing(energyLevelScaled, 10, 'Energy Level', _ringsContainer);

    } catch (error) {
      console.error('LifeOSWidgetScore: Failed to fetch daily scores:', error);
      _showErrorState();
    }
  }

  function mount({ container, user, commandKey }) {
    if (!container || !user) {
      console.error('LifeOSWidgetScore: mount requires container and user.');
      return;
    }

    _injectStyles();

    _containerElement = container;
    _userHandle = user;
    _commandKey = commandKey;

    _containerElement.innerHTML = ''; // Clear existing content
    _containerElement.className = 'lifeos-score-widget';

    _dateHeading = document.createElement('h3');
    _containerElement.appendChild(_dateHeading);

    _ringsContainer = document.createElement('div');
    _ringsContainer.className = 'lifeos-rings-container';
    _containerElement.appendChild(_ringsContainer);

    _fetchAndRender();
  }

  function refresh() {
    _fetchAndRender();
  }

  window.LifeOSWidgetScore = {
    mount,
    refresh
  };
})();