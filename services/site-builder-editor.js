/**
 * SYNOPSIS: Three-pane Site Builder editor workspace composition.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { renderSidebar } from './site-builder-editor-sidebar.js';
import { renderCanvas } from './site-builder-editor-canvas.js';
import { renderChatPanel } from './site-builder-editor-chat.js';
import { renderStrategyPanel } from './site-builder-editor-strategy.js';
import { EDITOR_FIRST_STEPS } from './site-builder-editor-onboarding.js';

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function scriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function renderEditorShell({
  businessName,
  clientId,
  siteFile,
  variants,
  palettes,
  editToken,
  baseUrl,
  strategy,
  services,
} = {}) {
  const safeName = htmlEscape(businessName || 'Your site');
  const sidebar = renderSidebar({ services, clientId, baseUrl });
  const canvas = renderCanvas({ siteFile, variants, palettes, clientId, editToken, baseUrl });
  const chat = renderChatPanel({ clientId, editToken, baseUrl });
  const strategyPanel = renderStrategyPanel({ strategy });
  const onboardingSteps = EDITOR_FIRST_STEPS
    .map((step, i) => `<span class="sb-onboard-step"><span class="sb-onboard-num">${i + 1}</span>${htmlEscape(step)}</span>`)
    .join('<span class="sb-onboard-sep">&#8594;</span>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${safeName} — Site Editor</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <style>
    html, body { height: 100%; margin: 0; }
    .sb-editor-root { display: flex; flex-direction: column; height: 100vh; background: #0f172a; color: #e2e8f0; }
    .sb-editor-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; border-bottom: 1px solid #334155; background: #111827; }
    .sb-editor-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: 280px minmax(0, 1fr) 320px; }
    .sb-editor-left, .sb-editor-right { min-height: 0; overflow: auto; background: #111827; border-right: 1px solid #334155; }
    .sb-editor-right { border-right: 0; border-left: 1px solid #334155; display: flex; flex-direction: column; }
    .sb-editor-center { min-height: 0; overflow: hidden; background: #0b1220; }
    .sb-editor-strategy { border-top: 1px solid #334155; max-height: 40vh; overflow: auto; padding: 12px; background: #0f172a; }
    .sb-editor-strategy summary { cursor: pointer; font-weight: 600; margin-bottom: 8px; }
    .sb-editor-onboard { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 8px 16px; background: #17203a; border-bottom: 1px solid #334155; font-size: 12px; color: #b8c2d9; }
    .sb-onboard-step { display: inline-flex; align-items: center; gap: 6px; }
    .sb-onboard-num { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 999px; background: #7c3aed; color: #fff; font-size: 10px; font-weight: 700; }
    .sb-onboard-sep { opacity: .5; margin: 0 2px; }
    .sb-editor-onboard.is-dismissed { display: none; }
    .sb-onboard-close { margin-left: auto; background: none; border: 0; color: #b8c2d9; cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 6px; }
    @media (max-width: 1100px) {
      .sb-editor-grid { grid-template-columns: 1fr; grid-template-rows: auto auto auto; }
      .sb-editor-left, .sb-editor-right, .sb-editor-center { min-height: 320px; }
    }
  </style>
</head>
<body>
  <div class="sb-editor-root">
    <header class="sb-editor-topbar">
      <div>
        <div style="font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:.08em">Site Builder Editor</div>
        <div style="font-size:18px;font-weight:600">${safeName}</div>
      </div>
      <a href="${htmlEscape(String(baseUrl || '').replace(/\/$/, ''))}/api/v1/sites/publish/checkout?clientId=${htmlEscape(clientId)}" style="background:#7c3aed;color:#fff;padding:8px 14px;border-radius:999px;text-decoration:none;font-weight:600">Publish</a>
    </header>
    <div class="sb-editor-onboard" id="sb-editor-onboard" data-sb-onboard>
      ${onboardingSteps}
      <button type="button" class="sb-onboard-close" data-sb-onboard-close title="Dismiss" aria-label="Dismiss">&times;</button>
    </div>
    <div class="sb-editor-grid">
      <div class="sb-editor-left">${sidebar}</div>
      <div class="sb-editor-center" id="sb-editor-canvas-host">${canvas}</div>
      <div class="sb-editor-right">
        ${chat}
        <details class="sb-editor-strategy" open>
          <summary>Strategy</summary>
          ${strategyPanel}
        </details>
      </div>
    </div>
  </div>
  <script>
    (function () {
      try {
        var onboard = document.getElementById('sb-editor-onboard');
        var closeBtn = onboard && onboard.querySelector('[data-sb-onboard-close]');
        if (closeBtn) {
          closeBtn.addEventListener('click', function () {
            onboard.classList.add('is-dismissed');
            try { window.sessionStorage.setItem('sb-onboard-dismissed', '1'); } catch (_) {}
          });
        }
        try {
          if (onboard && window.sessionStorage.getItem('sb-onboard-dismissed') === '1') {
            onboard.classList.add('is-dismissed');
          }
        } catch (_) {}
      } catch (_) {}

      try {
        var upsellEditorBase = ${scriptJson(String(baseUrl || ''))};
        var upsellClientId = ${scriptJson(String(clientId || ''))};
        var params = new URLSearchParams(window.location.search);
        var upsellSessionId = params.get('upsell_session_id');
        var upsellKind = params.get('upsell_kind');
        if (upsellSessionId) {
          var verifyUrl = upsellEditorBase.replace(/\\/$/, '') + '/api/v1/sites/upsell/verify?clientId=' + encodeURIComponent(upsellClientId) + '&session_id=' + encodeURIComponent(upsellSessionId) + '&kind=' + encodeURIComponent(upsellKind || '');
          fetch(verifyUrl).then(function (r) { return r.json(); }).then(function (result) {
            var msg = result && result.ok ? 'Purchase confirmed — refresh to see it applied.' : 'Could not confirm purchase: ' + ((result && result.error) || 'unknown error');
            window.alert(msg);
            var cleanUrl = window.location.pathname + '?clientId=' + encodeURIComponent(upsellClientId);
            window.history.replaceState({}, '', cleanUrl);
          }).catch(function () {});
        }
      } catch (_) {}

      try {
        window.addEventListener('sb-editor:reload', function () {
          var iframe = document.querySelector('[data-lifeos-canvas-frame], .lifeos-canvas-frame, iframe');
          if (!iframe) return;
          var host = document.getElementById('sb-editor-canvas-host');
          function flashUpdated() {
            if (!host) return;
            var badge = document.createElement('div');
            badge.textContent = 'Updated ✓';
            badge.style.cssText = 'position:absolute;top:12px;right:12px;z-index:9999;background:#16a34a;color:#fff;font-weight:700;font-size:13px;padding:6px 12px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.2);pointer-events:none;';
            host.style.position = host.style.position || 'relative';
            host.appendChild(badge);
            window.setTimeout(function () { badge.remove(); }, 2200);
          }
          function onLoadOnce() {
            iframe.removeEventListener('load', onLoadOnce);
            flashUpdated();
          }
          iframe.addEventListener('load', onLoadOnce);
          if (iframe.contentWindow) iframe.contentWindow.location.reload();
          else iframe.src = iframe.src;
        });
      } catch (_) {}
    }());
  </script>
</body>
</html>`;
}

export default renderEditorShell;
