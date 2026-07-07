/**
 * SYNOPSIS: Exports renderEditorShell — services/site-builder-editor.js.
 */
import renderSidebar from './site-builder-editor-sidebar.js';
import renderCanvas from './site-builder-editor-canvas.js';
import renderChatPanel from './site-builder-editor-chat.js';
import renderStrategyPanel from './site-builder-editor-strategy.js';

function htmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderEditorShell({
  businessName = 'Your Business',
  clientId,
  siteFile,
  variants = [],
  palettes = [],
  editToken,
  baseUrl,
  strategy = '',
  services = [],
}) {
  const escapedBusinessName = htmlEscape(businessName);

  const sidebarHtml = renderSidebar({ services, clientId, baseUrl });
  const canvasHtml = renderCanvas({ siteFile, variants, palettes, clientId, editToken, baseUrl });
  const chatPanelHtml = renderChatPanel({ clientId, editToken, baseUrl });
  const strategyPanelHtml = renderStrategyPanel({ strategy });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapedBusinessName} - Site Editor</title>
    <link href="https://cdn.tailwindcss.com" rel="stylesheet">
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <style>
        body { margin: 0; overflow: hidden; }
        .grid-container {
            display: grid;
            grid-template-columns: 280px 1fr 320px; /* Sidebar, Canvas, Right Panel */
            height: calc(100vh - 64px); /* Full height minus top bar */
        }
        .strategy-panel-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }
        .strategy-panel-content.expanded {
            max-height: 500px; /* Adjust as needed for content */
            transition: max-height 0.5s ease-in;
        }
    </style>
</head>
<body class="bg-gray-100 font-sans">
    <div class="flex items-center justify-between bg-white p-4 shadow-md h-16">
        <h1 class="text-xl font-semibold text-gray-800">${escapedBusinessName} Site Editor</h1>
        <div>
            <!-- Top bar actions could go here -->
        </div>
    </div>

    <div class="grid-container">
        <aside class="bg-gray-50 border-r border-gray-200 overflow-y-auto p-4">
            ${sidebarHtml}
        </aside>

        <main class="bg-white overflow-hidden">
            ${canvasHtml}
        </main>

        <aside class="bg-gray-50 border-l border-gray-200 overflow-y-auto flex flex-col">
            <div class="flex-grow p-4">
                ${chatPanelHtml}
            </div>
            <div x-data="{ expanded: false }" class="border-t border-gray-200 bg-white">
                <button @click="expanded = !expanded" class="w-full text-left p-4 flex justify-between items-center text-lg font-medium text-gray-700 hover:bg-gray-100 focus:outline-none">
                    <span>Strategy</span>
                    <svg :class="{ 'rotate-180': expanded }" class="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div x-cloak x-show="expanded" class="strategy-panel-content p-4">
                    ${strategyPanelHtml}
                </div>
            </div>
        </aside>
    </div>

    <script>
        // Client-side JavaScript for iframe reload
        function setupIframeReload(iframeId) {
            const iframe = document.getElementById(iframeId);
            if (!iframe) {
                console.warn('Iframe with ID', iframeId, 'not found for reload setup.');
                return;
            }

            // Example: Listen for custom events to trigger reload
            // This could be triggered by buttons or other UI elements in the sidebar/canvas
            window.addEventListener('site-content-updated', () => {
                console.log('Site content updated, reloading iframe:', iframeId);
                iframe.src = iframe.src; // Reloads the iframe
            });

            // You can also expose a global function for other parts of the client-side code to call
            window.reloadSiteEditorIframe = () => {
                console.log('Manually reloading iframe:', iframeId);
                iframe.src = iframe.src;
            };
        }

        // Call setup for the canvas iframe
        document.addEventListener('DOMContentLoaded', () => {
            setupIframeReload('site-builder-canvas-iframe');
        });
    </script>
</body>
</html>
`;
}