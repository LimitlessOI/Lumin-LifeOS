/**
 * SYNOPSIS: CRITICAL: This script runs in the browser, not Node.
 */
// CRITICAL: This script runs in the browser, not Node.
        // It's embedded directly into the HTML document.
        document.addEventListener('DOMContentLoaded', () => {
            const iframe = document.getElementById('site-builder-canvas-iframe');
            if (iframe) {
                // Function to reload the iframe
                const reloadIframe = () => {
                    console.log('Reloading site builder iframe...');
                    iframe.contentWindow.location.reload(true); // Force reload from server
                };

                // Example: Listen for a custom event to trigger reload
                // This could be dispatched from the chat panel or sidebar components
                window.addEventListener('site-builder-reload-canvas', reloadIframe);

                // If the iframe has a specific 'save' or 'update' event,
                // you might listen for that on the iframe's contentWindow
                // For now, a simple reload mechanism is provided.
            } else {
                console.warn('Site builder canvas iframe not found.');
            }
        });