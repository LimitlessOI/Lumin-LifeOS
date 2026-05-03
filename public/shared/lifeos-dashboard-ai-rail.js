// DASHBOARD_AI_RAIL_CONTRACT.md
(function() {
    const STORAGE_KEY_EXPANDED = 'lifeos-ai-rail:expanded';
    const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock'; // 'bottom' or 'top'

    let isExpanded = sessionStorage.getItem(STORAGE_KEY_EXPANDED) === 'true';
    let dockPosition = sessionStorage.getItem(STORAGE_KEY_DOCK) || 'bottom';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    /**
     * Creates or retrieves the root element for the AI rail and injects its HTML structure.
     * @returns {HTMLElement} The main container element of the AI rail.
     */
    function createRailElement() {
        const rootId = 'lifeos-ai-rail-root';
        let rootEl = document.getElementById(rootId);
        if (!rootEl) {
            rootEl = document.createElement('div');
            rootEl.id = rootId;
            document.body.appendChild(rootEl);
        }

        // Inject the basic HTML for the AI rail
        rootEl.innerHTML = `
            <div class="lifeos-ai-rail-container" id="lifeos-ai-rail-container">
                <div class="lifeos-ai-rail-transcript-panel" id="lifeos-ai-rail-transcript-panel">
                    <!-- Initial placeholder message -->
                    <div class="lifeos-ai-rail-message assistant">Hey there! How can I help?</div>
                </div>
                <div class="lifeos-ai-rail-input-strip">
                    <button class="lifeos-ai-rail-btn" id="lifeos-ai-rail-toggle-btn" title="Toggle AI Rail">
                        <span id="lifeos-ai-rail-toggle-icon"></span>
                    </button>
                    <input type="text" class="lifeos-ai-rail-input" id="lifeos-ai-rail-input" placeholder="Ask Lumin anything...">
                    <button class="lifeos-ai-rail-btn" id="lifeos-ai-rail-send-btn" title="Send">↑</button>
                    <button class="lifeos-ai-rail-btn" id="lifeos-ai-rail-dock-btn" title="Toggle Dock Position">
                        <span id="lifeos-ai-rail-dock-icon"></span>
                    </button>
                </div>
            </div>
        `;
        return document.getElementById('lifeos-ai-rail-container');
    }

    /**
     * Applies the current expanded/collapsed state and dock position to the rail's CSS classes.
     * Also applies reduced motion settings.
     */
    function applyState() {
        const container = document.getElementById('lifeos-ai-rail-container');
        if (!container) return;

        container.classList.toggle('lifeos-ai-rail-expanded', isExpanded);
        container.classList.toggle('lifeos-ai-rail-collapsed', !isExpanded);

        container.classList.toggle('lifeos-ai-rail-dock-bottom', dockPosition === 'bottom');
        container.classList.toggle('lifeos-ai-rail-dock-top', dockPosition === 'top');

        // Update toggle button icon
        const toggleIcon = document.getElementById('lifeos-ai-rail-toggle-icon');
        if (toggleIcon) toggleIcon.textContent = isExpanded ? '▼' : '▲';

        // Update dock button icon
        const dockIcon = document.getElementById('lifeos-ai-rail-dock-icon');
        if (dockIcon) dockIcon.textContent = dockPosition === 'bottom' ? '⬆' : '⬇';

        applyReducedMotion(); // Ensure reduced motion is applied with state changes
    }

    /**
     * Toggles the expanded/collapsed state of the AI rail.
     */
    function toggleExpanded() {
        isExpanded = !isExpanded;
        sessionStorage.setItem(STORAGE_KEY_EXPANDED, isExpanded.toString());
        applyState();
        if (isExpanded) {
            // Focus the rail's input when expanded
            document.getElementById('lifeos-ai-rail-input')?.focus();
        }
    }

    /**
     * Toggles the dock position of the AI rail between 'bottom' and 'top'.
     */
    function toggleDockPosition() {
        dockPosition = dockPosition === 'bottom' ? 'top' : 'bottom';
        sessionStorage.setItem(STORAGE_KEY_DOCK, dockPosition);
        applyState();
    }

    /**
     * Handles sending a message from the AI rail. It attempts to hand off the message
     * to the main dashboard chat or the Lumin chat overlay if available,
     * otherwise, it displays a stub message within the rail itself.
     */
    function handleInputSend() {
        const railInput = document.getElementById('lifeos-ai-rail-input');
        const text = railInput.value.trim();
        if (!text) return;

        const dashboardChatInput = document.getElementById('chat-input'); // From public/overlay/lifeos-dashboard.html
        const sendChatFunction = window.sendChat; // Global function from public/overlay/lifeos-dashboard.html

        if (dashboardChatInput && typeof sendChatFunction === 'function') {
            // Hand off to the main dashboard chat
            dashboardChatInput.value = text; // Transfer text
            dashboardChatInput.focus();      // Focus main chat
            sendChatFunction();              // Trigger main chat's send
            railInput.value = '';            // Clear rail input
            isExpanded = false; // Collapse rail after sending
            sessionStorage.setItem(STORAGE_KEY_EXPANDED, 'false');
            applyState();
        } else if (window.LuminChat && typeof window.LuminChat.focusInput === 'function' && typeof window.LuminChat.sendMessage === 'function') {
            // Hand off to the Lumin chat overlay (public/overlay/lifeos-chat.html)
            window.LuminChat.focusInput();      // Focus the overlay chat
            window.LuminChat.sendMessage(text); // Send via overlay chat
            railInput.value = '';
            isExpanded = false; // Collapse rail after sending
            sessionStorage.setItem(STORAGE_KEY_EXPANDED, 'false');
            applyState();
        } else {
            // Fallback: display message in rail itself (minimal stub)
            console.warn('AI Rail: No suitable chat entrypoint found to send message. Displaying locally (stub).', text);
            const transcriptPanel = document.getElementById('lifeos-ai-rail-transcript-panel');
            const userMsg = document.createElement('div');
            userMsg.className = 'lifeos-ai-rail-message user';
            userMsg.textContent = text;
            transcriptPanel.appendChild(userMsg);
            railInput.value = '';
            transcriptPanel.scrollTop = transcriptPanel.scrollHeight;
            setTimeout(() => {
                const aiMsg = document.createElement('div');
                aiMsg.className = 'lifeos-ai-rail-message assistant';
                aiMsg.textContent = `(AI Rail stub) You said: "${text}". Please use the main chat for full functionality.`;
                transcriptPanel.appendChild(aiMsg);
                transcriptPanel.scrollTop = transcriptPanel.scrollHeight;
            }, 1000);
        }
    }

    /**
     * Applies or removes CSS transitions based on the user's 'prefers-reduced-motion' setting.
     */
    function applyReducedMotion() {
        const container = document.getElementById('lifeos-ai-rail-container');
        if (container) {
            if (prefersReducedMotion.matches) {
                container.style.transition = 'none';
            } else {
                // Reset to CSS default. Removing the inline style allows the CSS to take over.
                container.style.transition = '';
            }
        }
    }

    /**
     * Mounts the AI rail UI into the DOM and sets up event listeners.
     * This function should be called once the DOM is ready.
     */
    function mount() {
        const container = createRailElement();
        applyState(); // Apply initial state and reduced motion

        // Event Listeners
        document.getElementById('lifeos-ai-rail-toggle-btn')?.addEventListener('click', toggleExpanded);
        document.getElementById('lifeos-ai-rail-dock-btn')?.addEventListener('click', toggleDockPosition);
        document.getElementById('lifeos-ai-rail-send-btn')?.addEventListener('click', handleInputSend);

        const railInput = document.getElementById('lifeos-ai-rail-input');
        if (railInput) {
            railInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInputSend();
                }
            });
            // When the rail input is focused, also focus the main chat input
            railInput.addEventListener('focus', () => {
                const dashboardChatInput = document.getElementById('chat-input');
                if (dashboardChatInput) {
                    dashboardChatInput.focus();
                } else if (window.LuminChat && typeof window.LuminChat.focusInput === 'function') {
                    window.LuminChat.focusInput();
                }
            });
        }

        // Listen for theme attribute changes on the document root
        const themeObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    // No direct JS action needed, CSS variables handle the visual theme changes.
                    // console.log('AI Rail: Theme changed to:', document.documentElement.dataset.theme);
                }
            }
        });
        themeObserver.observe(document.documentElement, { attributes: true });

        // Listen for changes in 'prefers-reduced-motion'
        prefersReducedMotion.addEventListener('change', applyReducedMotion);
    }

    // Expose the mount function globally if reasonable
    if (typeof window !== 'undefined') {
        window.LifeOSDashboardAiRail = { mount };

        // Auto-mount if the DOM is already ready, otherwise wait for DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mount);
        } else {
            mount();
        }
    }
})();