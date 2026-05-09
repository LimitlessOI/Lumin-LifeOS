(function(){
  const API_ENDPOINT = '/api/v1/lifeos/scorecard/today';
  const BASE_URL = ''; // Assuming relative path for API calls

  let currentContainer = null;
  let currentUser = null;
  let currentCommandKey = null;
  let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Inject styles for the widget
  const style = document.createElement('style');
  style.textContent = `
    .lifeos-score-widget {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      color: var(--dash-text, #e8e8f0);
      background-color: var(--dash-surface, #111118);
      border-radius: var(--dash-radius-lg, 14px);
      padding: calc(var(--dash-space-unit, 4px) * 4);
      display: flex;
      flex-direction: column;
      gap: calc(var(--dash-space-unit, 4px) * 4);
      box-sizing: border-box;
      min-height: 200px; /* Ensure space for shimmer */
    }
    .lifeos-score-widget h3 {
      margin: 0;
      font-size: 1.1em;
      font-weight: 600;
      text-align: center;
    }
    .lifeos-score-rings-container {
      display: flex;
      justify-content: space-around;
      align-items: center;
      flex-wrap: wrap;
      gap: calc(var(--dash-space-unit, 4px) * 4);
      flex-grow: 1;
    }
    .lifeos-score-ring-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      min-width: 100px; /* Ensure rings don't get too small */
    }
    .lifeos-score-ring-svg {
      width: 100px;
      height: 100px;
      position: relative;
    }
    .lifeos-score-ring-circle-bg {
      stroke: var(--dash-border, rgba(255,255,255,0.07));
      stroke-width: 8;
      fill: none;
    }
    .lifeos-score-ring-circle-fg {
      stroke-width: 8;
      fill: none;
      stroke-linecap: round;
      transform: rotate(-90deg);
      transform-origin: 50% 50%;
      transition: stroke-dasharray 0.5s ease-out;
    }
    @media (prefers-reduced-motion: reduce) {
      .lifeos-score-ring-circle-fg {
        transition: none; /* Disable animation */
      }
    }
    .lifeos-score-ring-value {
      font-size: 1.4em;
      font-weight: 700;
      fill: var(--dash-text, #e8e8f0);
    }
    .lifeos-score-ring-metric {
      font-size: 0.8em;
      color: var(--dash-muted, #555566);
      margin-top: calc(var(--dash-space-unit, 4px) * 2);
    }

    /* Color classes */
    .lifeos-score-green { stroke: #4CAF50; }
    .lifeos-score-amber { stroke: #FFC107; }
    .lifeos-score-red { stroke: #F44336; }
    .lifeos-score-error { stroke: var(--dash-muted, #555566); }

    /* Shimmer effect */
    .lifeos-shimmer-wrapper {
      position: relative;
      overflow: hidden;
      background-color: var(--dash-surface, #111118);
      border-radius: var(--dash-radius-lg, 14px);
    }
    .lifeos-shimmer-wrapper::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0) 100%);
      transform: translateX(-100%);
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      100% {
        transform: translateX(100%);
      }
    }
    .lifeos-shimmer-active .lifeos-score-ring-circle-fg {
      stroke-dasharray: 25 25; /* Small segment for shimmer */
      animation: shimmer-stroke 1.5s infinite linear;
    }
    @keyframes shimmer-stroke {
      0% { stroke-dashoffset: 0; }
      100% { stroke-dashoffset: -50; }
    }
    .lifeos-shimmer-active .lifeos-score-ring-value,
    .lifeos-shimmer-active .lifeos-score-ring-metric {
      opacity: 0; /* Hide text during shimmer */
    }
    .lifeos-shimmer-active .lifeos-score-ring-circle-bg {
      stroke: var(--dash-border, rgba(255,255,255,0.07));
    }
  `;
  document.head.appendChild(style);

  function getCommandKey() {
    return window.lifeosCommandKey || localStorage.getItem('commandKey');
  }

  function createRingSVG(score, metricName, maxScore, isError, isLoading) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("class", "lifeos-score-ring-svg");

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const normalizedScore = isError ? 0 : (score / maxScore);
    const strokeDashoffset = circumference * (1 - normalizedScore);

    let colorClass = '';
    if (isError) {
      colorClass = 'lifeos-score-error';
    } else if (score > 7) {
      colorClass = 'lifeos-score-green';
    } else if (score >= 4) {
      colorClass = 'lifeos-score-amber';
    } else {
      colorClass = 'lifeos-score-red';
    }

    // Background circle
    const bgCircle = document.createElementNS(svgNS, "circle");
    bgCircle.setAttribute("cx", "50");
    bgCircle.setAttribute("cy", "50");
    bgCircle.setAttribute("r", radius);
    bgCircle.setAttribute("class", "lifeos-score-ring-circle-bg");
    svg.appendChild(bgCircle);

    // Foreground circle
    const fgCircle = document.createElementNS(svgNS, "circle");
    fgCircle.setAttribute("cx", "50");
    fgCircle.setAttribute("cy", "50");
    fgCircle.setAttribute("r", radius);
    fgCircle.setAttribute("class", `lifeos-score-ring-circle-fg ${colorClass}`);
    fgCircle.setAttribute("stroke-dasharray", circumference);
    fgCircle.setAttribute("stroke-dashoffset", isLoading && !prefersReducedMotion ? circumference : strokeDashoffset); // Initial offset for animation
    if (isLoading && !prefersReducedMotion) {
      fgCircle.style.animation = 'shimmer-stroke 1.5s infinite linear';
    } else {
      fgCircle.style.animation = 'none';
    }
    svg.appendChild(fgCircle);

    // Value text
    const valueText = document.createElementNS(svgNS, "text");
    valueText.setAttribute("x", "50");
    valueText.setAttribute("y", "55");
    valueText.setAttribute("text-anchor", "middle");
    valueText.setAttribute("dominant-baseline", "middle");
    valueText.setAttribute("class", "lifeos-score-ring-value");
    valueText.textContent = isError ? '—' : (score !== null ? score.toFixed(0) : '');
    svg.appendChild(valueText);

    const wrapper = document.createElement('div');
    wrapper.className = 'lifeos-score-ring-wrapper';
    wrapper.appendChild(svg);

    const metricDiv = document.createElement('div');
    metricDiv.className = 'lifeos-score-ring-metric';
    metricDiv.textContent = metricName.replace(/_/g, ' '); // Replace underscores for display
    wrapper.appendChild(metricDiv);

    return wrapper;
  }

  function renderWidget(data, container, isLoading, isError) {
    container.innerHTML = ''; // Clear previous content

    const widgetDiv = document.createElement('div');
    widgetDiv.className = `lifeos-score-widget ${isLoading ? 'lifeos-shimmer-wrapper' : ''}`;

    const dateHeading = document.createElement('h3');
    const today = new Date();
    dateHeading.textContent = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    widgetDiv.appendChild(dateHeading);

    const ringsContainer = document.createElement('div');
    ringsContainer.className = 'lifeos-score-rings-container';
    widgetDiv.appendChild(ringsContainer);

    const scores = [
      { name: 'joy_score', value: data?.joy_score, max: 10 },
      { name: 'integrity_score', value: data?.integrity_score, max: 10 },
      { name: 'energy_level', value: data?.energy_level !== undefined ? data.energy_level * 2 : undefined, max: 10 } // Scale 0-5 to 0-10
    ];

    scores.forEach(score => {
      const ring = createRingSVG(score.value, score.name, score.max, isError || score.value === undefined, isLoading);
      ringsContainer.appendChild(ring);
    });

    container.appendChild(widgetDiv);
  }

  async function fetchAndRender() {
    if (!currentContainer || !currentUser) {
      console.warn('LifeOSWidgetScore: Widget not mounted or user not provided.');
      return;
    }

    renderWidget(null, currentContainer, true, false); // Show loading state

    try {
      const url = `${BASE_URL}${API_ENDPOINT}?user=${encodeURIComponent(currentUser)}`;
      const headers = {
        'Content-Type': 'application/json',
      };
      if (currentCommandKey) {
        headers['X-Command-Key'] = currentCommandKey;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      renderWidget(data, currentContainer, false, false); // Render actual data
    } catch (error) {
      console.error('LifeOSWidgetScore: Failed to fetch scorecard data:', error);
      renderWidget(null, currentContainer, false, true); // Show error state
    }
  }

  function mount({ container, user, commandKey }) {
    if (typeof container === 'string') {
      currentContainer = document.getElementById(container);
      if (!currentContainer) {
        console.error(`LifeOSWidgetScore: Container element with ID "${container}" not found.`);
        return;
      }
    } else if (container instanceof HTMLElement) {
      currentContainer = container;
    } else {
      console.error('LifeOSWidgetScore: Invalid container provided. Must be an ID string or an HTMLElement.');
      return;
    }

    currentUser = user;
    currentCommandKey = commandKey || getCommandKey();

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