/**
 * SYNOPSIS: CRITICAL: All client-side JavaScript must be embedded here.
 */
// CRITICAL: All client-side JavaScript must be embedded here.
        // Node.js on the server will not execute this script block.
        // It's only run by the browser once the HTML is delivered.

        // Example: Reload iframe on certain events (conceptual, actual implementation depends on canvas specifics)
        function reloadCanvasIframe() {
            const iframe = document.getElementById('site-canvas-iframe');
            if (iframe) {
                iframe.contentWindow.location.reload(true);
            }
        }

        // You might attach this to buttons or other UI elements
        // document.getElementById('reload-button').addEventListener('click', reloadCanvasIframe);

        // This script block ensures no browser globals are accessed at Node.js import time.