/**
 * SYNOPSIS: CRITICAL: This script runs in the browser, not Node.
 */
// CRITICAL: This script runs in the browser, not Node.
        // It's embedded directly into the HTML document.
        // All client-side browser globals (window, document) are safe here.

        const iframe = document.getElementById('site-canvas-iframe');
        if (iframe) {
            // Function to reload the iframe
            const reloadIframe = () => {
                const currentSrc = iframe.src;
                // Append a unique timestamp to force a reload, bypassing cache
                iframe.src = currentSrc.split('?')[0] + '?' + new Date().getTime();
            };

            // Example: Listen for a custom event to trigger reload
            // This allows other parts of the client-side app to request a reload
            window.addEventListener('site-builder-reload-canvas', reloadIframe);

            // You might also want to reload on initial load or after certain user actions
            // For now, we just define the function and listen for the event.
            // If the iframe's content is expected to change frequently due to edits,
            // the 'site-builder-reload-canvas' event should be dispatched by the editing components.
        }