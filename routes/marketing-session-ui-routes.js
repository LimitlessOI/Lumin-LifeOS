// SYNOPSIS: SocialMediaOS / MarketingOS Phase 1 SSR UI — consent → coach → extract → generate → approve → export
// @ssot docs/products/marketingos/PRODUCT_HOME.md

function escapeHtml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const sharedMarketingClientAuth = `
      (function bootstrapMarketingAuth() {
        try {
          const q = new URLSearchParams(location.search);
          const ck = q.get('commandKey') || q.get('command_key') || q.get('key');
          if (ck) {
            localStorage.setItem('command_key', ck);
            localStorage.setItem('commandKey', ck);
          }
          if (q.get('shell') === '1') {
            document.documentElement.classList.add('in-lifeos-shell');
            try {
              if (window.parent && window.parent !== window) {
                const pKey = window.parent.localStorage?.getItem?.('command_key')
                  || window.parent.localStorage?.getItem?.('lifeos_command_key')
                  || window.parent.localStorage?.getItem?.('COMMAND_CENTER_KEY')
                  || '';
                if (pKey && !localStorage.getItem('command_key')) {
                  localStorage.setItem('command_key', pKey);
                  localStorage.setItem('commandKey', pKey);
                }
                const pTok = window.parent.localStorage?.getItem?.('lifeos_access_token') || '';
                if (pTok && !localStorage.getItem('lifeos_access_token')) {
                  localStorage.setItem('lifeos_access_token', pTok);
                }
                const pUser = window.parent.localStorage?.getItem?.('lifeos_user') || '';
                if (pUser && !localStorage.getItem('lifeos_user')) {
                  localStorage.setItem('lifeos_user', pUser);
                }
              }
            } catch (_) {}
          }
        } catch (_) {}
      })();
      function marketingInShell() {
        return document.documentElement.classList.contains('in-lifeos-shell');
      }
      function marketingHref(path) {
        if (!path || !marketingInShell()) return path;
        try {
          const u = new URL(path, location.origin);
          if (u.origin !== location.origin) return path;
          if (!u.pathname.startsWith('/marketing')) return path;
          u.searchParams.set('shell', '1');
          return u.pathname + u.search + u.hash;
        } catch {
          return path;
        }
      }
      function marketingAuthHeaders(extra = {}) {
        const h = { 'Content-Type': 'application/json', ...extra };
        const token = localStorage.getItem('lifeos_access_token') || '';
        const key = localStorage.getItem('command_key')
          || localStorage.getItem('commandKey')
          || localStorage.getItem('lifeos_command_key')
          || localStorage.getItem('COMMAND_CENTER_KEY')
          || localStorage.getItem('lifeos_key')
          || '';
        if (token) h['Authorization'] = 'Bearer ' + token;
        else if (key) { h['x-command-key'] = key; h['x-api-key'] = key; }
        return h;
      }
      function marketingOwnerId() {
        try {
          const stored = localStorage.getItem('lifeos_user') || localStorage.getItem('lifeosUser') || '';
          const token = localStorage.getItem('lifeos_access_token') || '';
          if (!token) return stored || 'adam';
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
          // Prefer human handle over numeric sub — YouTube OAuth rows key on owner_id=adam.
          const handle = String(payload.handle || payload.user_handle || stored || '').trim();
          if (handle) return handle;
          const sub = String(payload.sub || '').trim();
          if (sub && !/^\d+$/.test(sub)) return sub;
          return stored || 'adam';
        } catch {
          return localStorage.getItem('lifeos_user') || localStorage.getItem('lifeosUser') || 'adam';
        }
      }
      function marketingHasAuth() {
        return !!(localStorage.getItem('lifeos_access_token')
          || localStorage.getItem('command_key')
          || localStorage.getItem('commandKey')
          || localStorage.getItem('lifeos_command_key')
          || localStorage.getItem('COMMAND_CENTER_KEY')
          || localStorage.getItem('lifeos_key'));
      }
      async function marketingFetch(url, opts = {}) {
        if (!marketingHasAuth()) {
          const next = encodeURIComponent(location.pathname + location.search);
          location.href = '/overlay/lifeos-login.html?next=' + next;
          throw new Error('Sign in to LifeOS to use SocialMediaOS.');
        }
        const headers = marketingAuthHeaders(opts.headers || {});
        const res = await fetch(url, { ...opts, headers });
        if (res.status === 401) {
          const next = encodeURIComponent(location.pathname + location.search);
          location.href = '/overlay/lifeos-login.html?next=' + next;
          throw new Error('Session expired — sign in again.');
        }
        return res;
      }
      document.addEventListener('click', function(e) {
        const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a || !marketingInShell()) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('http')) return;
        if (!href.startsWith('/marketing')) return;
        e.preventDefault();
        location.href = marketingHref(href);
      });
      document.addEventListener('DOMContentLoaded', function() {
        if (!marketingInShell()) return;
        const back = document.querySelector('.lifeos-back');
        if (back) back.style.display = 'none';
      });
      function escapeHtml(unsafe) {
        return String(unsafe ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
      function showMsg(el, text, kind) {
        el.innerText = text;
        el.className = 'message ' + (kind || '');
        el.style.display = 'block';
      }
    `;

