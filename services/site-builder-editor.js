/**
 * SYNOPSIS: Utility to escape HTML for safe interpolation
 */
import { renderSidebar } from './site-builder-editor-sidebar.js';
import { renderCanvas } from './site-builder-editor-canvas.js';
import { renderChatPanel } from './site-builder-editor-chat.js';
import { renderStrategyPanel } from './site-builder-editor-strategy.js';

// Utility to escape HTML for safe interpolation
const htmlEscape = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, function(match) {
    const replacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return replacements[match];
  });
};

export const renderEditorShell = ({
  businessName = 'Untitled Business',
  clientId,
  siteFile,
  variants = [],
  palettes = [],
  editToken,
  baseUrl,
  strategy = {},
  services = {}
}) => {
  const escapedBusinessName = htmlEscape(businessName);

  // Client-side script for iframe reload and strategy panel toggle
  const clientScript = `
    document.addEventListener('DOMContentLoaded', () => {
      const iframe = document.getElementById('site-canvas-iframe');
      if (iframe) {
        // Function to reload the iframe
        const reloadIframe = () => {
          const currentSrc = iframe.src;
          iframe.src = 'about:blank'; // Temporarily set to about:blank
          setTimeout(() => {
            iframe.src = currentSrc; // Reload with the original source
          }, 10);
        };

        // Example: Listen for a custom event to trigger reload
        // This could be dispatched from the sidebar or chat panel when content changes
        window.addEventListener('site-content-updated', reloadIframe);

        // Or, if you need to expose it globally for direct calls from other modules
        window.reloadSiteCanvas = reloadIframe;
      }

      const strategyPanelToggle = document.getElementById('strategy-panel-toggle');
      const strategyPanelContent = document.getElementById('strategy-panel-content');

      if (strategyPanelToggle && strategyPanelContent) {
        strategyPanelToggle.addEventListener('click', () => {
          strategyPanelContent.classList.toggle('hidden');
          const isHidden = strategyPanelContent.classList.contains('hidden');
          strategyPanelToggle.querySelector('svg').style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
        });
      }
    });
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Editor - ${escapedBusinessName}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
        <style>
            /* Basic layout adjustments */
            body { margin: 0; font-family: sans-serif; }
            .grid-container {
                display: grid;
                grid-template-columns: 280px 1fr 320px; /* Sidebar, Canvas, Right Panel */
                height: calc(100vh - 56px); /* Full viewport height minus top bar */
            }
            .top-bar {
                height: 56px;
                background-color: #1a202c; /* Darker grey */
                color: white;
                display: flex;
                align-items: center;
                padding: 0 1rem;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .right-panel-content {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            .chat-panel {
                flex-grow: 1; /* Chat takes available space */
                overflow-y: auto;
            }
            .strategy-panel {
                flex-shrink: 0; /* Strategy panel height is determined by content/toggle */
                border-top: 1px solid #e2e8f0;
            }
        </style>
    </head>
    <body class="bg-gray-100">
        <div class="top-bar">
            ${escapedBusinessName} Editor
        </div>
        <div class="grid-container bg-white">
            <!-- Left Sidebar -->
            <aside class="bg-gray-800 text-white p-4 overflow-y-auto shadow-lg">
                ${renderSidebar({ services, clientId, baseUrl })}
            </aside>

            <!-- Center Canvas -->
            <main class="flex-grow bg-gray-200 relative">
                ${renderCanvas({ siteFile, variants, palettes, clientId, editToken, baseUrl })}
            </main>

            <!-- Right Panel -->
            <aside class="bg-white border-l border-gray-200 shadow-lg right-panel-content">
                <div class="chat-panel p-4">
                    ${renderChatPanel({ clientId, editToken, baseUrl })}
                </div>
                <div class="strategy-panel">
                    <button id="strategy-panel-toggle" class="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 flex justify-between items-center border-t border-gray-200">
                        <span class="font-semibold text-gray-700">Strategy</span>
                        <svg class="w-5 h-5 text-gray-500 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div id="strategy-panel-content" class="px-4 pb-4 hidden">
                        ${renderStrategyPanel({ strategy })}
                    </div>
                </div>
            </aside>
        </div>
        <script>${clientScript}</script>
    </body>
    </html>
  `;
};

export default renderEditorShell;