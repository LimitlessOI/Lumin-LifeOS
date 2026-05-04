// Contract: docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md
(function() {
    const STORAGE_KEY_EXPANDED = 'lifeos-ai-rail:is-expanded';
    const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock-position';
    const REDUCED_MOTION_CLASS = 'reduced-motion';

    /**
     * Mounts the AI Rail UI into the specified root element.
     * @param {HTMLElement} [rootEl] - The root element to mount into. Defaults to #lifeos-ai-rail-root.
     */
    function mount(rootEl) {
        let railRoot = rootEl || document.getElementById('lifeos-ai-rail-root');

        if (!railRoot) {
            railRoot = document.createElement('div');
            railRoot.id = 'lifeos-ai-rail-root';
            document.body.appendChild(railRoot);
        }

        // Respect reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            railRoot.classList.add(REDUCED_MOTION_CLASS);
        }

        // Initial HTML structure
        railRoot.innerHTML = `
            <div class="lifeos-ai-rail-collapsed">
                <input type="text" class="lifeos-ai-rail-input" placeholder="Ask Lumin..." aria-label="Ask Lumin">
                <button class="lifeos-ai-rail-mic-btn" aria-label="Voice input">🎙</button>
                <button class="lifeos-ai-rail-toggle-btn" aria-label="Toggle AI Rail">AI</button>
                <div class="lifeos-ai-rail-activity-indicator" aria-hidden="true"></div>
            </div>
            <div class="lifeos-ai-rail-expanded">
                <div class="lifeos-ai-rail-header">
                    <span class="lifeos-ai-rail-title">Lumin AI</span>
                    <div style="display:flex; gap: 8px;">
                        <button class="lifeos-ai-rail-dock-toggle-btn" aria-label="Toggle dock position">Dock Bottom</button>
                        <button class="lifeos-ai-rail-close-btn" aria-label="Close AI Rail">✕</button>
                    </div>
                </div>
                <div class="lifeos-ai-rail-messages">
                    <!-- Placeholder for messages, not full chat logic -->
                    <div class="lifeos-ai-rail-msg lifeos-ai-rail-msg-assistant">Hello! How can I help you today?</div>
                </div>
                <div class="lifeos-ai-rail-input-area">
                    <input type="text" class="lifeos-ai-rail-input" placeholder="Type a message..." aria-label="Type a message">
                    <button class="lifeos-ai-rail-mic-btn" aria-label="Voice input">🎙</button>
                    <button class="lifeos-ai-rail-send-btn" aria-label="Send message">↑</button>
                </div>
            </div>
        `;

        const collapsedInput = railRoot.querySelector('.lifeos-ai-rail-collapsed .lifeos-ai-rail-input');
        const expandedInput = railRoot.querySelector('.lifeos-ai-rail-expanded .lifeos-ai-rail-input');
        const toggleBtn = railRoot.querySelector('.lifeos-ai-rail-toggle-btn');
        const closeBtn = railRoot.querySelector('.lifeos-ai-rail-close-btn');
        const dockToggleBtn = railRoot.querySelector('.lifeos-ai-rail-dock-toggle-btn');
        const collapsedMicBtn = railRoot.querySelector('.lifeos-ai-rail-collapsed .lifeos-ai-rail-mic-btn');
        const expandedMicBtn = railRoot.querySelector('.lifeos-ai-rail-expanded .lifeos-ai-rail-mic-btn');
        const sendBtn = railRoot.querySelector('.lifeos-ai-rail-send-btn');

        let isExpanded = sessionStorage.getItem(STORAGE_KEY_EXPANDED) === 'true';
        let dockPosition = sessionStorage.getItem(STORAGE_KEY_DOCK) || 'bottom'; // 'bottom' or 'top'

        function applyState() {
            railRoot.classList.toggle('is-expanded', isExpanded);
            railRoot.classList.remove('lifeos-ai-rail-dock-bottom', 'lifeos-ai-rail-dock-top');
            railRoot.classList.add(`lifeos-ai-rail-dock-${dockPosition}`);
            dockToggleBtn.textContent = `Dock ${dockPosition === 'bottom' ? 'Top' : 'Bottom'}`;
            toggleBtn.setAttribute('aria-expanded', isExpanded);
            closeBtn.setAttribute('aria-expanded', isExpanded);
        }

        function toggleExpanded() {
            isExpanded = !isExpanded;
            sessionStorage.setItem(STORAGE_KEY_EXPANDED, isExpanded);
            applyState();
            if (isExpanded) {
                expandedInput.focus();
            } else {
                collapsedInput.focus();
            }
        }

        function toggleDockPosition() {
            dockPosition = dockPosition === 'bottom' ? 'top' : 'bottom';
            sessionStorage.setItem(STORAGE_KEY_DOCK, dockPosition);
            applyState();
        }

        function focusDashboardChat(railInputEl) {
            const dashboardChatInput = document.getElementById('chat-input');
            if (dashboardChatInput) {
                if (railInputEl && railInputEl.value.trim()) {
                    dashboardChatInput.value = railInputEl.value.trim();
                    railInputEl.value = '';
                }
                dashboardChatInput.focus();
                // If the dashboard has an autoResize function for its chat input, call it
                if (typeof window.autoResize === 'function') {
                    window.autoResize(dashboardChatInput);
                }
            }
            // Collapse the rail after delegating to main chat
            if (isExpanded) {
                toggleExpanded();
            }
        }

        function handleMicInput() {
            // Delegate to the main dashboard's voice control if available
            if (window.LifeOSVoiceChat && window.voiceCtrl && typeof window.voiceCtrl.startMic === 'function') {
                window.voiceCtrl.startMic();
                // Optionally, collapse the rail if it's expanded, as voice input will happen in main chat
                if (isExpanded) {
                    toggleExpanded();
                }
            } else {
                // Fallback: just focus the main chat input
                focusDashboardChat(null); // No text transfer, just activate mic
            }
        }

        // Event Listeners
        toggleBtn.addEventListener('click', toggleExpanded);
        closeBtn.addEventListener('click', toggleExpanded);
        dockToggleBtn.addEventListener('click', toggleDockPosition);

        collapsedInput.addEventListener('focus', () => focusDashboardChat(collapsedInput));
        collapsedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                focusDashboardChat(collapsedInput);
                // If dashboard has a sendChat function, try to trigger it
                if (typeof window.sendChat === 'function') {
                    window.sendChat();
                }
            }
        });

        expandedInput.addEventListener('focus', () => focusDashboardChat(expandedInput));
        expandedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                focusDashboardChat(expandedInput);
                // If dashboard has a sendChat function, try to trigger it
                if (typeof window.sendChat === 'function') {
                    window.sendChat();
                }
            }
        });

        sendBtn.addEventListener('click', () => {
            focusDashboardChat(expandedInput);
            // If dashboard has a sendChat function, try to trigger it
            if (typeof window.sendChat === 'function') {
                window.sendChat();
            }
        });

        collapsedMicBtn.addEventListener('click', handleMicInput);
        expandedMicBtn.addEventListener('click', handleMicInput);

        // Apply initial state
        applyState();
    }

    // Attach to window if reasonable (as per spec)
    if (typeof window !== 'undefined') {
        window.LifeOSDashboardAiRail = { mount };
    }

    // Auto-mount on DOMContentLoaded to ensure dependencies like window.LifeOSVoiceChat are initialized.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Ensure the root element exists before mounting
            let railRoot = document.getElementById('lifeos-ai-rail-root');
            if (!railRoot) {
                railRoot = document.createElement('div');
                railRoot.id = 'lifeos-ai-rail-root';
                document.body.appendChild(railRoot);
            }
            mount(railRoot);
        });
    } else {
        // If DOM is already ready (e.g., script loaded dynamically), mount immediately
        mount();
    }
})();