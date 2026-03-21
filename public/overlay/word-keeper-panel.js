/**
 * public/overlay/word-keeper-panel.js — Amendment 16 (Word Keeper)
 *
 * Overlay widget: integrity score chip + quick actions.
 * Injected into the Command Center overlay.
 * Auto-refreshes every 5 minutes.
 */

(function () {
  'use strict';

  const API = '/api/v1/word-keeper';
  const KEY = window.COMMAND_CENTER_KEY || localStorage.getItem('wk_key') || '';
  const headers = { 'Content-Type': 'application/json', 'x-api-key': KEY };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const STYLES = `
    #wk-panel {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      position: relative;
    }
    #wk-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(30,41,59,0.95);
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
      transition: border-color 0.2s;
    }
    #wk-chip:hover { border-color: #6366f1; }
    #wk-score-num {
      font-size: 20px;
      font-weight: 800;
      color: #22d3ee;
      line-height: 1;
    }
    #wk-score-info { line-height: 1.3; }
    #wk-score-title { font-size: 11px; color: #6366f1; font-weight: 600; }
    #wk-score-stats { font-size: 11px; color: #94a3b8; }
    #wk-streak { font-size: 13px; }
    #wk-dropdown {
      display: none;
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      width: 280px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      z-index: 9999;
    }
    #wk-dropdown.open { display: block; }
    .wk-section-title {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
      color: #94a3b8; font-weight: 600; margin-bottom: 8px; margin-top: 12px;
    }
    .wk-section-title:first-child { margin-top: 0; }
    .wk-commitment {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .wk-commitment .wk-c-text { color: #f1f5f9; margin-bottom: 4px; }
    .wk-commitment .wk-c-meta { color: #94a3b8; font-size: 11px; }
    .wk-commitment .wk-c-actions { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
    .wk-btn {
      padding: 4px 8px; border-radius: 6px; border: 1px solid;
      background: transparent; font-size: 11px; cursor: pointer;
      transition: all 0.15s;
    }
    .wk-btn.green { border-color: #10b981; color: #10b981; }
    .wk-btn.green:hover { background: #10b981; color: white; }
    .wk-btn.red   { border-color: #ef4444; color: #ef4444; }
    .wk-btn.red:hover { background: #ef4444; color: white; }
    .wk-btn.yellow{ border-color: #f59e0b; color: #f59e0b; }
    .wk-btn.yellow:hover { background: #f59e0b; color: black; }
    .wk-btn.accent{ border-color: #6366f1; color: #6366f1; }
    .wk-btn.accent:hover { background: #6366f1; color: white; }
    .wk-score-bar-wrap {
      background: #0f172a; border-radius: 99px; height: 6px;
      overflow: hidden; margin: 8px 0;
    }
    .wk-score-bar {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg, #6366f1, #22d3ee);
      transition: width 0.8s ease;
    }
    .wk-quick-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .wk-full-link {
      display: block; text-align: center; margin-top: 10px;
      font-size: 11px; color: #6366f1; text-decoration: none;
      padding: 6px; border: 1px solid #334155; border-radius: 8px;
    }
    .wk-full-link:hover { border-color: #6366f1; }
    .wk-empty { font-size: 12px; color: #94a3b8; text-align: center; padding: 8px; }
    .wk-badge { display:inline-block; padding:2px 6px; border-radius:99px; font-size:10px; font-weight:600; }
    .wk-badge.pending   { background:rgba(245,158,11,0.15); color:#f59e0b; }
    .wk-badge.confirmed { background:rgba(99,102,241,0.15); color:#6366f1; }
  `;

  // ── Inject styles ─────────────────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // ── Build DOM ─────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'wk-panel';
  panel.innerHTML = `
    <div id="wk-chip">
      <div id="wk-score-num">—</div>
      <div id="wk-score-info">
        <div id="wk-score-title">Word Keeper</div>
        <div id="wk-score-stats">Loading…</div>
      </div>
      <div id="wk-streak">🔥</div>
    </div>
    <div id="wk-dropdown">
      <div class="wk-section-title">Integrity Score</div>
      <div id="wk-dd-score-num" style="font-size:28px;font-weight:800;color:#22d3ee">—</div>
      <div id="wk-dd-title" style="font-size:12px;color:#6366f1;margin-top:2px">—</div>
      <div class="wk-score-bar-wrap">
        <div class="wk-score-bar" id="wk-dd-bar" style="width:0%"></div>
      </div>
      <div style="display:flex;gap:12px;font-size:11px;color:#94a3b8;margin-bottom:4px">
        <span>✅ <span id="wk-dd-kept">—</span> kept</span>
        <span>❌ <span id="wk-dd-broken">—</span> broken</span>
        <span>🔥 <span id="wk-dd-streak">—</span> streak</span>
      </div>

      <div class="wk-section-title">Upcoming</div>
      <div id="wk-dd-commitments"><div class="wk-empty">Loading…</div></div>

      <div class="wk-section-title">Quick Actions</div>
      <div class="wk-quick-actions">
        <button class="wk-btn accent" onclick="wkAddCommitment()">➕ Add</button>
        <button class="wk-btn yellow" onclick="wkOpenMediator()">🕊️ Mediator</button>
        <button class="wk-btn accent" onclick="wkOpenApp()">📱 Open App</button>
      </div>

      <a class="wk-full-link" href="/products/word-keeper/" target="_blank">Open Word Keeper →</a>
    </div>
  `;

  // ── Mount — wait for overlay container ────────────────────────────────────
  function mount() {
    const container = document.getElementById('overlay-panels')
      || document.getElementById('command-center-panels')
      || document.body;
    container.appendChild(panel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // ── Toggle dropdown ───────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const chip = document.getElementById('wk-chip');
    const dropdown = document.getElementById('wk-dropdown');
    if (chip?.contains(e.target)) {
      dropdown.classList.toggle('open');
    } else if (!dropdown?.contains(e.target)) {
      dropdown?.classList.remove('open');
    }
  });

  // ── Load data ─────────────────────────────────────────────────────────────
  async function refresh() {
    try {
      const r = await fetch(`${API}/score`, { headers });
      if (!r.ok) return;
      const d = await r.json();

      // Chip
      document.getElementById('wk-score-num').textContent = d.score;
      document.getElementById('wk-score-title').textContent = `L${d.level}: ${d.title}`;
      document.getElementById('wk-score-stats').textContent = `${d.keepRate}% keep rate`;
      document.getElementById('wk-streak').textContent = `🔥 ${d.streak.current}`;

      // Dropdown score
      document.getElementById('wk-dd-score-num').textContent = d.score;
      document.getElementById('wk-dd-title').textContent = `Level ${d.level} — ${d.title}`;
      document.getElementById('wk-dd-bar').style.width = `${d.score / 10}%`;
      document.getElementById('wk-dd-kept').textContent = d.counts.kept;
      document.getElementById('wk-dd-broken').textContent = d.counts.broken;
      document.getElementById('wk-dd-streak').textContent = d.streak.current;
    } catch (e) { /* silent */ }

    // Pending commitments
    try {
      const r2 = await fetch(`${API}/commitments?status=confirmed&limit=5`, { headers });
      if (!r2.ok) return;
      const d2 = await r2.json();
      const el = document.getElementById('wk-dd-commitments');

      if (!d2.commitments?.length) {
        el.innerHTML = '<div class="wk-empty">No pending commitments</div>';
      } else {
        el.innerHTML = d2.commitments.map(c => `
          <div class="wk-commitment" id="wk-c-${c.id}">
            <div class="wk-c-text">${esc(c.normalized_text || c.raw_text)}</div>
            <div class="wk-c-meta">${c.deadline ? fmtDate(c.deadline) : 'No deadline'} ${c.to_person ? '• ' + esc(c.to_person) : ''}</div>
            <div class="wk-c-actions">
              <button class="wk-btn green" onclick="wkAction(${c.id},'kept')">✓ Kept</button>
              <button class="wk-btn red"   onclick="wkAction(${c.id},'broken')">✗ Broken</button>
              <button class="wk-btn yellow" onclick="wkAction(${c.id},'honourable_exit')">🚪 Exit</button>
            </div>
          </div>
        `).join('');
      }
    } catch (e) { /* silent */ }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  window.wkAction = async function(id, action) {
    try {
      await fetch(`${API}/commitments/${id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ action }),
      });
      await refresh();
    } catch (e) { console.warn('[WK] action failed:', e); }
  };

  window.wkAddCommitment = function() {
    const text = prompt('Enter your commitment:');
    if (!text) return;
    fetch(`${API}/commitments`, {
      method: 'POST', headers,
      body: JSON.stringify({ rawText: text }),
    }).then(() => refresh());
  };

  window.wkOpenMediator = async function() {
    const other = prompt('Other person\'s name (optional):');
    try {
      const r = await fetch(`${API}/mediator/start`, {
        method: 'POST', headers,
        body: JSON.stringify({ otherParty: other || null, triggerMethod: 'manual' }),
      });
      const d = await r.json();
      alert(d.message);
    } catch (e) { alert('Error starting mediator'); }
  };

  window.wkOpenApp = function() {
    window.open('/products/word-keeper/', '_blank');
  };

  // ── Utilities ─────────────────────────────────────────────────────────────
  function esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ── Init + auto-refresh every 5 min ──────────────────────────────────────
  refresh();
  setInterval(refresh, 5 * 60 * 1000);

})();
