/**
 * SYNOPSIS: Three-pane Site Builder editor workspace composition.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { renderSidebar } from './site-builder-editor-sidebar.js';
import { renderCanvas } from './site-builder-editor-canvas.js';
import { renderChatPanel } from './site-builder-editor-chat.js';
import { renderStrategyPanel } from './site-builder-editor-strategy.js';

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
        window.addEventListener('sb-editor:reload', function () {
          var iframe = document.querySelector('[data-lifeos-canvas-frame], .lifeos-canvas-frame, iframe');
          if (iframe && iframe.contentWindow) iframe.contentWindow.location.reload();
          else if (iframe) iframe.src = iframe.src;
        });
      } catch (_) {}
    }());
  </script>
</body>
</html>`;
}

export default renderEditorShell;
