(function(){
  let _container = null;
  let _userHandle = null;
  let _commandKey = null;
  let _prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const API_ENDPOINT = '/api/v1/lifeos/scorecard/today';
  const RING_RADIUS = 40;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  const SCORE_METRICS = [
    { key: 'joy_score', label: 'Joy', scale: 1, tip: 'Overall happiness and contentment' },
    { key: 'integrity_score', label: 'Integrity', scale: 1, tip: 'Alignment of actions with values' },
    { key: 'energy_level', label: 'Energy', scale: 2, tip: 'Physical and mental vitality' } // 0-5 scaled to 0-10
  ];

  function getScoreColor(score) {
    if (score > 7) return 'var(--c-health, #10b981)'; // Green
    if (score >= 4) return 'var(--c-decisions, #f59e0b)'; // Amber
    return 'var(--c-conflict, #e05555)'; // Red
  }

  function getTodayDate() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function createRingSVG(score, color, animate = true) {
    const scorePct = score * 10; // Convert 0-10 to 0-100 percentage
    const offset = RING_CIRCUMFERENCE * (1 - scorePct / 100);
    const animationStyle = animate && !_prefersReducedMotion ? `animation: ring-fill 1s cubic-bezier(0.4,0,0.2,1) forwards; animation-delay: 0.4s;` : '';

    return `
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle class="track" cx="50" cy="50" r="${RING_RADIUS}" fill="none" stroke-width="8"/>
        <circle class="fill" cx="50" cy="50" r="${RING_RADIUS}" fill="none" stroke-width="8"
          stroke="${color}" style="stroke-dasharray:${RING_CIRCUMFERENCE}; stroke-dashoffset:${offset}; ${animationStyle}"/>
      </svg>
    `;
  }

  function renderSkeleton() {
    if (!_container) return;
    _container.innerHTML = `
      <style>
        .lifeos-score-widget {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          color: var(--text-primary);
        }
        .lifeos-score-widget-date {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .lifeos-score-widget-grid {
          display: flex;
          gap: 20px;
          justify-content: center;
          width: 100%;
        }
        .lifeos-score-widget .score-tile {
          background: transparent; /* No background for individual tiles within the widget */
          border: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: default;
          position: relative;
          flex: 1;
          max-width: 100px; /* Limit width for individual rings */
        }
        .lifeos-score-widget .score-ring {
          position: relative;
          width: 100px;
          height: 100px;
          margin-bottom: 8px;
        }
        .lifeos-score-widget .score-ring svg {
          transform: rotate(-90deg);
          overflow: visible;
        }
        .lifeos-score-widget .score-ring circle.track {
          stroke: var(--bg-overlay);
          stroke-width: 8;
        }
        .lifeos-score-widget .score-ring circle.fill {
          stroke-linecap: round;
          stroke-width: 8;
        }
        .lifeos-score-widget .score-num {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .lifeos-score-widget .score-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          text-align: center;
        }
        /* Reusing existing skeleton styles */
        .lifeos-score-widget .skeleton {
          background: linear-gradient(90deg, var(--bg-surface2) 25%, var(--bg-overlay) 50%, var(--bg-surface2) 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s infinite;
          border-radius: var(--radius-sm);
        }
        .lifeos-score-widget .skel-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          margin-bottom: 8px;
        }
        .lifeos-score-widget .skel-label {
          width: 70px;
          height: 14px;
        }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes ring-fill {
          from { opacity: 0.2; }
          to { opacity: 1; }
        }
        @media (max-width: 480px) {
          .lifeos-score-widget-grid {
            flex-direction: column;
            align-items: center;
          }
        }
      </style>
      <div class="lifeos-score-widget">
        <h3 class="lifeos-score-widget-date skeleton" style="width: 180px; height: 18px;"></h3>
        <div class="lifeos-score-widget-grid">
          ${SCORE_METRICS.map(() => `
            <div class="score-tile">
              <div class="skel-circle skeleton"></div>
              <div class="skel-label skeleton"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  async function fetchData() {
    if (!_userHandle || !_commandKey) {
      throw new Error('User handle or command key not set.');
    }
    const url = `${API_ENDPOINT}?user=${encodeURIComponent(_userHandle)}`;
    const headers = { 'x-lifeos-key': _commandKey, 'Content-Type': 'application/json' };
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  function renderScores(data) {
    if (!_container) return;

    const scoreTiles = SCORE_METRICS.map(metric => {
      let score = data[metric.key];
      if (score === undefined || score === null) {
        return `
          <div class="score-tile">
            <div class="score-ring">
              ${createRingSVG(0, 'var(--text-muted, #555566)', false)}
              <div class="score-num" style="color:var(--text-muted, #555566)">—</div>
            </div>
            <div class="score-label">${metric.label}</div>
          </div>
        `;
      }

      // Apply scaling
      score = score * metric.scale;
      // Clamp score to 0-10 range
      score = Math.max(0, Math.min(10, score));

      const color = getScoreColor(score);
      const displayScore = Math.round(score); // Display as integer

      return `
        <div class="score-tile">
          <div class="score-ring">
            ${createRingSVG(displayScore, color)}
            <div class="score-num" style="color:${color}">${displayScore}</div>
          </div>
          <div class="score-label">${metric.label}</div>
        </div>
      `;
    }).join('');

    _container.innerHTML = `
      <style>
        .lifeos-score-widget {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          color: var(--text-primary);
        }
        .lifeos-score-widget-date {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .lifeos-score-widget-grid {
          display: flex;
          gap: 20px;
          justify-content: center;
          width: 100%;
        }
        .lifeos-score-widget .score-tile {
          background: transparent; /* No background for individual tiles within the widget */
          border: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: default;
          position: relative;
          flex: 1;
          max-width: 100px; /* Limit width for individual rings */
        }
        .lifeos-score-widget .score-ring {
          position: relative;
          width: 100px;
          height: 100px;
          margin-bottom: 8px;
        }
        .lifeos-score-widget .score-ring svg {
          transform: rotate(-90deg);
          overflow: visible;
        }
        .lifeos-score-widget .score-ring circle.track {
          stroke: var(--bg-overlay);
          stroke-width: 8;
        }
        .lifeos-score-widget .score-ring circle.fill {
          stroke-linecap: round;
          stroke-width: 8;
        }
        .lifeos-score-widget .score-num {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .lifeos-score-widget .score-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          text-align: center;
        }
        @keyframes ring-fill {
          from { opacity: 0.2; }
          to { opacity: 1; }
        }
        @media (max-width: 480px) {
          .lifeos-score-widget-grid {
            flex-direction: column;
            align-items: center;
          }
        }
      </style>
      <div class="lifeos-score-widget">
        <h3 class="lifeos-score-widget-date">${getTodayDate()}</h3>
        <div class="lifeos-score-widget-grid">
          ${scoreTiles}
        </div>
      </div>
    `;
  }

  function renderError(message = 'Failed to load scores') {
    if (!_container) return;
    _container.innerHTML = `
      <style>
        .lifeos-score-widget {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          color: var(--text-primary);
        }
        .lifeos-score-widget-date {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .lifeos-score-widget-grid {
          display: flex;
          gap: 20px;
          justify-content: center;
          width: 100%;
        }
        .lifeos-score-widget .score-tile {
          background: transparent; /* No background for individual tiles within the widget */
          border: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: default;
          position: relative;
          flex: 1;
          max-width: 100px; /* Limit width for individual rings */
        }
        .lifeos-score-widget .score-ring {
          position: relative;
          width: 100px;
          height: 100px;
          margin-bottom: 8px;
        }
        .lifeos-score-widget .score-ring svg {
          transform: rotate(-90deg);
          overflow: visible;
        }
        .lifeos-score-widget .score-ring circle.track {
          stroke: var(--bg-overlay);
          stroke-width: 8;
        }
        .lifeos-score-widget .score-ring circle.fill {
          stroke-linecap: round;
          stroke-width: 8;
        }
        .lifeos-score-widget .score-num {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .lifeos-score-widget .score-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          text-align: center;
        }
        @keyframes ring-fill {
          from { opacity: 0.2; }
          to { opacity: 1; }
        }
        @media (max-width: 480px) {
          .lifeos-score-widget-grid {
            flex-direction: column;
            align-items: center;
          }
        }
      </style>
      <div class="lifeos-score-widget">
        <h3 class="lifeos-score-widget-date">${getTodayDate()}</h3>
        <div class="lifeos-score-widget-grid">
          ${SCORE_METRICS.map(metric => `
            <div class="score-tile">
              <div class="score-ring">
                ${createRingSVG(0, 'var(--text-muted, #555566)', false)}
                <div class="score-num" style="color:var(--text-muted, #555566)">—</div>
              </div>
              <div class="score-label">${metric.label}</div>
            </div>
          `).join('')}
        </div>
        <div style="color: var(--c-conflict, #e05555); font-size: 13px; text-align: center;">${message}</div>
      </div>
    `;
  }

  async function refresh() {
    if (!_container) {
      console.warn('LifeOSWidgetScore: Container not mounted. Call mount() first.');
      return;
    }
    renderSkeleton();
    try {
      const data = await fetchData();
      renderScores(data);
    } catch (error) {
      console.error('LifeOSWidgetScore fetch error:', error);
      renderError(error.message);
    }
  }

  function mount({ container, user, commandKey }) {
    if (typeof container === 'string') {
      _container = document.getElementById(container);
      if (!_container) {
        console.error(`LifeOSWidgetScore: Container element with ID "${container}" not found.`);
        return;
      }
    } else if (container instanceof HTMLElement) {
      _container = container;
    } else {
      console.error('LifeOSWidgetScore: Invalid container provided. Must be an ID string or HTMLElement.');
      return;
    }

    _userHandle = user;
    _commandKey = commandKey || window.lifeosCommandKey || localStorage.getItem('commandKey');

    if (!_userHandle) {
      console.warn('LifeOSWidgetScore: User handle not provided. Widget may not function correctly.');
    }
    if (!_commandKey) {
      console.warn('LifeOSWidgetScore: Command key not found. API requests may fail.');
    }

    refresh();
  }

  window.LifeOSWidgetScore = {
    mount,
    refresh
  };

  // Auto-mount if the target element exists and global keys are available
  document.addEventListener('DOMContentLoaded', () => {
    const defaultContainer = document.getElementById('lifeos-widget-score');
    if (defaultContainer) {
      const defaultUser = defaultContainer.dataset.user || 'default'; // Assuming user handle might be in data-user
      const defaultCommandKey = window.lifeosCommandKey || localStorage.getItem('commandKey');
      if (defaultUser && defaultCommandKey) {
        window.LifeOSWidgetScore.mount({
          container: defaultContainer,
          user: defaultUser,
          commandKey: defaultCommandKey
        });
      } else {
        console.warn('LifeOSWidgetScore: Auto-mount skipped. Missing user handle or command key.');
        renderError('Missing user handle or command key for auto-mount.', defaultContainer);
      }
    }
  });

})();