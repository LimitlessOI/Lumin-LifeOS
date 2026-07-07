/**
 * SYNOPSIS: CRITICAL: This script runs in the browser, not Node.
 */
// CRITICAL: This script runs in the browser, not Node.
        // It's embedded directly in the HTML string.
        document.addEventListener('DOMContentLoaded', () => {
            const iframe = document.querySelector('main iframe');
            if (iframe) {
                // Reload iframe when its content changes (e.g., via postMessage)
                // This is a placeholder for a more sophisticated communication mechanism.
                // For now, we'll assume the iframe content reloads itself or is re-rendered by the server.
                // If the canvas content is updated by server-side rendering, a full page reload might be needed,
                // or specific iframe reload logic would be implemented here.
                // For a true SPA-like experience, this would involve client-side state management.
                // As per current spec, iframe itself handles its content.
            }

            // Example of how to trigger a reload if needed,
            // though the current architecture suggests server-side re-render or iframe internal reload.
            // window.addEventListener('message', (event) => {
            //     if (event.data && event.data.type === 'RELOAD_CANVAS' && iframe) {
            //         iframe.contentWindow.location.reload();
            //     }
            // });
        });