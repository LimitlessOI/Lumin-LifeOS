/**
 * @file DASHBOARD_AI_RAIL_CONTRACT.md
 * @brief Implements the persistent AI Rail UX for LifeOS Dashboard.
 */
(() => {
    const ROOT_ID = 'lifeos-ai-rail-root';
    const STORAGE_KEY_COLLAPSED = 'lifeos-ai-rail:collapsed';
    const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock';
    const DEFAULT_DOCK = 'bottom';
    const DEFAULT_COLLAPSED = true; // Default to collapsed state

    /**
     * Renders or updates the AI Rail UI.
     * @param {HTMLElement} root - The root element for the AI Rail.
     * @param {boolean} isCollapsed - Current collapsed state.
     * @param {string} dockPosition - Current dock position ('top' or 'bottom').
     * @param {boolean} prefersReducedMotion - True if user prefers reduced motion.
     * @param {function} focusChatInputCallback - Callback to focus the chat input.
     */
    function renderRail(root, isCollapsed, dockPosition, prefersReducedMotion, focusChatInputCallback) {
        root.setAttribute('data-dock', dockPosition);
        root.classList.toggle('collapsed', isCollapsed);

        if (prefersReducedMotion) {
            root.style.transition = 'none';
            // Re-enable transitions after a short delay to allow initial state to set without transition
            setTimeout(() => root.style.transition = '', 0);
        }

        root.innerHTML = `
            <div class="lifeos-ai-rail-header">
                <button class="lifeos-ai-rail-toggle" aria-expanded="${!isCollapsed}" aria-label="${isCollapsed ? 'Expand AI Assistant' : 'Collapse AI Assistant'}">
                    <span class="icon">${isCollapsed ? '▲' : '▼'}</span>
                    <span class="label">AI Assistant</span>
                </button>
                <div class="lifeos-ai-rail-dock-controls">
                    <button class="lifeos-ai-rail-dock-btn" data-dock-target="top" aria-label="Dock to Top">⬆</button>
                    <button class="lifeos-ai-rail-dock-btn" data-dock-target="bottom" aria-label="Dock to Bottom">⬇</button>
                </div>
            </div>
            <div class="lifeos-ai-rail-content">
                <div class="lifeos-ai-rail-chat-stub">
                    <p>Your AI assistant is here. Click to open chat or focus input.</p>
                    <button class="lifeos-ai-rail-open-chat-btn">Open Chat</button>
                </div>
            </div>
        `;

        const toggleBtn = root.querySelector('.lifeos-ai-rail-toggle');
        const contentArea = root.querySelector('.lifeos-ai-rail-content');

        // Ensure content area visibility is managed by JS, as CSS primarily handles height/transform of root
        contentArea.style.display = isCollapsed ? 'none' : 'block';

        toggleBtn.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            sessionStorage.setItem(STORAGE_KEY_COLLAPSED, isCollapsed);
            root.classList.toggle('collapsed', isCollapsed);
            contentArea.style.display = isCollapsed ? 'none' : 'block';
            toggleBtn.setAttribute('aria-expanded', !isCollapsed);
            toggleBtn.querySelector('.icon').textContent = isCollapsed ? '▲' : '▼';
        });

        root.querySelectorAll('.lifeos-ai-rail-dock-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                dockPosition = btn.dataset.dockTarget;
                sessionStorage.setItem(STORAGE_KEY_DOCK, dockPosition);
                root.setAttribute('data-dock', dockPosition);
            });
        });

        const openChatBtn = root.querySelector('.lifeos-ai-rail-open-chat-btn');
        openChatBtn.addEventListener('click', () => {
            if (focusChatInputCallback) {
                focusChatInputCallback();
                // Collapse the rail after opening chat input
                if (!isCollapsed) {
                    isCollapsed = true;
                    sessionStorage.setItem(STORAGE_KEY_COLLAPSED, isCollapsed);
                    root.classList.add('collapsed');
                    contentArea.style.display = 'none';
                    toggleBtn.setAttribute('aria-expanded', false);
                    toggleBtn.querySelector('.icon').textContent = '▲';
                }
            } else {
                // Fallback: open the full chat overlay if no specific input focus callback
                window.open('/overlay/lifeos-chat.html', '_blank');
            }
        });
    }

    /**
     * Mounts the AI Rail component into the DOM.
     * @param {object} options - Configuration options.
     * @param {function} options.focusChatInputCallback - Callback to focus the chat input.
     */
    function mount({ focusChatInputCallback }) {
        let root = document.getElementById(ROOT_ID);
        if (!root) {
            root = document.createElement('div');
            root.id = ROOT_ID;
            document.body.appendChild(root);
        }

        // Initial state from sessionStorage
        let isCollapsed = sessionStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true' || DEFAULT_COLLAPSED;
        let dockPosition = sessionStorage.getItem(STORAGE_KEY_DOCK) || DEFAULT_DOCK;

        // Respect reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Render initial UI
        renderRail(root, isCollapsed, dockPosition, prefersReducedMotion, focusChatInputCallback);

        // Listen for theme attribute changes on the documentElement
        const themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    // The rail's CSS uses CSS variables, so it will automatically adapt.
                    // This listener fulfills the contract requirement for awareness.
                    // console.log('AI Rail: Theme changed to', document.documentElement.dataset.theme);
                }
            });
        });
        themeObserver.observe(document.documentElement, { attributes: true });
    }

    // Expose the mount function globally
    window.LifeOSDashboardAiRail = { mount };
})();