function renderPage(title, bodyHtml, clientScript = '') {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title === 'SocialMediaOS' ? 'SocialMediaOS' : `${title} · SocialMediaOS`)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet">
    <style>
        :root, html[data-theme="dark"] {
          --bg: #0b1412;
          --bg-glow: rgba(20, 113, 108, 0.16);
          --surface: #121c1a;
          --surface-2: #182421;
          --border: rgba(255,255,255,0.09);
          --text: #f2f7f5;
          --muted: #9bb0aa;
          --accent: #1f8f86;
          --accent-soft: rgba(31, 143, 134, 0.16);
          --accent-ink: #041413;
          --ok: #34d399;
          --warn: #fbbf24;
          --bad: #f87171;
          --link: #7dd3c7;
          --tp-text: #fff;
        }
        html[data-theme="light"] {
          --bg: #f3efe6;
          --bg-glow: rgba(13, 148, 136, 0.1);
          --surface: #fffcf7;
          --surface-2: #f7f2e8;
          --border: rgba(28, 25, 23, 0.12);
          --text: #1c1917;
          --muted: #78716c;
          --accent: #0f766e;
          --accent-soft: rgba(15, 118, 110, 0.12);
          --accent-ink: #fff;
          --ok: #047857;
          --warn: #b45309;
          --bad: #b91c1c;
          --link: #0f766e;
          --tp-text: #1c1917;
        }
        * { box-sizing: border-box; }
        body {
          font-family: "DM Sans", "Avenir Next", system-ui, sans-serif;
          margin: 0; padding: 20px;
          background:
            radial-gradient(900px 420px at 8% -8%, var(--bg-glow), transparent 55%),
            radial-gradient(700px 380px at 100% 0%, rgba(255,255,255,0.03), transparent 50%),
            var(--bg);
          color: var(--text); line-height: 1.55;
        }
        .container { max-width: 960px; margin: 28px auto; background: var(--surface); padding: 28px 32px 36px; border-radius: 20px; border: 1px solid var(--border); overflow-x: clip; }
        .topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .topbar > div:first-child { min-width: 0; flex: 1; }
        .brand { font-family: "Syne", "Trebuchet MS", sans-serif; font-size: clamp(1.35rem, 4.2vw, 2.35rem); letter-spacing: -0.03em; color: var(--text); font-weight: 800; line-height: 1.05; margin: 0; border: none; padding: 0; overflow-wrap: anywhere; word-break: break-word; max-width: 100%; }
        .brand-sub { font-size: 13px; color: var(--muted); margin: 6px 0 0; max-width: 42ch; }
        .theme-toggle { display: inline-flex; border: 1px solid var(--border); border-radius: 999px; overflow: hidden; background: var(--surface-2); }
        .theme-toggle button { background: transparent; color: var(--muted); border: none; border-radius: 0; padding: 8px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .theme-toggle button.active { background: var(--accent); color: var(--accent-ink); }
        .app-mode { font-size: 12px; color: var(--muted); margin-bottom: 16px; }
        h1, h2 { color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 10px; margin: 0 0 18px; font-family: "Syne", "Trebuchet MS", sans-serif; letter-spacing: -0.02em; }
        h1 { font-size: 1.35rem; border: none; padding: 0; margin-bottom: 8px; }
        p, li { color: var(--muted); }
        a { color: var(--link); text-decoration: none; }
        a:hover { text-decoration: underline; }
        .actions-row { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; }
        button, input[type="submit"], a.btn { background: var(--accent); color: var(--accent-ink); padding: 11px 16px; border: none; border-radius: 999px; cursor: pointer; font-size: 14px; font-weight: 600; display: inline-block; text-decoration: none; }
        a.btn:hover { text-decoration: none; filter: brightness(1.05); }
        button.secondary, a.btn.secondary { background: transparent; border: 1px solid var(--border); color: var(--text); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        button:hover:not(:disabled) { filter: brightness(1.05); }
        input[type="text"], textarea, select { width: 100%; padding: 10px 12px; margin-top: 5px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 12px; font-size: 15px; background: var(--surface-2); color: var(--text); }
        textarea { min-height: 120px; resize: vertical; }
        label { display: block; margin-bottom: 5px; font-weight: 600; color: var(--text); }
        .message { padding: 10px 14px; border-radius: 12px; margin-bottom: 14px; }
        .message.success { background: color-mix(in srgb, var(--ok) 16%, transparent); color: var(--ok); border: 1px solid color-mix(in srgb, var(--ok) 35%, transparent); }
        .message.error { background: color-mix(in srgb, var(--bad) 14%, transparent); color: var(--bad); border: 1px solid color-mix(in srgb, var(--bad) 30%, transparent); }
        .form-group { margin-bottom: 16px; }
        .coach-message { background: color-mix(in srgb, var(--ok) 10%, transparent); padding: 14px; border-radius: 12px; margin-bottom: 12px; border-left: 4px solid var(--ok); }
        .user-message { background: var(--accent-soft); padding: 14px; border-radius: 12px; margin-bottom: 12px; border-right: 4px solid var(--accent); text-align: right; }
        .hook-detected { color: var(--warn); font-weight: 700; margin-top: 6px; }
        .coach-cue { color: var(--ok); font-weight: 600; margin-top: 6px; font-size: 13px; }
        .coach-more { color: var(--warn); font-weight: 600; margin-top: 6px; font-size: 13px; }
        .content-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
        .content-card h3 { margin-top: 0; color: var(--text); }
        .content-card .actions { text-align: right; margin-top: 12px; }
        .content-card .actions button { margin-left: 8px; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 0.75em; font-weight: 700; text-transform: uppercase; }
        .status-badge.draft, .status-badge.pending { background: color-mix(in srgb, var(--warn) 18%, transparent); color: var(--warn); }
        .status-badge.approved { background: color-mix(in srgb, var(--ok) 18%, transparent); color: var(--ok); }
        .status-badge.rejected { background: color-mix(in srgb, var(--bad) 18%, transparent); color: var(--bad); }
        .nav-links { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 18px; }
        .lifeos-back { font-size: 13px; margin-bottom: 12px; }
        .yt-panel { margin: 22px 0; padding: 18px; border: 1px solid var(--border); border-radius: 16px; background: var(--surface-2); }
        .yt-panel h2 { border: none; margin: 0 0 8px; padding: 0; font-size: 1.15rem; }
        .mode-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; margin: 12px 0 4px; }
        .mode-chip { text-align: left; background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: 14px; padding: 10px 12px; cursor: pointer; font-size: 12px; line-height: 1.35; }
        .mode-chip strong { display: block; font-size: 13px; margin-bottom: 2px; color: var(--text); }
        .mode-chip.active { border-color: var(--accent); background: var(--accent-soft); }
        .suggest-meta { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
        .talk-block { margin: 8px 0; font-size: 13px; color: var(--text); line-height: 1.45; }
        .talk-block strong { color: var(--accent); display: block; margin-bottom: 2px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .talk-block ul { margin: 4px 0 0 18px; padding: 0; }
        .talk-block li { margin: 3px 0; }
        .hook-pick { display: grid; gap: 6px; margin-top: 6px; }
        .hook-pick label { display: flex; gap: 8px; align-items: flex-start; font-weight: 500; font-size: 13px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2); cursor: pointer; color: var(--text); }
        .hook-pick label:has(input:checked) { border-color: var(--accent); background: var(--accent-soft); }
        .hook-pick input { margin-top: 3px; }
        .chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 14px; }
        .chip-row button { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: 999px; padding: 8px 12px; font-size: 12px; cursor: pointer; }
        .chip-row button:hover { border-color: var(--accent); }
        .script-panel { border: 1px solid var(--border); border-radius: 16px; padding: 14px; background: var(--surface-2); margin-bottom: 16px; }
        .script-panel h2 { border: none; margin: 0 0 10px; padding: 0; font-size: 1.05rem; }
        .script-panel .active-bullet { border-left: 3px solid var(--accent); padding-left: 10px; background: var(--accent-soft); }
        .film-studio {
          margin: 0 0 18px; padding: 16px; border: 1px solid var(--border); border-radius: 18px;
          background: var(--surface-2);
        }
        .film-studio h2 { border: none; margin: 0 0 6px; padding: 0; font-size: 1.1rem; }
        .film-sub { margin: 0 0 14px; font-size: 13px; color: var(--muted); max-width: 62ch; }
        .film-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 14px; align-items: start; }
        .film-stage {
          position: relative; border-radius: 16px; overflow: hidden; background: #000;
          border: 1px solid var(--border); aspect-ratio: 9 / 16; max-height: min(72vh, 640px);
        }
        .film-stage video {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transform: scaleX(-1);
        }
        .rec-dot {
          position: absolute; top: 12px; left: 12px; z-index: 2;
          width: 12px; height: 12px; border-radius: 50%; background: #ef4444;
          box-shadow: 0 0 0 6px rgba(239,68,68,.25); animation: fsPulse 1.1s ease infinite;
        }
        @keyframes fsPulse { 50% { opacity: .45; } }
        .film-meters { position: absolute; left: 10px; right: 10px; bottom: 10px; z-index: 2; }
        .meter-track { height: 6px; border-radius: 999px; background: rgba(255,255,255,.2); overflow: hidden; }
        .meter-fill { height: 100%; width: 0; background: var(--ok); transition: width .08s linear; }
        .meter-fill[data-level="low"] { background: var(--warn); }
        .meter-fill[data-level="hot"] { background: var(--bad); }
        .meter-label {
          margin-top: 6px; font-size: 11px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.7);
        }
        .film-director { display: grid; gap: 10px; }
        .dir-block {
          padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface);
        }
        .dir-block strong {
          display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .05em;
          color: var(--accent); margin-bottom: 4px;
        }
        .dir-block p, .dir-block li { margin: 0; font-size: 13px; color: var(--text); }
        .dir-block ul { margin: 4px 0 0 18px; padding: 0; }
        .dir-block li { margin: 4px 0; color: var(--muted); }
        .clean-note {
          font-size: 12px; color: var(--ok); margin: 0; line-height: 1.4;
          padding: 8px 10px; border-radius: 10px; background: color-mix(in srgb, var(--ok) 14%, transparent);
        }
        .film-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .film-actions button { font-size: 12px; padding: 9px 12px; }
        .film-status {
          font-size: 13px; color: var(--muted); min-height: 1.4em;
        }
        .film-status[data-kind="rec"] { color: #f87171; font-weight: 700; }
        .film-status[data-kind="ok"] { color: var(--ok); }
        .film-status[data-kind="warn"] { color: var(--warn); }
        .film-status[data-kind="error"] { color: var(--bad); }
        .teleprompter-dock {
          position: sticky; top: 0; z-index: 30; margin: 0 0 14px;
          background: var(--surface); border: 1px solid var(--accent); border-radius: 16px; padding: 16px;
        }
        .teleprompter-dock .tp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); margin-bottom: 6px; }
        .teleprompter-dock .tp-current {
          font-size: 1.4rem; line-height: 1.3; color: var(--tp-text); font-weight: 700;
          min-height: 2.6em; font-family: "Syne", "Trebuchet MS", sans-serif; letter-spacing: -0.02em;
        }
        .teleprompter-dock .tp-meta { font-size: 12px; color: var(--muted); margin-top: 8px; }
        .tp-controls { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .tp-controls button { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: 999px; padding: 8px 12px; font-size: 12px; cursor: pointer; }
        .tp-controls button:hover { border-color: var(--accent); }
        .tp-controls button.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
        .tp-lines { max-height: 280px; overflow: auto; border: 1px solid var(--border); border-radius: 12px; padding: 8px; background: var(--surface); }
        .tp-line { padding: 10px 12px; border-radius: 10px; margin: 4px 0; color: var(--muted); font-size: 14px; line-height: 1.4; cursor: pointer; border-left: 3px solid transparent; }
        .tp-line.done { opacity: 0.45; }
        .tp-line.active { background: var(--accent-soft); color: var(--text); border-left-color: var(--accent); font-weight: 600; font-size: 15px; }
        .tp-line.must { border-left-color: var(--warn); }
        .sample-preview { font-size: 12px; color: var(--muted); max-height: 72px; overflow: hidden; }
        .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 11px; margin-right: 6px; font-weight: 600; }
        [data-tip] { position: relative; cursor: help; }
        [data-tip]::after {
          content: attr(data-tip);
          position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%) translateY(4px);
          min-width: 180px; max-width: 280px; padding: 10px 12px; border-radius: 12px;
          background: #111; color: #f5f5f4; font-size: 12px; line-height: 1.4; font-weight: 500;
          opacity: 0; pointer-events: none; transition: opacity .15s ease, transform .15s ease; z-index: 50;
          box-shadow: 0 12px 40px rgba(0,0,0,.35); text-align: left; white-space: normal;
        }
        html[data-theme="light"] [data-tip]::after { background: #1c1917; color: #fff; }
        [data-tip]:hover::after { opacity: 1; transform: translateX(-50%) translateY(0); }
        .suggest-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-top: 14px; }
        .suggest-card {
          display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 22px;
          overflow: hidden; background: var(--surface); box-shadow: 0 18px 50px rgba(0,0,0,.18);
          transition: transform .18s ease, border-color .18s ease;
        }
        .suggest-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--accent) 55%, var(--border)); }
        .thumb-stage { position: relative; aspect-ratio: 16/9; background: #0a0a0a; overflow: hidden; }
        .thumb-stage img.thumb-main { width: 100%; height: 100%; object-fit: cover; display: block; }
        .thumb-badge {
          position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,.72); color: #fff;
          font-size: 11px; font-weight: 700; padding: 6px 10px; border-radius: 999px; letter-spacing: .02em;
        }
        .thumb-badge.good { background: color-mix(in srgb, var(--ok) 85%, #000); }
        .suggest-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .suggest-body h3 { margin: 0 0 6px; font-size: 1.12rem; border: none; padding: 0; font-family: "Syne", sans-serif; letter-spacing: -0.02em; color: var(--text); }
        .serp-box { margin: 10px 0; padding: 10px; border-radius: 14px; border: 1px solid var(--border); background: var(--surface-2); }
        .serp-row { display: grid; grid-template-columns: 56px 1fr auto; gap: 8px; align-items: center; padding: 6px 0; border-top: 1px solid var(--border); }
        .serp-row:first-child { border-top: none; }
        .serp-row.ours { background: var(--accent-soft); margin: 0 -6px; padding: 8px 6px; border-radius: 10px; border: none; }
        .serp-mini { width: 56px; height: 32px; border-radius: 6px; object-fit: cover; background: #222; }
        .serp-title { font-size: 12px; color: var(--text); font-weight: 600; line-height: 1.3; }
        .serp-meta { font-size: 11px; color: var(--muted); }
        .score-ring { font-size: 12px; font-weight: 800; color: var(--accent); }
        .tour-panel {
          position: fixed; inset: 0; background: rgba(0,0,0,.72); z-index: 100; display: none;
          align-items: center; justify-content: center; padding: 20px;
        }
        .tour-panel.open { display: flex; }
        .tour-card {
          width: min(560px, 100%); background: var(--surface); border: 1px solid var(--border);
          border-radius: 20px; padding: 22px; box-shadow: 0 30px 80px rgba(0,0,0,.45);
        }
        .tour-card h2 { border: none; margin: 0 0 8px; font-size: 1.4rem; }
        .tour-progress { height: 4px; background: var(--border); border-radius: 999px; margin: 14px 0; overflow: hidden; }
        .tour-progress > span { display: block; height: 100%; background: var(--accent); width: 0%; transition: width .25s ease; }
        .channel-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; margin-top: 10px; }
        .channel-row input { flex: 1; min-width: 220px; margin: 0; }
        @media (max-width: 900px) {
          .film-grid { grid-template-columns: 1fr; }
          .film-stage { max-height: min(58vh, 520px); margin: 0 auto; width: min(100%, 360px); }
        }
        @media (max-width: 720px) {
          .suggest-grid { grid-template-columns: 1fr; }
          .container { padding: 20px 16px 28px; }
          .teleprompter-dock .tp-current { font-size: 1.2rem; }
        }
        html.in-lifeos-shell body { padding: 12px; background: var(--bg); }
        html.in-lifeos-shell .container { margin: 0 auto; box-shadow: none; max-width: 960px; }
        html.in-lifeos-shell .app-mode,
        html.in-lifeos-shell .lifeos-back { display: none; }
      </style>
</head>
<body>
    <div class="container">
        <div class="lifeos-back"><a href="/overlay/lifeos-app.html?page=lifeos-dashboard.html">← Open LifeOS</a></div>
        <div class="topbar">
          <div>
            <div class="brand">SocialMediaOS</div>
            <p class="brand-sub">Film like yourself. Research the gap. Sell the next conversation.</p>
          </div>
          <div class="theme-toggle" role="group" aria-label="Theme">
            <button type="button" data-theme-set="dark" class="active">Dark</button>
            <button type="button" data-theme-set="light">Light</button>
          </div>
        </div>
        <div class="app-mode">Standalone product · also inside LifeOS</div>
        ${bodyHtml}
    </div>
    <script>
    (function() {
      try {
        var t = localStorage.getItem('smos_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
        document.querySelectorAll('[data-theme-set]').forEach(function(btn) {
          btn.classList.toggle('active', btn.getAttribute('data-theme-set') === t);
          btn.addEventListener('click', function() {
            var next = btn.getAttribute('data-theme-set');
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('smos_theme', next);
            document.querySelectorAll('[data-theme-set]').forEach(function(b) {
              b.classList.toggle('active', b.getAttribute('data-theme-set') === next);
            });
          });
        });
      } catch (_) {}
    })();
    ${sharedMarketingClientAuth}
    ${clientScript}
    </script>
</body>
</html>`;
}

export function registerMarketingSessionUiRoutes(app, deps) {
  const { logger } = deps;

  app.get('/marketing', (req, res) => {
    const ytFlag = String(req.query.youtube || '');
    const body = `
            <h1 data-tip="This is your filming desk — research → hook → film mode → arm camera → voice-synced teleprompter → coach → publish pack.">Film the next conversation</h1>
            <p>Research the gap. Pick your hook. Choose how you film. Sound like yourself — not like AI.</p>
            <div class="actions-row">
              <a class="btn" href="/marketing/session/new" data-tip="Start a coaching session — talk, extract stories, generate a content pack.">Start New Session</a>
              <button type="button" class="btn secondary" id="tourStartBtn" data-tip="60-second interactive tour of SocialMediaOS — like a product demo video.">Watch product tour</button>
              <a class="btn secondary" href="/marketing/calendar" data-tip="Schedule approved pieces on your content calendar.">Content Calendar</a>
              <a class="btn secondary" href="/marketing/atoms" data-tip="Reusable hooks, stories, and CTAs from past sessions.">Atom Library</a>
              <a class="btn secondary" href="/creative/studio" data-tip="Edit footage, captions, and brand kits in Creative Engine.">Creative Studio</a>
            </div>
            <div class="yt-panel" id="recentPacksPanel" data-tip="Continue a pack you already started.">
              <h2>Your recent packs</h2>
              <p class="suggest-meta" id="recentPacksMeta">Loading recent sessions…</p>
              <div id="recentPacksList"></div>
            </div>
            <div id="ytBanner" class="message" style="display:none;"></div>
            <div id="apiBanner" class="message" style="display:none;"></div>

            <div class="yt-panel" data-tour="modes">
              <h2 data-tip="Different creators film differently. Modes change coaching style and which cards bubble up.">How do you want to film?</h2>
              <p class="suggest-meta">Hover any mode for what it means. Click to filter talk cards.</p>
              <div class="mode-grid" id="modeGrid"></div>
              <p class="suggest-meta" id="modeBlurb">Select a mode to filter recommended talk cards.</p>
            </div>

            <div class="yt-panel" data-tour="channel">
              <h2 data-tip="Niche playbook first (realtor = relocation → buyer intel). Then researched titles, velocity, face+title thumbs optimized for leads — not vanity views.">YouTube intelligence</h2>
              <p id="ytStatus">Checking connection…</p>
              <p class="suggest-meta" id="playbookMeta">Resolving niche playbook…</p>
              <div class="actions-row">
                <a class="btn" id="ytConnectBtn" href="#" data-tip="Sign in with Google on Google's page — we never see your password.">Connect YouTube</a>
                <button type="button" class="secondary" id="ytRefreshBtn" data-tip="Research YouTube shelf + rebuild lead-intent talk cards and face+title thumbnails.">Refresh ideas</button>
              </div>
              <label for="channelUrlInput" data-tip="If YouTube Data API is blocked, paste your public channel URL (@handle) so we can still pull your face via RSS.">Public channel URL (face fallback)</label>
              <div class="channel-row">
                <input type="text" id="channelUrlInput" placeholder="https://www.youtube.com/@yourhandle">
                <button type="button" class="secondary" id="channelUrlSave">Save &amp; pull assets</button>
              </div>
              <p class="suggest-meta" id="visualMeta">Waiting for channel visuals…</p>
            </div>

            <div class="yt-panel" data-tour="ops">
              <h2 data-tip="Improve what you already filmed: refresh metadata, A/B titles, sequel/update older uploads for leads.">Channel improvement offers</h2>
              <p class="suggest-meta" id="opsMeta">Will appear when we can see your uploads.</p>
              <div class="suggest-grid" id="opsGrid"></div>
            </div>

            <div class="yt-panel" data-tour="cards">
              <h2 data-tip="Each card: researched title, real competitor shelf + velocity, face+title thumb, 3 hooks, must-says — ranked for reach-outs.">Talk cards</h2>
              <p id="suggestMeta">Loading researched talk cards…</p>
              <div class="suggest-grid" id="suggestGrid"></div>
            </div>

            <div class="tour-panel" id="tourPanel" aria-hidden="true">
              <div class="tour-card">
                <h2 id="tourTitle">Product tour</h2>
                <p id="tourBody" class="suggest-meta"></p>
                <div class="tour-progress"><span id="tourBar"></span></div>
                <div class="actions-row">
                  <button type="button" class="secondary" id="tourSkip">Skip</button>
                  <button type="button" class="btn" id="tourNext">Next</button>
                </div>
              </div>
            </div>
        `;
    const clientScript = `
            const banner = document.getElementById('ytBanner');
            const ytFlag = ${JSON.stringify(ytFlag)};
            if (ytFlag === 'connected') showMsg(banner, 'YouTube connected. Pulling channel ideas…', 'success');
            if (ytFlag === 'error') showMsg(banner, 'YouTube connect failed. Check Google OAuth keys + redirect URI, then retry.', 'error');
            let selectedMode = (function(){ try { return localStorage.getItem('smos_film_mode') || ''; } catch(_) { return ''; } })();
            let allSuggestions = [];
            let filmModes = [];

            function encodePack(pack) {
              const json = JSON.stringify(pack);
              const bytes = new TextEncoder().encode(json);
              let bin = '';
              bytes.forEach(function(b) { bin += String.fromCharCode(b); });
              return btoa(bin).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
            }

            function renderModes() {
              const grid = document.getElementById('modeGrid');
              if (!filmModes.length) {
                filmModes = [
                  { id: 'teleprompter', label: 'Teleprompter', blurb: 'Full script · sticky line' },
                  { id: 'bullets', label: 'Bullet coach', blurb: 'Talk the bullets' },
                  { id: 'bookends', label: 'Scripted bookends', blurb: 'Hook + exit locked' },
                  { id: 'read_riff', label: 'Read & riff', blurb: 'Glance then say it' },
                  { id: 'story', label: 'Story-first', blurb: 'Lived story then teach' },
                  { id: 'interview', label: 'Hot-seat', blurb: 'Coach asks, you answer' },
                  { id: 'analytics', label: 'Analytics reverse', blurb: 'Film what retained' },
                  { id: 'shorts', label: 'Shorts-first', blurb: 'Hook · punch · CTA' }
                ];
              }
              grid.innerHTML = filmModes.map(function(m) {
                return '<button type="button" class="mode-chip' + (selectedMode === m.id ? ' active' : '') + '" data-mode="' + escapeHtml(m.id) + '" data-tip="' + escapeHtml(m.blurb || m.label) + '"><strong>' + escapeHtml(m.label) + '</strong>' + escapeHtml(m.blurb || '') + '</button>';
              }).join('');
              const active = filmModes.find(function(m) { return m.id === selectedMode; });
              document.getElementById('modeBlurb').textContent = active ? (active.label + ' — ' + (active.blurb || '')) : 'Showing all modes. Pick one to focus.';
            }

            document.getElementById('modeGrid').addEventListener('click', function(e) {
              const btn = e.target.closest('[data-mode]');
              if (!btn) return;
              const id = btn.getAttribute('data-mode');
              selectedMode = selectedMode === id ? '' : id;
              try { localStorage.setItem('smos_film_mode', selectedMode); } catch(_) {}
              renderModes();
              renderSuggestionCards();
            });

            function buildStartUrl(s, hook) {
              const pack = Object.assign({}, s, { hook: hook || s.hook, selected_hook: hook || s.hook, film_mode: selectedMode || s.film_mode });
              delete pack.thumbnailUrl;
              delete pack.thumbnailOverlay;
              delete pack.thumbnailFaceUrl;
              delete pack.thumbnailBgUrl;
              delete pack.thumbnailComposed;
              delete pack.competition;
              delete pack.serpPreview;
              delete pack.startUrl;
              delete pack.studioUrl;
              const seed = encodePack(pack);
              return '/marketing/session/new?seed_title=' + encodeURIComponent(s.title || '') + '&seed_angle=' + encodeURIComponent(s.angle || '') + '&seed_pack=' + encodeURIComponent(seed);
            }

            function renderChannelOps(ops) {
              const grid = document.getElementById('opsGrid');
              const meta = document.getElementById('opsMeta');
              if (!grid || !meta) return;
              grid.innerHTML = '';
              const list = ops || [];
              if (!list.length) {
                meta.textContent = 'Connect YouTube (or pull uploads) to get refresh / A/B / sequel offers on older videos.';
                return;
              }
              meta.textContent = list.length + ' ways to improve existing videos for leads — not just film new.';
              list.forEach(function(op) {
                const card = document.createElement('article');
                card.className = 'suggest-card';
                const actions = (op.actions || []).map(function(a) { return '<li>' + escapeHtml(a) + '</li>'; }).join('');
                card.innerHTML =
                  '<div class="suggest-body">' +
                  '<div class="suggest-meta"><span class="pill">' + escapeHtml(op.type || 'ops') + '</span></div>' +
                  '<h3>' + escapeHtml(op.proposedTitle || 'Improve upload') + '</h3>' +
                  '<div class="talk-block"><strong>Current</strong> ' + escapeHtml(op.currentTitle || '—') + '</div>' +
                  '<div class="talk-block">' + escapeHtml(op.why || '') + '</div>' +
                  '<div class="talk-block"><strong>Do this</strong><ul>' + (actions || '<li>—</li>') + '</ul></div>' +
                  '</div>';
                grid.appendChild(card);
              });
            }

            function renderSuggestionCards() {
              const meta = document.getElementById('suggestMeta');
              const grid = document.getElementById('suggestGrid');
              grid.innerHTML = '';
              const list = allSuggestions.filter(function(s) {
                if (!selectedMode) return true;
                return String(s.film_mode || '') === selectedMode;
              });
              if (!list.length) {
                meta.textContent = selectedMode ? 'No talk cards for that mode yet — clear the mode or refresh ideas.' : 'No suggestions returned.';
                return;
              }
              meta.textContent = list.length + ' lead-ranked talk card' + (list.length === 1 ? '' : 's') + (selectedMode ? ' · mode filtered' : '');
              list.forEach(function(s, cardIdx) {
                  const card = document.createElement('article');
                  card.className = 'suggest-card';
                  const bullets = (s.talking_points || []).map(function(b) { return '<li>' + escapeHtml(b) + '</li>'; }).join('');
                  const musts = (s.must_say || []).map(function(m) { return '<li>' + escapeHtml(m) + '</li>'; }).join('');
                  const hooks = (s.hooks && s.hooks.length ? s.hooks : [s.hook]).filter(Boolean).slice(0, 3);
                  const hookHtml = hooks.map(function(h, i) {
                    return '<label data-tip="Spoken open line — pick the one that feels most like you."><input type="radio" name="hook-' + cardIdx + '" value="' + escapeHtml(h) + '"' + (i === 0 ? ' checked' : '') + '> <span>' + escapeHtml(h) + '</span></label>';
                  }).join('');
                  const comp = s.competition || {};
                  const grade = escapeHtml(comp.grade || '—');
                  const ctr = escapeHtml(comp.predictedCtr || '—');
                  const serp = s.serpPreview || {};
                  const serpRows = [];
                  const oursRank = Number(serp.ourRank) || 3;
                  const compsArr = serp.competitors || [];
                  let cIdx = 0;
                  for (let r = 1; r <= 4; r++) {
                    if (r === oursRank) {
                      serpRows.push('<div class="serp-row ours"><img class="serp-mini" alt="" src="' + escapeHtml(s.thumbnailUrl) + '"/><div><div class="serp-title">' + escapeHtml(s.title) + '</div><div class="serp-meta">YOU · lead intent ' + escapeHtml(String(s.lead_intent_score || '—')) + ' · est. CTR ' + ctr + '</div></div><div class="score-ring">' + grade + '</div></div>');
                    } else if (cIdx < compsArr.length) {
                      const c = compsArr[cIdx++];
                      const thumb = c.thumbnailUrl
                        ? '<img class="serp-mini" alt="" src="' + escapeHtml(c.thumbnailUrl) + '"/>'
                        : '<div class="serp-mini" style="background:linear-gradient(135deg,#333,#111)"></div>';
                      const vel = (c.viewsPerSub != null)
                        ? (Number(c.viewsPerSub).toFixed(2) + 'x views/sub')
                        : ('score ' + String(c.score || '—'));
                      const views = c.views != null ? (Number(c.views).toLocaleString() + ' views') : 'Competitor';
                      serpRows.push('<div class="serp-row">' + thumb + '<div><div class="serp-title">' + escapeHtml(c.title || c.name) + '</div><div class="serp-meta">' + escapeHtml(c.name || '') + ' · ' + escapeHtml(views) + ' · ' + escapeHtml(vel) + (c.outlier ? ' · outlier' : '') + '</div></div><div class="score-ring">' + escapeHtml(String(c.score || '')) + '</div></div>');
                    }
                  }
                  const checks = (comp.checks || []).map(function(ch) {
                    return '<li data-tip="' + escapeHtml(ch.tip || '') + '">' + (ch.pass ? '✓ ' : '○ ') + escapeHtml(ch.name || '') + '</li>';
                  }).join('');
                  const basis = s.research_basis || {};
                  const basisHtml = basis.gap_reason
                    ? ('<div class="talk-block" data-tip="Why this title exists: gap vs real YouTube shelf."><strong>Research basis</strong> ' + escapeHtml(basis.gap_reason) + (basis.query ? (' <span class="pill">' + escapeHtml(basis.query) + '</span>') : '') + '</div>')
                    : '';
                  const clickHtml = s.click_psychology
                    ? ('<div class="talk-block" data-tip="Sales/click principle for this card."><strong>Why they click</strong> ' + escapeHtml(s.click_psychology) + '</div>')
                    : '';
                  const beats = (s.retention_beats || []).map(function(b) {
                    const rawLines = Array.isArray(b.lines) ? b.lines : (typeof b.lines === 'string' ? [b.lines] : []);
                    const lines = rawLines.map(function(l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('');
                    return '<div class="talk-block" data-tip="' + escapeHtml(b.job || 'Earn the next block of attention.') + '"><strong>' + escapeHtml(b.range || '') + '</strong> — ' + escapeHtml(b.job || '') + '<ul>' + lines + '</ul></div>';
                  }).join('');
                  card.innerHTML =
                    '<div class="thumb-stage" data-tip="Distinct layout + click-trigger text. Face hero. No cloned templates.">' +
                    '<img class="thumb-main" alt="competitive thumbnail" src="' + escapeHtml(s.thumbnailUrl) + '"/>' +
                    '<div class="thumb-badge' + ((comp.score || 0) >= 72 ? ' good' : '') + '">Thumb ' + grade + (s.thumbnailOverlay ? (' · ' + escapeHtml(s.thumbnailOverlay)) : '') + (s.thumbnail_layout ? (' · ' + escapeHtml(s.thumbnail_layout)) : '') + '</div>' +
                    '</div>' +
                    '<div class="suggest-body">' +
                    '<div class="suggest-meta"><span class="pill">#' + escapeHtml(String(s.rank)) + '</span>' +
                    '<span class="pill" data-tip="Optimized for reach-outs / booked conversations.">leads ' + escapeHtml(String(s.lead_intent_score || '—')) + '</span>' +
                    (s.researched ? '<span class="pill">researched</span>' : '<span class="pill">playbook</span>') +
                    (s.copy_model ? '<span class="pill">' + escapeHtml(s.copy_model) + '</span>' : '') +
                    (s.film_mode ? '<span class="pill">' + escapeHtml(s.film_mode) + '</span>' : '') +
                    (s.thumbnailComposed ? '<span class="pill">composed</span>' : '') +
                    '</div>' +
                    '<h3>' + escapeHtml(s.title) + '</h3>' +
                    clickHtml +
                    basisHtml +
                    '<div class="serp-box" data-tip="Real competitor shelf when API research succeeds — velocity = views vs subs."><div class="suggest-meta"><strong>YouTube shelf</strong> — ' + escapeHtml(serp.label || 'Researched placement') + '</div>' + serpRows.join('') + '</div>' +
                    '<div class="talk-block"><strong>Pick your hook (best 3)</strong><div class="hook-pick">' + hookHtml + '</div></div>' +
                    '<div class="talk-block" data-tip="What competing videos do well — match or beat this."><strong>Competitors are strong on</strong> ' + escapeHtml(s.competitor_strong || '—') + '</div>' +
                    '<div class="talk-block" data-tip="The gap we must fill so relocators / buyers reach out."><strong>They fail to give</strong> ' + escapeHtml(s.competitor_fail || s.competitor_gap || '') + '</div>' +
                    '<div class="talk-block" data-tip="Non-negotiable lines. Skip these and the video underperforms."><strong>Must say</strong><ul>' + (musts || '<li>—</li>') + '</ul></div>' +
                    '<div class="talk-block"><strong>Talk through</strong><ul>' + (bullets || '<li>—</li>') + '</ul></div>' +
                    (beats ? ('<div class="talk-block"><strong>Earned attention (every block earns the next)</strong></div>' + beats) : '') +
                    '<div class="talk-block" data-tip="Thumbnail quality checklist — face, click trigger, research, distinct layout."><strong>Thumb checklist</strong><ul>' + (checks || '<li>—</li>') + '</ul></div>' +
                    '<div class="actions-row">' +
                    '<a class="btn film-btn" href="#" data-tip="Open coaching with this talk card + chosen hook.">Film this talk card</a>' +
                    '<a class="btn secondary" href="' + escapeHtml(s.studioUrl) + '">Studio</a>' +
                    '</div></div>';
                  card.querySelector('.film-btn').addEventListener('click', function(ev) {
                    ev.preventDefault();
                    const checked = card.querySelector('input[type=radio]:checked');
                    const hook = checked ? checked.value : (hooks[0] || s.hook);
                    window.location.href = marketingHref(buildStartUrl(s, hook));
                  });
                  grid.appendChild(card);
              });
            }

            async function loadYoutubeStatus() {
              const el = document.getElementById('ytStatus');
              try {
                const res = await marketingFetch('/api/v1/marketing/youtube/status?owner_id=' + encodeURIComponent(marketingOwnerId()), { headers: marketingAuthHeaders() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'status failed');
                if (!data.oauthConfigured) {
                  el.innerHTML = 'Google OAuth is <strong>not configured</strong> on tip yet.';
                } else if (data.connected) {
                  el.textContent = 'Connected' + (data.connectedSince ? (' since ' + new Date(data.connectedSince).toLocaleString()) : '') + '.';
                } else {
                  el.textContent = 'Not connected yet. Click Connect YouTube and sign in as yourself on Google.';
                }
              } catch (err) {
                el.textContent = 'Status error: ' + err.message;
              }
            }

            async function applySuggestionsPayload(data, meta, apiBanner) {
              filmModes = data.filmModes || filmModes;
              allSuggestions = data.suggestions || [];
              if (data.youtubeApiNext) showMsg(apiBanner, data.youtubeApiNext, 'error');
              else apiBanner.style.display = 'none';
              const pb = data.playbook || {};
              const playbookMeta = document.getElementById('playbookMeta');
              if (playbookMeta) {
                playbookMeta.textContent = (pb.label || 'Playbook') + ' · outcome: ' + (pb.primary_outcome || 'leads') + (pb.market ? (' · market: ' + pb.market) : '') + ' · researched ' + String(data.researchedCount || 0) + '/' + String((pb.seed_topics || []).length || 0);
              }
              const vis = data.channelVisuals || {};
              const visualMeta = document.getElementById('visualMeta');
              if (visualMeta) {
                visualMeta.textContent = 'Visuals: ' + (vis.faceUrl ? 'face ✓' : 'face missing') + ' · ' + (vis.videoCount || 0) + ' uploads · source ' + (vis.assetSource || 'none');
              }
              const urlInput = document.getElementById('channelUrlInput');
              if (urlInput && vis.publicUrl) urlInput.value = vis.publicUrl;
              renderChannelOps(data.channel_ops || []);
              renderModes();
              renderSuggestionCards();
              const modeNote = data.mode === 'fast' || data.timed_out ? ' · fast pack' : (data.mode === 'full' ? ' · full research' : '');
              meta.textContent = (data.connected ? 'Channel linked · ' : '') + 'source: ' + (data.source || 'unknown') + (data.copyModel ? (' · copy: ' + data.copyModel) : '') + modeNote + (data.hint ? (' · ' + data.hint) : '');
            }

            async function loadSuggestions(opts) {
              const deep = !!(opts && opts.deep);
              const meta = document.getElementById('suggestMeta');
              const apiBanner = document.getElementById('apiBanner');
              meta.textContent = deep
                ? 'Deep research: shelf + AI rewrite + composed thumbs…'
                : 'Loading fast talk cards…';
              try {
                const q = '/api/v1/marketing/youtube/suggestions?owner_id=' + encodeURIComponent(marketingOwnerId())
                  + (deep ? '' : '&mode=fast');
                const res = await marketingFetch(q, { headers: marketingAuthHeaders() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'suggestions failed');
                await applySuggestionsPayload(data, meta, apiBanner);
              } catch (err) {
                meta.textContent = 'Could not load ideas: ' + err.message;
              }
            }

            const channelSave = document.getElementById('channelUrlSave');
            if (channelSave) channelSave.addEventListener('click', async function() {
              const url = (document.getElementById('channelUrlInput').value || '').trim();
              if (!url) { showMsg(banner, 'Paste your YouTube channel URL first.', 'error'); return; }
              try {
                const res = await marketingFetch('/api/v1/marketing/youtube/channel-url', {
                  method: 'POST', headers: marketingAuthHeaders(),
                  body: JSON.stringify({ owner_id: marketingOwnerId(), channel_url: url })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'save failed');
                showMsg(banner, 'Channel URL saved. Rebuilding thumbnails…', 'success');
                await loadSuggestions();
              } catch (err) {
                showMsg(banner, 'Save error: ' + err.message, 'error');
              }
            });

            const tourSteps = [
              { title: 'Welcome to SocialMediaOS', body: 'Niche playbook first. For a realtor: relocation → buyer intel. Outcome = leads, not vanity views.' },
              { title: 'Research before you film', body: 'We search the real YouTube shelf, score velocity (views vs subs), and pick titles that fill a gap.' },
              { title: 'Thumbnails that compete', body: 'Your face + 3–5 word TITLE text. No random B-roll frames. Shelf shows real competitor thumbs.' },
              { title: 'Improve old videos too', body: 'Refresh metadata, A/B titles, sequel/update offers — reuse what you already filmed.' },
              { title: 'Talk cards + producer', body: '3 hooks, must-says, teleprompter. Film when the research says this angle can earn reach-outs.' },
              { title: 'You’re ready', body: 'Refresh ideas, pick a relocation card, film. Hover anything for tips.' }
            ];
            let tourIndex = 0;
            function openTour(i) {
              tourIndex = i || 0;
              const panel = document.getElementById('tourPanel');
              if (!panel) return;
              panel.classList.add('open');
              document.getElementById('tourTitle').textContent = tourSteps[tourIndex].title;
              document.getElementById('tourBody').textContent = tourSteps[tourIndex].body;
              document.getElementById('tourBar').style.width = (((tourIndex + 1) / tourSteps.length) * 100) + '%';
              document.getElementById('tourNext').textContent = tourIndex === tourSteps.length - 1 ? 'Finish' : 'Next';
            }
            function closeTour() {
              const panel = document.getElementById('tourPanel');
              if (!panel) return;
              panel.classList.remove('open');
              try { localStorage.setItem('smos_tour_seen', '1'); } catch(_) {}
            }
            const tourBtn = document.getElementById('tourStartBtn');
            if (tourBtn) tourBtn.addEventListener('click', function() { openTour(0); });
            const tourSkip = document.getElementById('tourSkip');
            if (tourSkip) tourSkip.addEventListener('click', closeTour);
            const tourNext = document.getElementById('tourNext');
            if (tourNext) tourNext.addEventListener('click', function() {
              if (tourIndex >= tourSteps.length - 1) closeTour();
              else openTour(tourIndex + 1);
            });
            try { if (!localStorage.getItem('smos_tour_seen')) setTimeout(function(){ openTour(0); }, 600); } catch(_) {}

            document.getElementById('ytConnectBtn').addEventListener('click', async function(e) {
              e.preventDefault();
              try {
                const res = await marketingFetch('/api/v1/marketing/youtube/connect?format=json&owner_id=' + encodeURIComponent(marketingOwnerId()), {
                  headers: marketingAuthHeaders({ 'Accept': 'application/json' })
                });
                const data = await res.json();
                if (!res.ok) {
                  showMsg(banner, (data.error || 'Connect failed') + (data.next ? (' — ' + data.next) : '') + (data.redirectUri ? (' Redirect URI: ' + data.redirectUri) : ''), 'error');
                  return;
                }
                if (!data.authUrl) throw new Error('No Google auth URL returned');
                location.href = data.authUrl;
              } catch (err) {
                showMsg(banner, 'Connect error: ' + err.message, 'error');
              }
            });
            document.getElementById('ytRefreshBtn').addEventListener('click', function() { loadSuggestions({ deep: true }); });
            renderModes();
            loadYoutubeStatus();
            loadSuggestions().catch(function(){});
            (async function loadRecentPacks() {
              const meta = document.getElementById('recentPacksMeta');
              const list = document.getElementById('recentPacksList');
              if (!meta || !list) return;
              try {
                const res = await marketingFetch('/api/v1/marketing/sessions?limit=8', { headers: marketingAuthHeaders() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load sessions');
                const sessions = data.sessions || [];
                if (!sessions.length) {
                  meta.textContent = 'No packs yet — start a new session and talk for 2 minutes.';
                  return;
                }
                meta.textContent = sessions.length + ' recent session' + (sessions.length === 1 ? '' : 's');
                list.innerHTML = sessions.map(function(s) {
                  const approved = Number(s.approved_count || 0);
                  const pieces = Number(s.piece_count || 0);
                  const label = (s.status || 'active') + (pieces ? (' · ' + pieces + ' pieces') : '') + (approved ? (' · ' + approved + ' approved') : '');
                  const href = pieces
                    ? '/marketing/session/' + encodeURIComponent(s.id) + '/content'
                    : '/marketing/session/' + encodeURIComponent(s.id);
                  return '<div class="content-card" style="margin:8px 0;padding:12px;">' +
                    '<p style="margin:0 0 8px;"><strong>' + escapeHtml(String(s.id).slice(0, 8)) + '…</strong> · ' + escapeHtml(label) + '</p>' +
                    '<div class="actions-row">' +
                    '<a class="btn" href="' + href + '">Continue</a>' +
                    (pieces ? '<a class="btn secondary" href="/marketing/session/' + encodeURIComponent(s.id) + '/export">Export</a>' : '') +
                    '</div></div>';
                }).join('');
              } catch (err) {
                meta.textContent = 'Could not load recent packs: ' + err.message;
              }
            })();
        `;
    res.send(renderPage('SocialMediaOS', body, clientScript));
  });

  app.get('/marketing/session/new', (req, res) => {
    const seedTitle = String(req.query.seed_title || '');
    const seedAngle = String(req.query.seed_angle || '');
    const seedPack = String(req.query.seed_pack || '');
    const body = `
            <h1>New Session</h1>
            <p>Consent is required before coaching starts. You review and approve every piece before export.</p>
            ${seedTitle ? `<div class="message success" style="display:block;">Starting from talk card: <strong>${escapeHtml(seedTitle)}</strong> — coach will walk you through hook, intro, bullets, and exit.</div>` : ''}
            <form id="consentForm">
                <div class="form-group">
                    <label for="consentAccepted">I agree to let SocialMediaOS process my input and generate marketing content. I am responsible for reviewing and approving all content before publication.</label>
                    <input type="checkbox" id="consentAccepted" name="consentAccepted" required>
                    <span>I understand and agree</span>
                </div>
                <div class="form-group">
                    <label for="sessionType">Session focus</label>
                    <select id="sessionType" name="sessionType" required>
                        <option value="social_media">Social Media Content</option>
                        <option value="blog_post">Blog Post</option>
                        <option value="email_campaign">Email Campaign</option>
                    </select>
                </div>
                <button type="submit">Start Coaching</button>
            </form>
            <div id="message" class="message" style="display:none;"></div>
        `;
    const clientScript = `
            const seedTitle = ${JSON.stringify(seedTitle)};
            const seedAngle = ${JSON.stringify(seedAngle)};
            const seedPack = ${JSON.stringify(seedPack)};
            if (seedTitle || seedPack) {
              try {
                sessionStorage.setItem('smos_seed_title', seedTitle);
                sessionStorage.setItem('smos_seed_angle', seedAngle || '');
                if (seedPack) sessionStorage.setItem('smos_seed_pack', seedPack);
              } catch (_) {}
            }
            document.getElementById('consentForm').addEventListener('submit', async function(event) {
                event.preventDefault();
                const messageDiv = document.getElementById('message');
                messageDiv.style.display = 'none';

                const consentAccepted = document.getElementById('consentAccepted').checked;
                const sessionType = document.getElementById('sessionType').value;
                if (!consentAccepted) {
                    showMsg(messageDiv, 'You must agree to the terms to proceed.', 'error');
                    return;
                }

                try {
                    const consentResponse = await marketingFetch('/api/v1/marketing/consent', {
                        method: 'POST',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({
                            owner_id: marketingOwnerId(),
                            consent_type: 'session_recording',
                            consent_text: 'I agree to allow SocialMediaOS to process my input and generate marketing content. I am responsible for reviewing and approving all generated content before publication.',
                            consented_at: new Date().toISOString(),
                            data: { session_type: sessionType, seed_title: seedTitle || null }
                        })
                    });
                    const consentData = await consentResponse.json();
                    if (!consentResponse.ok) throw new Error(consentData.error || 'Failed to record consent.');

                    const sessionResponse = await marketingFetch('/api/v1/marketing/sessions', {
                        method: 'POST',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({
                            owner_id: marketingOwnerId(),
                            consent_record_id: consentData.id || consentData.consent?.id,
                            session_type: sessionType,
                            input_mode: 'text',
                            status: 'initialized'
                        })
                    });
                    const sessionData = await sessionResponse.json();
                    if (!sessionResponse.ok) throw new Error(sessionData.error || 'Failed to start session.');

                    const sid = sessionData.id || sessionData.session?.id;
                    let next = '/marketing/session/' + sid + '?';
                    const q = [];
                    if (seedTitle) q.push('seed_title=' + encodeURIComponent(seedTitle));
                    if (seedAngle) q.push('seed_angle=' + encodeURIComponent(seedAngle));
                    if (seedPack) q.push('seed_pack=' + encodeURIComponent(seedPack));
                    next += q.join('&');
                    window.location.href = marketingHref(next);
                } catch (error) {
                    console.error('Error in new session setup:', error);
                    showMsg(messageDiv, 'Error: ' + (error && error.message ? error.message : String(error)), 'error');
                }
            });
        `;
    res.send(renderPage('Start New Session', body, clientScript));
  });

  app.get('/marketing/session/:id', (req, res) => {
    const sessionId = req.params.id;
    const seedTitle = String(req.query.seed_title || '');
    const seedPack = String(req.query.seed_pack || '');
    const body = `
            <h1>Film + talk-card coaching</h1>
            <p>Arm the camera, get directed on sound/background/B-roll for this video type, then record. The teleprompter moves as you talk and <strong>never appears in the take</strong> — we only capture the camera stream (Descript-style clean recording). Coach still catches “sounds like reading.”</p>
            <div id="filmStudioMount"></div>
            <div class="teleprompter-dock" id="tpDock" style="display:none;">
              <div class="tp-label">Teleprompter · current line · for your eyes only</div>
              <div class="tp-current" id="tpCurrent">—</div>
              <div class="tp-meta" id="tpMeta">Line 0 / 0</div>
              <div class="tp-controls" id="tpControls">
                <button type="button" data-tp="prev">Prev</button>
                <button type="button" class="primary" data-tp="next">Next line</button>
                <button type="button" data-tp="pause">Pause / hold</button>
                <button type="button" data-tp="pickup">Pick up here</button>
                <button type="button" data-tp="must">Jump to must-say</button>
              </div>
            </div>
            <div class="script-panel" id="scriptPanel">
              <h2>Your talk card</h2>
              <p class="suggest-meta" id="scriptTitle">Loading…</p>
              <div id="scriptBody"></div>
            </div>
            <div class="chip-row" id="coachChips">
              <button type="button" data-chip="I'm reading the current teleprompter line out loud: ">Read current line</button>
              <button type="button" data-chip="I went off topic — pick me up at the highlighted line.">Went off topic</button>
              <button type="button" data-chip="Full take done — review me like a producer.">After full read</button>
              <button type="button" data-chip="I sounded like I was reading — help me freestyle this beat.">Sounds like reading</button>
              <button type="button" data-chip="Freestyle this part using a real story from another video: ">Freestyle this</button>
              <button type="button" data-chip="Did I hit the must-say / competitor gap? ">Check must-say</button>
              <button type="button" data-chip="Give me more on that — who specifically / what number / what scar?">Ask: give me more</button>
              <button type="button" data-chip="I liked when I said: ">Flag what landed</button>
            </div>
            <div id="conversation"></div>
            <form id="coachForm">
                <div class="form-group">
                    <label for="userInput">Talk it out (live transcript lands here after a take — or paste)</label>
                    <textarea id="userInput" name="userInput" placeholder="Record a take, or paste what you said…" required></textarea>
                </div>
                <div class="actions-row">
                  <button type="submit">Send to Coach</button>
                  <button type="button" class="secondary" id="extractBtn">Extract Stories</button>
                  <button type="button" id="generateBtn">Generate Content Pack</button>
                </div>
            </form>
            <div id="message" class="message" style="display:none;"></div>
            <div class="nav-links">
              <a href="/marketing/session/${escapeHtml(sessionId)}/content">Review &amp; Approve</a>
              <a href="/marketing/session/${escapeHtml(sessionId)}/export">Export</a>
              <a href="/marketing">Dashboard</a>
            </div>
            <script src="/shared/smos-film-studio.js"></script>
        `;
    const clientScript = `
            const sessionId = ${JSON.stringify(sessionId)};
            const seedTitleFromQuery = ${JSON.stringify(seedTitle)};
            const seedPackFromQuery = ${JSON.stringify(seedPack)};
            const conversationDiv = document.getElementById('conversation');
            const messageDiv = document.getElementById('message');
            let talkPack = null;
            let bulletIndex = 0;
            let lineIndex = 0;
            let scriptLines = [];
            let paused = false;
            let coachMode = 'live';
            let liveTranscript = '';
            let filmStudio = null;

            function decodeSeedPack(raw) {
              if (!raw) return null;
              try {
                const bin = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
                const bytes = Uint8Array.from(bin, function(c) { return c.charCodeAt(0); });
                return JSON.parse(new TextDecoder().decode(bytes));
              } catch (_) {
                try { return JSON.parse(decodeURIComponent(raw)); } catch (e2) { return null; }
              }
            }

            function currentLineText() {
              return scriptLines[lineIndex] || '';
            }

            function setLine(i, opts) {
              if (!scriptLines.length) return;
              const hold = opts && opts.hold;
              if (paused && !hold && !(opts && opts.force)) return;
              lineIndex = Math.max(0, Math.min(scriptLines.length - 1, Number(i) || 0));
              const dock = document.getElementById('tpDock');
              const cur = document.getElementById('tpCurrent');
              const meta = document.getElementById('tpMeta');
              if (dock) dock.style.display = 'block';
              if (cur) cur.textContent = currentLineText();
              if (meta) meta.textContent = 'Line ' + (lineIndex + 1) + ' / ' + scriptLines.length + (paused ? ' · held' : '') + ' · not in video';
              document.querySelectorAll('.tp-line').forEach(function(el) {
                const idx = Number(el.getAttribute('data-li'));
                el.classList.toggle('active', idx === lineIndex);
                el.classList.toggle('done', idx < lineIndex);
              });
              const active = document.querySelector('.tp-line.active');
              if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              try { sessionStorage.setItem('smos_tp_line_' + sessionId, String(lineIndex)); } catch(_) {}
            }

            function isMustLine(text) {
              const must = (talkPack && talkPack.must_say) || [];
              const t = String(text || '').toLowerCase();
              return must.some(function(m) { return t.indexOf(String(m).toLowerCase().slice(0, 18)) !== -1; })
                || /don't leave without|what the other channels|must say|competitor/i.test(text || '');
            }

            function renderTeleprompter() {
              scriptLines = (talkPack && Array.isArray(talkPack.sample_script)) ? talkPack.sample_script.filter(Boolean) : [];
              const body = document.getElementById('scriptBody');
              if (!scriptLines.length) {
                document.getElementById('tpDock').style.display = 'none';
                return;
              }
              let saved = 0;
              try { saved = Number(sessionStorage.getItem('smos_tp_line_' + sessionId) || 0) || 0; } catch(_) {}
              const linesHtml = scriptLines.map(function(line, i) {
                const cls = ['tp-line'];
                if (isMustLine(line)) cls.push('must');
                return '<div class="' + cls.join(' ') + '" data-li="' + i + '">' + escapeHtml(line) + '</div>';
              }).join('');
              const musts = ((talkPack && talkPack.must_say) || []).map(function(m) { return '<li>' + escapeHtml(m) + '</li>'; }).join('');
              const bullets = ((talkPack && talkPack.talking_points) || []).map(function(b, i) {
                return '<li class="' + (i === 0 ? 'active-bullet' : '') + '" data-bi="' + i + '">' + escapeHtml(b) + '</li>';
              }).join('');
              body.innerHTML =
                '<div class="talk-block"><strong>Full sample script</strong><div class="tp-lines" id="tpLines">' + linesHtml + '</div></div>' +
                '<div class="talk-block"><strong>Must say</strong><ul>' + (musts || '<li>—</li>') + '</ul></div>' +
                '<div class="talk-block"><strong>Bullets</strong><ul id="bulletList">' + bullets + '</ul></div>' +
                '<div class="talk-block"><strong>Competitor gap</strong>' + escapeHtml((talkPack && (talkPack.competitor_gap || talkPack.why)) || '') + '</div>' +
                '<div class="talk-block"><strong>Film mode</strong>' + escapeHtml((talkPack && talkPack.film_mode) || 'teleprompter') + '</div>';
              document.getElementById('tpLines').addEventListener('click', function(e) {
                const line = e.target.closest('.tp-line');
                if (!line) return;
                paused = true;
                setLine(Number(line.getAttribute('data-li')), { force: true, hold: true });
              });
              setLine(saved, { force: true });
              if (filmStudio && filmStudio.refreshDirector) filmStudio.refreshDirector();
            }

            function loadTalkPack() {
              let raw = seedPackFromQuery;
              try { if (!raw) raw = sessionStorage.getItem('smos_seed_pack') || ''; } catch(_) {}
              talkPack = decodeSeedPack(raw);
              const title = (talkPack && talkPack.title) || seedTitleFromQuery || (function(){ try { return sessionStorage.getItem('smos_seed_title') || ''; } catch(_) { return ''; } })();
              document.getElementById('scriptTitle').textContent = title || 'Freeform session';
              const body = document.getElementById('scriptBody');
              if (!talkPack) {
                body.innerHTML = '<p class="suggest-meta">No talk card attached — coach will still help you find a hook and outline. Arm the film studio anytime.</p>';
                return;
              }
              renderTeleprompter();
              try {
                sessionStorage.removeItem('smos_seed_title');
                sessionStorage.removeItem('smos_seed_angle');
                sessionStorage.removeItem('smos_seed_pack');
              } catch(_) {}
            }

            function highlightBullet(i) {
              bulletIndex = i;
              document.querySelectorAll('#bulletList li').forEach(function(li) {
                li.classList.toggle('active-bullet', Number(li.getAttribute('data-bi')) === i);
              });
            }

            function applyCoachNav(data) {
              if (!data) return;
              if (Number.isFinite(Number(data.currentBullet))) highlightBullet(Number(data.currentBullet));
              if (Number.isFinite(Number(data.redoFromLine))) {
                paused = true;
                setLine(Number(data.redoFromLine), { force: true, hold: true });
                return;
              }
              if (data.pickUpLine && scriptLines.length) {
                const idx = scriptLines.findIndex(function(l) { return l === data.pickUpLine || l.indexOf(data.pickUpLine) !== -1 || data.pickUpLine.indexOf(l) !== -1; });
                if (idx >= 0) { paused = true; setLine(idx, { force: true, hold: true }); return; }
              }
              if (!paused && Number.isFinite(Number(data.lineIndex))) {
                setLine(Number(data.lineIndex), { force: true });
              }
            }

            function blobToBase64(blob) {
              return new Promise(function(resolve, reject) {
                const reader = new FileReader();
                reader.onload = function() {
                  const s = String(reader.result || '');
                  const i = s.indexOf(',');
                  resolve(i >= 0 ? s.slice(i + 1) : s);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }

            function mountFilmStudio() {
              const mount = document.getElementById('filmStudioMount');
              if (!mount || !window.SmosFilmStudio) {
                if (mount) mount.innerHTML = '<p class="suggest-meta">Film studio script failed to load. Hard-refresh and retry.</p>';
                return;
              }
              mount.innerHTML = window.SmosFilmStudio.markup();
              filmStudio = window.SmosFilmStudio.create({
                root: mount.querySelector('#filmStudio'),
                getLines: function() { return scriptLines; },
                getLineIndex: function() { return lineIndex; },
                setLine: function(i, opts) {
                  paused = false;
                  setLine(i, Object.assign({ force: true }, opts || {}));
                },
                getFilmMode: function() { return (talkPack && talkPack.film_mode) || 'teleprompter'; },
                onTranscript: function(text, meta) {
                  if (!text) return;
                  liveTranscript = (liveTranscript + ' ' + text).trim();
                  if (meta && meta.final) {
                    const input = document.getElementById('userInput');
                    if (input && (!input.value || input.value.indexOf('Reading from teleprompter') === 0 || input.dataset.fromTake === '1')) {
                      input.value = liveTranscript.slice(-4000);
                      input.dataset.fromTake = '1';
                    }
                  }
                },
                onStatus: function(text, kind) {
                  if (kind === 'error') showMsg(messageDiv, text, 'error');
                },
                onSoundsLikeReading: function(info) {
                  coachMode = 'freestyle';
                  showMsg(messageDiv, (info && info.hint) || "Producer: you sound like you're reading — freestyle this beat.", 'success');
                  const input = document.getElementById('userInput');
                  if (input && !input.value) {
                    input.value = 'I sounded like I was reading on line ' + ((info && info.lineIndex) + 1) + ': "' + currentLineText() + '". Help me freestyle.';
                  }
                },
                uploadTake: async function(blob) {
                  const b64 = await blobToBase64(blob);
                  const filename = 'smos-session-' + sessionId + '-' + Date.now() + ((blob.type || '').includes('mp4') ? '.mp4' : '.webm');
                  const response = await marketingFetch('/api/v1/creative/assets', {
                    method: 'POST',
                    headers: marketingAuthHeaders(),
                    body: JSON.stringify({
                      owner_id: marketingOwnerId(),
                      ownerId: marketingOwnerId(),
                      filename: filename,
                      kind: 'upload',
                      content_base64: b64
                    })
                  });
                  const data = await response.json();
                  if (!response.ok) throw new Error(data.error || 'Upload failed');
                  showMsg(messageDiv, 'Take uploaded. Open Creative Studio to crop/caption, or send transcript to coach.', 'success');
                  return data;
                }
              });
            }

            document.getElementById('tpControls').addEventListener('click', function(e) {
              const btn = e.target.closest('button[data-tp]');
              if (!btn) return;
              const act = btn.getAttribute('data-tp');
              if (act === 'prev') { paused = false; setLine(lineIndex - 1, { force: true }); }
              if (act === 'next') { paused = false; setLine(lineIndex + 1, { force: true }); }
              if (act === 'pause') {
                paused = !paused;
                setLine(lineIndex, { force: true, hold: true });
                showMsg(messageDiv, paused ? 'Held on this line — go off topic if you want; pick up here anytime.' : 'Teleprompter unpaused.', 'success');
              }
              if (act === 'pickup') {
                paused = true;
                setLine(lineIndex, { force: true, hold: true });
                document.getElementById('userInput').value = 'Pick me up at the highlighted line: "' + currentLineText() + '". I went off topic.';
                coachMode = 'live';
              }
              if (act === 'must') {
                const idx = scriptLines.findIndex(function(l) { return isMustLine(l); });
                if (idx >= 0) { paused = true; setLine(idx, { force: true, hold: true }); }
              }
            });

            document.getElementById('coachChips').addEventListener('click', function(e) {
              const btn = e.target.closest('button[data-chip]');
              if (!btn) return;
              const input = document.getElementById('userInput');
              let prefix = btn.getAttribute('data-chip') || '';
              if (prefix.indexOf('Reading from') === 0 || prefix.indexOf("I'm reading") === 0) {
                prefix = 'I\\'m reading the current teleprompter line out loud: "' + currentLineText() + '". ';
                coachMode = 'live';
              }
              if (prefix.indexOf('Full take') === 0) coachMode = 'after_read';
              if (prefix.indexOf('Freestyle') === 0 || prefix.indexOf('I sounded') === 0) coachMode = 'freestyle';
              if (prefix.indexOf('I went off topic') === 0) {
                prefix = 'I went off topic — pick me up at the highlighted line: "' + currentLineText() + '".';
                coachMode = 'live';
              }
              input.value = prefix + (input.value || '');
              input.focus();
            });

            mountFilmStudio();
            loadTalkPack();

            async function loadSession() {
                const response = await marketingFetch('/api/v1/marketing/sessions/' + sessionId, { headers: marketingAuthHeaders() });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to fetch session.');
                const session = data.session || data;
                renderConversation(session.coach_messages_json || []);
                return session;
            }

            function renderConversation(messages) {
                conversationDiv.innerHTML = '';
                let lastCoachMeta = null;
                (messages || []).forEach(msg => {
                    const msgElement = document.createElement('div');
                    if (msg.role === 'user') {
                        msgElement.className = 'user-message';
                        msgElement.innerHTML = '<p><strong>You:</strong> ' + escapeHtml(msg.content) + '</p>';
                    } else {
                        msgElement.className = 'coach-message';
                        let contentHtml = '<p><strong>Coach:</strong> ' + escapeHtml(msg.content) + '</p>';
                        const meta = msg.metadata || {};
                        lastCoachMeta = meta;
                        if (meta.hooks_detected && meta.hooks_detected.length) {
                            contentHtml += '<div class="hook-detected">HOOK DETECTED: ' + escapeHtml(meta.hooks_detected.join(', ')) + '</div>';
                        }
                        if (msg.hookDetected || msg.hookText || meta.hookDetected || meta.hookText) {
                            contentHtml += '<div class="hook-detected">HOOK DETECTED: ' + escapeHtml(msg.hookText || meta.hookText || 'yes') + '</div>';
                        }
                        if (meta.quotedMoment) {
                            contentHtml += '<div class="coach-cue">I liked when you said: “' + escapeHtml(meta.quotedMoment) + '”</div>';
                        }
                        if (meta.askMore) {
                            contentHtml += '<div class="coach-more">Producer nudge: give me more — who / what number / what scar?</div>';
                        }
                        if (meta.soundsLikeReading) {
                            contentHtml += '<div class="coach-more">Sounds like reading — freestyle this beat.</div>';
                        }
                        if (meta.freestyleCue) {
                            contentHtml += '<div class="coach-cue">Freestyle: ' + escapeHtml(meta.freestyleCue) + '</div>';
                        }
                        if (meta.missedMustSay) {
                            contentHtml += '<div class="coach-more">Must-say miss: ' + escapeHtml(meta.missedMustSay) + '</div>';
                        }
                        if (meta.pickUpLine) {
                            contentHtml += '<div class="coach-cue">Pick up here: “' + escapeHtml(meta.pickUpLine) + '”</div>';
                        }
                        msgElement.innerHTML = contentHtml;
                    }
                    conversationDiv.appendChild(msgElement);
                });
                if (lastCoachMeta) {
                  applyCoachNav({
                    currentBullet: lastCoachMeta.currentBullet,
                    lineIndex: lastCoachMeta.lineIndex,
                    redoFromLine: lastCoachMeta.redoFromLine,
                    pickUpLine: lastCoachMeta.pickUpLine
                  });
                }
            }

            document.getElementById('coachForm').addEventListener('submit', async function(event) {
                event.preventDefault();
                messageDiv.style.display = 'none';
                const userInput = document.getElementById('userInput').value;
                if (!userInput.trim()) {
                    showMsg(messageDiv, 'Please enter a message.', 'error');
                    return;
                }
                document.getElementById('userInput').value = '';
                liveTranscript = '';
                try {
                    const response = await marketingFetch('/api/v1/marketing/sessions/' + sessionId + '/coach', {
                        method: 'POST',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({
                          message: userInput,
                          owner_id: marketingOwnerId(),
                          talk_pack: talkPack,
                          bullet_index: bulletIndex,
                          line_index: lineIndex,
                          mode: coachMode
                        })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to get coach reply.');
                    applyCoachNav(data);
                    if (data.soundsLikeReading) showMsg(messageDiv, "Producer: you sound like you're reading — freestyle that beat.", 'success');
                    else if (data.missedMustSay) showMsg(messageDiv, 'Must-say miss: ' + data.missedMustSay, 'success');
                    else if (data.freestyleCue) showMsg(messageDiv, 'Freestyle: ' + data.freestyleCue, 'success');
                    else if (data.quotedMoment) showMsg(messageDiv, 'I liked when you said: "' + data.quotedMoment + '"', 'success');
                    else if (data.askMore) showMsg(messageDiv, 'Give me more — who / what number / what scar?', 'success');
                    else if (data.hookDetected) showMsg(messageDiv, 'Hook detected: ' + (data.hookText || 'yes'), 'success');
                    coachMode = 'live';
                    await loadSession();
                } catch (error) {
                    console.error('Error in coaching session:', error);
                    showMsg(messageDiv, 'Error: ' + error.message, 'error');
                }
            });

            document.getElementById('extractBtn').addEventListener('click', async function() {
                messageDiv.style.display = 'none';
                this.disabled = true;
                try {
                    const response = await marketingFetch('/api/v1/marketing/sessions/' + sessionId + '/extract', {
                        method: 'POST',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({ owner_id: marketingOwnerId() })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Extract failed.');
                    const n = (data.extractions || data.items || []).length;
                    showMsg(messageDiv, 'Extracted ' + n + ' story items. Next: Generate Content Pack.', 'success');
                } catch (error) {
                    console.error('Extract error:', error);
                    showMsg(messageDiv, 'Error: ' + error.message, 'error');
                } finally {
                    this.disabled = false;
                }
            });

            document.getElementById('generateBtn').addEventListener('click', async function() {
                messageDiv.style.display = 'none';
                this.disabled = true;
                try {
                    const response = await marketingFetch('/api/v1/marketing/sessions/' + sessionId + '/generate', {
                        method: 'POST',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({ owner_id: marketingOwnerId() })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Generate failed.');
                    const n = (data.pieces || data.content || []).length;
                    showMsg(messageDiv, 'Generated ' + n + ' pieces. Opening review…', 'success');
                    setTimeout(function() { window.location.href = marketingHref('/marketing/session/' + sessionId + '/content'); }, 600);
                } catch (error) {
                    console.error('Generate error:', error);
                    showMsg(messageDiv, 'Error: ' + error.message, 'error');
                } finally {
                    this.disabled = false;
                }
            });

            loadSession().catch(function(error) {
                console.error('Error fetching session details:', error);
                showMsg(messageDiv, 'Error loading conversation: ' + error.message, 'error');
            });
        `;
    res.send(renderPage('Marketing Session', body, clientScript));
  });

  app.get('/marketing/session/:id/content', (req, res) => {
    const sessionId = req.params.id;
    const body = `
            <h1>Review &amp; Approve</h1>
            <p>Approve pieces you want in the export pack. Reject anything that needs another pass.</p>
            <div class="actions-row" style="margin-bottom:12px;">
              <button type="button" class="btn" id="approveAllBtn">Approve all drafts</button>
              <a class="btn secondary" href="/marketing/session/${escapeHtml(sessionId)}/export">Proceed to Export</a>
            </div>
            <div id="contentList"><p>Loading content…</p></div>
            <div id="message" class="message" style="display:none;"></div>
            <div class="actions-row">
              <a class="btn" href="/marketing/session/${escapeHtml(sessionId)}/export">Proceed to Export</a>
              <a class="btn secondary" href="/marketing/session/${escapeHtml(sessionId)}">Back to Coaching</a>
            </div>
        `;
    const clientScript = `
            const sessionId = ${JSON.stringify(sessionId)};
            const contentListDiv = document.getElementById('contentList');
            const messageDiv = document.getElementById('message');

            async function fetchContentPieces() {
                try {
                    const response = await marketingFetch('/api/v1/marketing/sessions/' + sessionId + '/content', { headers: marketingAuthHeaders() });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to fetch content pieces.');
                    const contentPieces = Array.isArray(data) ? data : (data.pieces || data.content || []);
                    if (!contentPieces.length) {
                        contentListDiv.innerHTML = '<p>No content pieces yet. Go back to the session and run Extract → Generate.</p>';
                        return;
                    }
                    contentListDiv.innerHTML = contentPieces.map(function(piece) {
                        const status = String(piece.status || 'draft').toLowerCase();
                        return '<div class="content-card" id="content-piece-' + escapeHtml(piece.id) + '">' +
                          '<h3>' + escapeHtml(piece.title || piece.platform || 'Untitled') + '</h3>' +
                          '<p><strong>Platform:</strong> ' + escapeHtml(piece.platform || 'N/A') +
                          ' · <strong>Format:</strong> ' + escapeHtml(piece.format || 'N/A') +
                          ' · <span class="status-badge ' + escapeHtml(status) + '">' + escapeHtml(status) + '</span></p>' +
                          '<p>' + escapeHtml(piece.content_text || piece.body || 'No content text available.') + '</p>' +
                          '<div class="actions">' +
                          '<button data-action="approve" data-id="' + escapeHtml(piece.id) + '"' + (status === 'approved' ? ' disabled' : '') + '>Approve</button>' +
                          '<button class="secondary" data-action="reject" data-id="' + escapeHtml(piece.id) + '"' + (status === 'rejected' ? ' disabled' : '') + '>Reject</button>' +
                          '</div></div>';
                    }).join('');
                    contentListDiv.querySelectorAll('button[data-action]').forEach(function(btn) {
                      btn.addEventListener('click', function() {
                        updateContentStatus(btn.getAttribute('data-id'), btn.getAttribute('data-action'));
                      });
                    });
                } catch (error) {
                    console.error('Error fetching content pieces:', error);
                    contentListDiv.innerHTML = '<p class="message error">Error loading content: ' + escapeHtml(error.message) + '</p>';
                }
            }

            async function updateContentStatus(contentId, action) {
                messageDiv.style.display = 'none';
                try {
                    const response = await marketingFetch('/api/v1/marketing/content/' + contentId, {
                        method: 'PATCH',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({ action: action, owner_id: marketingOwnerId() })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to update content status.');
                    showMsg(messageDiv, 'Content ' + action + 'd.', 'success');
                    fetchContentPieces();
                } catch (error) {
                    console.error('Error updating content status:', error);
                    showMsg(messageDiv, 'Error: ' + error.message, 'error');
                }
            }

            const approveAllBtn = document.getElementById('approveAllBtn');
            if (approveAllBtn) approveAllBtn.addEventListener('click', async function() {
              this.disabled = true;
              try {
                const response = await marketingFetch('/api/v1/marketing/sessions/' + sessionId + '/approve-all', {
                  method: 'POST',
                  headers: marketingAuthHeaders(),
                  body: JSON.stringify({ owner_id: marketingOwnerId() })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Approve-all failed');
                showMsg(messageDiv, 'Approved ' + (data.approved_count || 0) + ' drafts. Ready to export.', 'success');
                fetchContentPieces();
              } catch (error) {
                showMsg(messageDiv, 'Error: ' + error.message, 'error');
              } finally {
                this.disabled = false;
              }
            });

            fetchContentPieces();
        `;
    res.send(renderPage('Review & Approve Content', body, clientScript));
  });

  app.get('/marketing/session/:id/export', (req, res) => {
    const sessionId = req.params.id;
    const body = `
            <h1>Export Content Pack</h1>
            <p>Downloads approved pieces only. Approve at least one piece first.</p>
            <p class="lede" id="packOffer">Social Media OS pack — coach, approve, export, post like yourself.</p>
            <div class="actions" style="display:flex;flex-wrap:wrap;gap:0.75rem;margin:1.25rem 0;">
              <button id="downloadButton" type="button">Download Content Pack</button>
              <button id="buyPackButton" type="button" class="secondary">Buy pack — unlock for client</button>
            </div>
            <div id="message" class="message" style="display:none;"></div>
            <div class="nav-links">
              <a href="/marketing/session/${escapeHtml(sessionId)}/content">Back to Review</a>
              <a href="/marketing">Dashboard</a>
            </div>
        `;
    const clientScript = `
            const sessionId = ${JSON.stringify(sessionId)};
            const messageDiv = document.getElementById('message');
            const params = new URLSearchParams(location.search);
            const checkoutId = params.get('checkout_session_id') || '';
            if (params.get('paid') === '1' && checkoutId) {
              fetch('/api/v1/marketing/pack/verify?checkout_session_id=' + encodeURIComponent(checkoutId) + '&marketing_session_id=' + encodeURIComponent(sessionId))
                .then(function(r){ return r.json(); })
                .then(function(data){
                  if (data && data.ok && data.paid) showMsg(messageDiv, 'Payment confirmed. Download your pack below.', 'success');
                  else showMsg(messageDiv, 'Payment not confirmed yet: ' + (data && data.error ? data.error : 'incomplete'), 'error');
                })
                .catch(function(err){ showMsg(messageDiv, 'Verify error: ' + err.message, 'error'); });
            }
            fetch('/api/v1/marketing/pack/pricing')
              .then(function(r){ return r.json(); })
              .then(function(data){
                if (data && data.offer) {
                  var el = document.getElementById('packOffer');
                  if (el) el.textContent = data.offer;
                  var buy = document.getElementById('buyPackButton');
                  if (buy && data.pack && data.pack.display) buy.textContent = 'Buy pack ' + data.pack.display;
                }
              })
              .catch(function(){});
            document.getElementById('buyPackButton').addEventListener('click', async function() {
                messageDiv.style.display = 'none';
                try {
                  const response = await fetch('/api/v1/marketing/pack/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionId, owner_id: marketingOwnerId() })
                  });
                  const data = await response.json().catch(function(){ return {}; });
                  if (!response.ok || !data.url) throw new Error(data.error || ('Checkout failed (' + response.status + ')'));
                  location.href = data.url;
                } catch (error) {
                  showMsg(messageDiv, 'Checkout error: ' + error.message, 'error');
                }
            });
            document.getElementById('downloadButton').addEventListener('click', async function() {
                messageDiv.style.display = 'none';
                try {
                    const response = await marketingFetch('/api/v1/marketing/sessions/' + sessionId + '/export', { headers: marketingAuthHeaders() });
                    if (!response.ok) {
                      const data = await response.json().catch(function(){ return {}; });
                      throw new Error(data.error || ('Export failed (' + response.status + ')'));
                    }
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'socialmediaos-session-' + sessionId + '.txt';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    showMsg(messageDiv, 'Download started.', 'success');
                } catch (error) {
                    console.error('Error initiating download:', error);
                    showMsg(messageDiv, 'Error: ' + error.message, 'error');
                }
            });
        `;
    res.send(renderPage('Export Content Pack', body, clientScript));
  });

  logger.info('Marketing session UI routes registered.');
}

export { sharedMarketingClientAuth };
export default registerMarketingSessionUiRoutes;
