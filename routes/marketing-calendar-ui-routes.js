// SYNOPSIS: MarketingOS Phase 2 UI routes for content calendar and atom library browser.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { sharedMarketingClientAuth } from './marketing-session-ui-routes.js';

const HTML_CT = 'text/html; charset=utf-8';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pageShell({ title, body, script }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f7fb;
      --panel: #ffffff;
      --text: #182033;
      --muted: #667085;
      --line: #e6e8f0;
      --accent: #5b6cff;
      --accent-2: #eef1ff;
      --success: #067647;
      --warn: #b54708;
      --shadow: 0 10px 30px rgba(16, 24, 40, 0.08);
      --radius: 16px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #f9faff 0%, var(--bg) 100%);
      color: var(--text);
    }
    a { color: inherit; text-decoration: none; }
    .wrap {
      max-width: 1180px;
      margin: 0 auto;
      padding: 24px 18px 40px;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }
    .brand {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .brand h1 {
      margin: 0;
      font-size: 24px;
      letter-spacing: -0.02em;
    }
    .brand p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }
    .nav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .nav a {
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255,255,255,0.8);
      font-size: 14px;
    }
    .nav a.active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 18px;
    }
    .stack { display: grid; gap: 16px; }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .muted { color: var(--muted); }
    .toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }
    .btn, button, input, select, textarea {
      font: inherit;
    }
    .btn, button {
      border: 1px solid var(--line);
      background: white;
      color: var(--text);
      border-radius: 12px;
      padding: 10px 14px;
      cursor: pointer;
    }
    .btn.primary, button.primary {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    .btn.ghost {
      background: transparent;
    }
    .field {
      display: grid;
      gap: 6px;
      min-width: 220px;
    }
    .field label {
      font-size: 13px;
      color: var(--muted);
    }
    .field input, .field textarea, .field select {
      width: 100%;
      border: 1px solid var(--line);
      background: white;
      border-radius: 12px;
      padding: 10px 12px;
      color: var(--text);
    }
    .calendar {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 10px;
    }
    .weekday {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0 4px;
    }
    .day {
      min-height: 126px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: #fff;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .day.empty {
      background: rgba(255,255,255,0.6);
      border-style: dashed;
    }
    .day-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: baseline;
    }
    .day-num {
      font-weight: 700;
      font-size: 14px;
    }
    .piece {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 8px;
      background: #fbfcff;
      display: grid;
      gap: 6px;
    }
    .piece-title {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.35;
    }
    .piece-meta {
      font-size: 12px;
      color: var(--muted);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--success);
      background: #ecfdf3;
      border-radius: 999px;
      padding: 4px 8px;
      width: fit-content;
    }
    .split {
      display: grid;
      grid-template-columns: 1.4fr 0.9fr;
      gap: 16px;
      align-items: start;
    }
    .list {
      display: grid;
      gap: 12px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
      background: white;
      display: grid;
      gap: 10px;
    }
    .card h3, .card h4 { margin: 0; }
    .card p { margin: 0; color: var(--muted); }
    .atom-grid {
      display: grid;
      gap: 12px;
    }
    .atom {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
      background: #fff;
      display: grid;
      gap: 8px;
    }
    .atom-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
    }
    .atom-text {
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .status {
      font-size: 13px;
      padding: 8px 10px;
      border-radius: 12px;
      background: #f2f4f7;
      color: var(--muted);
    }
    .status.ok { background: #ecfdf3; color: var(--success); }
    .status.err { background: #fef3f2; color: var(--warn); }
    @media (max-width: 980px) {
      .split { grid-template-columns: 1fr; }
    }
    @media (max-width: 760px) {
      .calendar { grid-template-columns: repeat(1, minmax(0, 1fr)); }
      .weekday { display: none; }
      .topbar, .row { align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    ${body}
  </div>
  <script>
${sharedMarketingClientAuth}
${script}
  </script>
</body>
</html>`;
}

function calendarPageHtml() {
  const body = `
    <div class="topbar">
      <div class="brand">
        <h1>Marketing calendar</h1>
        <p>30-day content schedule view with browser-side API updates.</p>
      </div>
      <div class="nav">
        <a href="/marketing/calendar" class="active">Calendar</a>
        <a href="/marketing/atoms">Atom library</a>
      </div>
    </div>

    <div class="panel stack">
      <div class="row">
        <div>
          <h2 style="margin:0 0 6px;">Content calendar</h2>
          <div class="muted">Loads scheduled content from <code>/api/v1/marketing/calendar</code> and allows changing scheduled dates.</div>
        </div>
        <div class="toolbar">
          <button class="btn" id="refreshBtn" type="button">Refresh</button>
        </div>
      </div>

      <div class="status" id="status">Loading calendar…</div>
      <div class="calendar" id="weekdayRow">
        <div class="weekday">Sun</div><div class="weekday">Mon</div><div class="weekday">Tue</div><div class="weekday">Wed</div><div class="weekday">Thu</div><div class="weekday">Fri</div><div class="weekday">Sat</div>
      </div>
      <div class="calendar" id="calendarGrid"></div>
    </div>
  `;

  const script = `
(() => {
  const statusEl = document.getElementById('status');
  const gridEl = document.getElementById('calendarGrid');
  const refreshBtn = document.getElementById('refreshBtn');

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }

  function fmtDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function buildDays() {
    const today = startOfToday();
    const first = new Date(today);
    const currentDow = first.getDay();
    const days = [];
    for (let i = 0; i < currentDow; i++) days.push(null);
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }

  async function loadCalendar() {
    setStatus('Loading calendar…');
    gridEl.innerHTML = '';
    try {
      const res = await marketingFetch('/api/v1/marketing/calendar', { headers: { 'accept': 'application/json' } });
      if (!res.ok) throw new Error('Failed to load calendar: ' + res.status);
      const data = await res.json();
      const slots = Array.isArray(data?.slots) ? data.slots : (Array.isArray(data) ? data : []);
      const byDate = new Map();
      for (const slot of slots) {
        const key = slot && (slot.scheduled_date || slot.date || slot.day);
        if (!key) continue;
        const list = byDate.get(key) || [];
        list.push(slot);
        byDate.set(key, list);
      }

      const days = buildDays();
      for (const day of days) {
        const cell = document.createElement('div');
        if (!day) {
          cell.className = 'day empty';
          gridEl.appendChild(cell);
          continue;
        }
        const dateKey = fmtDate(day);
        cell.className = 'day';
        const items = byDate.get(dateKey) || [];
        cell.innerHTML = '<div class="day-head"><div class="day-num">' + esc(dateKey) + '</div><div class="badge">' + items.length + ' piece' + (items.length === 1 ? '' : 's') + '</div></div>';

        const list = document.createElement('div');
        list.className = 'list';

        if (!items.length) {
          const empty = document.createElement('div');
          empty.className = 'muted';
          empty.textContent = 'No scheduled content';
          list.appendChild(empty);
        } else {
          for (const item of items) {
            const piece = document.createElement('div');
            piece.className = 'piece';

            const title = item.title || item.content_title || item.content_piece_title || item.content_piece?.title || 'Untitled piece';
            const platform = item.platform || item.content_piece?.platform || 'Unknown platform';
            const id = item.content_piece_id || item.content_piece?.id || '';

            piece.innerHTML =
              '<div class="piece-title">' + esc(title) + '</div>' +
              '<div class="piece-meta">Platform: ' + esc(platform) + (id ? ' · ID: ' + esc(id) : '') + '</div>' +
              '<label class="field" style="min-width:0;"><span class="muted">Mark scheduled date</span><input type="date" value="' + esc(dateKey) + '" data-piece-id="' + esc(id) + '" /></label>' +
              '<button class="btn primary" type="button" data-save-piece="' + esc(id) + '">Save date</button>';
            list.appendChild(piece);
          }
        }

        cell.appendChild(list);
        gridEl.appendChild(cell);
      }

      gridEl.querySelectorAll('button[data-save-piece]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const pieceId = btn.getAttribute('data-save-piece');
          const input = gridEl.querySelector('input[data-piece-id="' + CSS.escape(pieceId) + '"]');
          const scheduledDate = input && input.value;
          if (!pieceId || !scheduledDate) return;
          btn.disabled = true;
          setStatus('Saving scheduled date…');
          try {
            const res = await marketingFetch('/api/v1/marketing/calendar', {
              method: 'POST',
              headers: { 'accept': 'application/json' },
              body: JSON.stringify({ content_piece_id: pieceId, scheduled_date: scheduledDate })
            });
            if (!res.ok) throw new Error('Save failed: ' + res.status);
            setStatus('Scheduled date updated.', 'ok');
          } catch (err) {
            setStatus(String(err && err.message ? err.message : err), 'err');
          } finally {
            btn.disabled = false;
          }
        });
      });

      setStatus('Loaded ' + slots.length + ' scheduled item' + (slots.length === 1 ? '' : 's') + '.', 'ok');
    } catch (err) {
      setStatus(String(err && err.message ? err.message : err), 'err');
    }
  }

  refreshBtn.addEventListener('click', loadCalendar);
  loadCalendar();
})();
`;

  return pageShell({ title: 'Marketing calendar', body, script });
}

function atomsPageHtml() {
  const body = `
    <div class="topbar">
      <div class="brand">
        <h1>Atom library</h1>
        <p>Browser for reusable marketing atoms with create flow via the JSON API.</p>
      </div>
      <div class="nav">
        <a href="/marketing/calendar">Calendar</a>
        <a href="/marketing/atoms" class="active">Atom library</a>
      </div>
    </div>

    <div class="split">
      <div class="panel stack">
        <div class="row">
          <div>
            <h2 style="margin:0 0 6px;">Library</h2>
            <div class="muted">Loads from <code>/api/v1/marketing/atoms</code>.</div>
          </div>
          <button class="btn" id="refreshAtomsBtn" type="button">Refresh</button>
        </div>
        <div class="status" id="atomsStatus">Loading atoms…</div>
        <div class="atom-grid" id="atomsList"></div>
      </div>

      <div class="panel stack">
        <div>
          <h2 style="margin:0 0 6px;">Create atom</h2>
          <div class="muted">Posts a new atom to <code>/api/v1/marketing/atoms</code>.</div>
        </div>
        <form id="atomForm" class="stack">
          <label class="field">
            <span>Atom type</span>
            <input name="atom_type" placeholder="e.g. hook, story, insight, CTA" required />
          </label>
          <label class="field">
            <span>Text</span>
            <textarea name="text" rows="7" placeholder="Write the reusable marketing atom…" required></textarea>
          </label>
          <label class="field">
            <span>Tags</span>
            <input name="tags" placeholder="comma,separated,tags" />
          </label>
          <label class="field">
            <span>Reuse consent level</span>
            <input name="reuse_consent_level" placeholder="e.g. session_only, 90d, perpetual" />
          </label>
          <button class="btn primary" type="submit">Save atom</button>
        </form>
      </div>
    </div>
  `;

  const script = `
(() => {
  const statusEl = document.getElementById('atomsStatus');
  const listEl = document.getElementById('atomsList');
  const refreshBtn = document.getElementById('refreshAtomsBtn');
  const form = document.getElementById('atomForm');

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }

  async function loadAtoms() {
    setStatus('Loading atoms…');
    listEl.innerHTML = '';
    try {
      const res = await marketingFetch('/api/v1/marketing/atoms', { headers: { 'accept': 'application/json' } });
      if (!res.ok) throw new Error('Failed to load atoms: ' + res.status);
      const data = await res.json();
      const atoms = Array.isArray(data?.atoms) ? data.atoms : (Array.isArray(data) ? data : []);
      if (!atoms.length) {
        listEl.innerHTML = '<div class="card"><p>No atoms yet.</p></div>';
        setStatus('Loaded 0 atoms.', 'ok');
        return;
      }

      for (const atom of atoms) {
        const card = document.createElement('div');
        card.className = 'atom';
        const tags = Array.isArray(atom.tags) ? atom.tags.join(', ') : (atom.tags || '');
        card.innerHTML =
          '<div class="atom-top">' +
            '<div>' +
              '<h3>' + esc(atom.atom_type || 'Atom') + '</h3>' +
              '<div class="muted">ID: ' + esc(atom.id || '') + '</div>' +
            '</div>' +
            '<div class="status">' + esc(atom.reuse_consent_level || 'unspecified') + '</div>' +
          '</div>' +
          '<div class="atom-text">' + esc(atom.text || '') + '</div>' +
          '<div class="muted">Tags: ' + esc(tags || '—') + '</div>';
        listEl.appendChild(card);
      }

      setStatus('Loaded ' + atoms.length + ' atom' + (atoms.length === 1 ? '' : 's') + '.', 'ok');
    } catch (err) {
      setStatus(String(err && err.message ? err.message : err), 'err');
    }
  }

  refreshBtn.addEventListener('click', loadAtoms);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      atom_type: form.atom_type.value.trim(),
      text: form.text.value.trim(),
      tags: form.tags.value.trim(),
      reuse_consent_level: form.reuse_consent_level.value.trim()
    };
    if (!payload.atom_type || !payload.text) return;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    setStatus('Saving atom…');
    try {
      const res = await marketingFetch('/api/v1/marketing/atoms', {
        method: 'POST',
        headers: { 'accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed: ' + res.status);
      form.reset();
      setStatus('Atom saved.', 'ok');
      await loadAtoms();
    } catch (err) {
      setStatus(String(err && err.message ? err.message : err), 'err');
    } finally {
      submitBtn.disabled = false;
    }
  });

  loadAtoms();
})();
`;

  return pageShell({ title: 'Atom library', body, script });
}

export function registerMarketingCalendarUiRoutes(app, deps) {
  app.get('/marketing/calendar', (req, res) => {
    res.status(200).type(HTML_CT).send(calendarPageHtml());
  });

  app.get('/marketing/atoms', (req, res) => {
    res.status(200).type(HTML_CT).send(atomsPageHtml());
  });
}

export default registerMarketingCalendarUiRoutes;