// Cites: DASHBOARD_AI_RAIL_CONTRACT.md
(function() {
    const ROOT_ID = 'lifeos-ai-rail-root';
    const STORAGE_KEY_STATE = 'lifeos-ai-rail:state'; // 'collapsed' or 'expanded'
    const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock';   // 'bottom' or 'top'

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    /**
     * Creates and mounts the AI rail UI into the DOM.
     * If the root element is not found, it will be created and appended to the body.
     */
    const mount = () => {
        let rootEl = document.getElementById(ROOT_ID);
        if (!rootEl) {
            rootEl = document.createElement('div');
            rootEl.id = ROOT_ID;
            document.body.appendChild(rootEl);
        }

        // Load initial state from sessionStorage
        let currentState = sessionStorage.getItem(STORAGE_KEY_STATE) || 'collapsed';
        let currentDock = sessionStorage.getItem(STORAGE_KEY_DOCK) || 'bottom';

        // Apply initial classes
        rootEl.classList.add(`lifeos-ai-rail-${currentState}`);
        rootEl.classList.add(`lifeos-ai-rail-dock-${currentDock}`);

        // Set initial HTML structure
        rootEl.innerHTML = `
            <div class="lifeos-ai-rail-header">
                <span class="lifeos-ai-rail-status-text">Ask Lumin anything...</span>
                <button class="lifeos-ai-rail-dock-btn" title="Toggle dock position">↕</button>
                <button class="lifeos-ai-rail-toggle-btn" title="Toggle collapsed/expanded">
                    <span class="icon-collapsed">▲</span><span class="icon-expanded">▼</span>
                </button>
            </div>
            <div class="lifeos-ai-rail-content">
                <div style="padding: 10px; text-align: center; color: var(--dash-muted, #9999bb); font-size: 13px;">
                    This is a quick access rail. For full chat history, use the main Lumin chat.
                </div>
            </div>
            <div class="lifeos-ai-rail-input-area">
                <textarea class="lifeos-ai-rail-input" placeholder="Quick message to Lumin..." rows="1"></textarea>
                <button class="lifeos-ai-rail-send-btn">↑</button>
            </div>
        `;

        const headerEl = rootEl.querySelector('.lifeos-ai-rail-header');
        const toggleBtn = rootEl.querySelector('.lifeos-ai-rail-toggle-btn');
        const dockBtn = rootEl.querySelector('.lifeos-ai-rail-dock-btn');
        const inputEl = rootEl.querySelector('.lifeos-ai-rail-input');
        const sendBtn = rootEl.querySelector('.lifeos-ai-rail-send-btn');

        // Update toggle button icon based on state
        const updateToggleButtonIcon = () => {
            const iconCollapsed = toggleBtn.querySelector('.icon-collapsed');
            const iconExpanded = toggleBtn.querySelector('.icon-expanded');
            if (currentState === 'collapsed') {
                iconCollapsed.style.display = 'inline';
                iconExpanded.style.display = 'none';
            } else {
                iconCollapsed.style.display = 'none';
                iconExpanded.style.display = 'inline';
            }
        };
        updateToggleButtonIcon();

        // Toggle collapsed/expanded state
        const toggleState = () => {
            const newState = currentState === 'collapsed' ? 'expanded' : 'collapsed';
            rootEl.classList.remove(`lifeos-ai-rail-${currentState}`);
            rootEl.classList.add(`lifeos-ai-rail-${newState}`);
            currentState = newState;
            sessionStorage.setItem(STORAGE_KEY_STATE, newState);
            updateToggleButtonIcon();

            // If expanded, try to focus the input
            if (newState === 'expanded' && inputEl) {
                inputEl.focus();
            }
        };

        // Toggle dock position
        const toggleDock = () => {
            const newDock = currentDock === 'bottom' ? 'top' : 'bottom';
            rootEl.classList.remove(`lifeos-ai-rail-dock-${currentDock}`);
            rootEl.classList.add(`lifeos-ai-rail-dock-${newDock}`);
            currentDock = newDock;
            sessionStorage.setItem(STORAGE_KEY_DOCK, newDock);
        };

        // Auto-resize textarea
        const autoResizeInput = () => {
            if (inputEl) {
                inputEl.style.height = 'auto';
                inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
            }
        };

        // Delegate send action to main dashboard chat
        const sendRailMessage = () => {
            const message = inputEl.value.trim();
            if (!message) return;

            const mainChatInput = document.getElementById('chat-input');
            if (mainChatInput && typeof window.sendChat === 'function') {
                mainChatInput.value = message;
                window.sendChat(); // Call the dashboard's sendChat function
                inputEl.value = '';
                autoResizeInput();
                // Optionally collapse the rail after sending
                if (currentState === 'expanded') {
                    toggleState();
                }
            } else {
                // Fallback: just clear the input and log if main chat not found
                console.warn('LifeOS AI Rail: Could not find main chat input or sendChat function.');
                inputEl.value = '';
                autoResizeInput();
                alert('Message sent to Lumin (check main chat).'); // User feedback
            }
        };

        // Event Listeners
        headerEl.addEventListener('click', (e) => {
            // Only toggle if clicking the header itself or status text, not buttons
            if (e.target === headerEl || e.target.classList.contains('lifeos-ai-rail-status-text')) {
                toggleState();
            }
        });
        toggleBtn.addEventListener('click', toggleState);
        dockBtn.addEventListener('click', toggleDock);
        inputEl.addEventListener('input', autoResizeInput);
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendRailMessage();
            }
        });
        sendBtn.addEventListener('click', sendRailMessage);

        // Listen for theme attribute changes on <html>
        const themeObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    // The rail uses CSS variables, so it should automatically adapt.
                    // No direct JS action needed unless specific JS-driven theme changes are required.
                }
            }
        });
        themeObserver.observe(document.documentElement, { attributes: true });

        // Handle reduced motion (CSS transitions are typically handled by browser for this media query)
        // No direct JS manipulation of transitions needed unless CSS explicitly defines a class for it.
        // The existing CSS does not define a specific class for reduced motion.
    };

    // Attach the mount function to the window object
    if (typeof window !== 'undefined') {
        window.LifeOSDashboardAiRail = { mount };
        // Auto-mount on DOMContentLoaded if the root element is not already present
        // (though lifeos-dashboard.html already includes the root div)
        document.addEventListener('DOMContentLoaded', () => {
            // Ensure it only mounts once if not already mounted by explicit call
            if (!document.getElementById(ROOT_ID) || document.getElementById(ROOT_ID).innerHTML.trim() === '') {
                mount();
            }
        });
    }
})();