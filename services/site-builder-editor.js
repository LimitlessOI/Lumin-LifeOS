/**
 * SYNOPSIS: CRITICAL: This script runs in the browser, not Node.
 */
// CRITICAL: This script runs in the browser, not Node.
        // It's embedded directly into the HTML document.
        const iframe = document.getElementById('site-canvas-iframe');
        if (iframe) {
            window.addEventListener('message', (event) => {
                // Ensure the message is from the expected origin if iframe.contentWindow.location.origin is available
                // For simplicity, we'll assume trusted messages within the same domain or known iframe source
                if (event.data && event.data.type === 'reload-iframe') {
                    console.log('Received reload-iframe message, reloading iframe...');
                    iframe.contentWindow.location.reload();
                }
            });
        } else {
            console.warn("Iframe with ID 'site-canvas-iframe' not found. Reload functionality will not work.");
        }