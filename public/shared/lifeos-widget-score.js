(function(){
  const API_ENDPOINT = '/api/v1/lifeos/scorecard/today';
  const CIRCLE_RADIUS = 40;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
  const VIEWBOX_SIZE = 100; // SVG viewBox="0 0 100 100"
  const TEXT_OFFSET_Y = 5; // For value text
  const LABEL_OFFSET_Y = 25; // For metric name text

  // Score color thresholds
  const COLOR_GREEN = '#4CAF50'; // Green
  const COLOR_AMBER = '#FFC107'; // Amber
  const COLOR_RED = '#F44336';   // Red
  const COLOR_MUTED = 'var(--dash-muted, #555566)'; // Fallback for muted

  let _container = null;
  let _user = null;
  let _commandKey = null;
  let _isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getCommandKey() {
    return window.lifeosCommandKey || localStorage.getItem('commandKey');
  }

  function getScoreColor(score) {
    if (score > 7) return COLOR_GREEN;
    if (score >= 4) return COLOR_AMBER;
    return COLOR_RED;
  }

  function createSvgElement(tag, attributes = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
    return el;
  }

  function createRing(score, metricName, maxScore, isLoading = false, isError = false) {
    const svg = createSvgElement('svg', {
      viewBox: `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`,
      class: 'lifeos-score-ring'
    });

    const backgroundCircle = createSvgElement('circle', {
      cx: VIEWBOX_SIZE / 2,
      cy: VIEWBOX_SIZE / 2,
      r: CIRCLE_RADIUS,
      fill: 'none',
      stroke: 'var(--dash-border, rgba(255,255,255,0.07))',
      'stroke-width': '8'
    });
    svg.appendChild(backgroundCircle);

    let displayScore = isError ? '—' : (score !== null ? score.toFixed(1) : '');
    let ringColor = isError ? COLOR_MUTED : getScoreColor(score);
    let dashOffset = CIRCLE_CIRCUMFERENCE;
    let dashArray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;

    if (!isLoading && !isError && score !== null) {
      const normalizedScore = Math.min(Math.max(score, 0), maxScore);
      const progress = normalizedScore / maxScore;
      dashArray = `${progress * CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
      dashOffset = _isReducedMotion ? 0 : CIRCLE_CIRCUMFERENCE; // Start at full for animation
    }

    const arcCircle = createSvgElement('circle', {
      cx: VIEWBOX_SIZE / 2,
      cy: VIEWBOX_SIZE / 2,
      r: CIRCLE_RADIUS,
      fill: 'none',
      stroke: ringColor,
      'stroke-width': '8',
      'stroke-linecap': 'round',
      'stroke-dasharray': dashArray,
      'stroke-dashoffset': dashOffset,
      transform: `rotate(-90 ${VIEWBOX_SIZE / 2} ${VIEWBOX_SIZE / 2})`
    });
    svg.appendChild(arcCircle);

    if (isLoading && !_isReducedMotion) {
      arcCircle.style.animation = 'lifeos-shimmer 1.5s infinite linear';
      arcCircle.style.stroke = COLOR_MUTED;
    } else if (!isError && score !== null && !_isReducedMotion) {
      arcCircle.style.transition = 'stroke-dashoffset 1s ease-out';
      // Trigger reflow to ensure transition applies from initial dashOffset
      void arcCircle.offsetWidth;
      arcCircle.style.strokeDashoffset = '0';
    }

    const valueText = createSvgElement('text', {
      x: VIEWBOX_SIZE / 2,
      y: VIEWBOX_SIZE / 2 + TEXT_OFFSET_Y,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      fill: 'var(--dash-text, #e8e8f0)',
      'font-size': '20',
      'font-weight': 'bold'
    });
    valueText.textContent = displayScore;
    svg.appendChild(valueText);

    const labelText = createSvgElement('div', {
      class: 'lifeos-score-label'
    });
    labelText.textContent = metricName;

    const ringWrapper = document.createElement('div');
    ringWrapper.className = 'lifeos-score-ring-wrapper';
    ringWrapper.appendChild(svg);
    ringWrapper.appendChild(labelText);

    return ringWrapper;
  }

  function renderScores(data, isLoading = false, isError = false) {
    if (!_container) return;

    _container.innerHTML = ''; // Clear previous content

    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = today.toLocaleDateString(undefined, options);

    const heading = document.createElement('h3');
    heading.className = 'lifeos-score-heading';
    heading.textContent = isLoading ? 'Loading Scores...' : (isError ? 'Error Loading Scores' : dateString);
    _container.appendChild(heading);

    const ringsContainer = document.createElement('div');
    ringsContainer.className = 'lifeos-score-rings-container';
    _container.appendChild(ringsContainer);

    const scores = [
      { name: 'Joy Score', key: 'joy_score', max: 10 },
      { name: 'Integrity Score', key: 'integrity_score', max: 10 },
      { name: 'Energy Level', key: 'energy_level', max: 5, scale: 2 } // Scale 0-5 to 0-10
    ];

    scores.forEach(s => {
      let scoreValue = null;
      if (data && data[s.key] !== undefined) {
        scoreValue = s.scale ? data[s.key] * s.scale : data[s.key];
      }
      ringsContainer.appendChild(createRing(scoreValue, s.name, s.max, isLoading, isError));
    });
  }

  async function fetchAndRenderScores() {
    if (!_user) {
      console.error('LifeOSWidgetScore: User handle not set.');
      renderScores(null, false, true);
      return;
    }

    renderScores(null, true, false); // Show loading state

    const currentCommandKey = _commandKey || getCommandKey();
    if (!currentCommandKey) {
      console.warn('LifeOSWidgetScore: commandKey not found. Fetching without authorization.');
    }

    try {
      const url = `${API_ENDPOINT}?user=${encodeURIComponent(_user)}`;
      const headers = {
        'Content-Type': 'application/json'
      };
      if (currentCommandKey) {
        headers['Authorization'] = `Bearer ${currentCommandKey}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      renderScores(data, false, false);
    } catch (error) {
      console.error('LifeOSWidgetScore: Failed to fetch scores:', error);
      renderScores(null, false, true); // Show error state
    }
  }

  function mount({ container, user, commandKey }) {
    _container = container || document.getElementById('lifeos-widget-score');
    if (!_container) {
      console.error('LifeOSWidgetScore: Container element not found.');
      return;
    }
    _user = user;
    _commandKey = commandKey; // Prioritize explicit commandKey from mount args

    // Inject basic styles for the widget
    if (!document.getElementById('lifeos-score-widget-styles')) {
      const style = document.createElement('style');
      style.id = 'lifeos-score-widget-styles';
      style.textContent = `
        .lifeos-score-heading {
          font-family: var(--dash-font-family, sans-serif);
          font-size: 1.2em;
          color: var(--dash-text, #e8e8f0);
          margin-bottom: calc(2 * var(--dash-space-unit, 4px));
          text-align: center;
        }
        .lifeos-score-rings-container {
          display: flex;
          justify-content: space-around;
          gap: calc(4 * var(--dash-space-unit, 4px));
          flex-wrap: wrap;
        }
        .lifeos-score-ring-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: ${VIEWBOX_SIZE}px; /* Fixed width for each ring */
        }
        .lifeos-score-ring {
          width: 100%;
          height: auto;
          display: block;
        }
        .lifeos-score-label {
          font-family: var(--dash-font-family, sans-serif);
          font-size: 0.8em;
          color: var(--dash-muted, #555566);
          margin-top: calc(1 * var(--dash-space-unit, 4px));
          text-align: center;
        }
        @keyframes lifeos-shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
    }

    fetchAndRenderScores();
  }

  function refresh() {
    fetchAndRenderScores();
  }

  window.LifeOSWidgetScore = {
    mount,
    refresh
  };
})();