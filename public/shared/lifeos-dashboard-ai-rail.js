/**
 * @file LifeOS Dashboard AI Rail
 * @contract docs/projects/DASHBOARD_AI_RAIL_CONTRACT.md
 */
(function() {
    const ROOT_ID = 'lifeos-ai-rail-root';
    const CONTAINER_CLASS = 'lifeos-ai-rail-container';
    const PANEL_CLASS = 'lifeos-ai-rail-panel';
    const COLLAPSED_CLASS = 'lifeos-ai-rail-collapsed';
    const DOCK_BOTTOM_CLASS = 'lifeos-ai-rail-dock-bottom';
    const DOCK_TOP_CLASS = 'lifeos-ai-rail-dock-top';
    const STORAGE_KEY_EXPANDED = 'lifeos-ai-rail:expanded';
    const STORAGE_KEY_DOCK = 'lifeos-ai-rail:dock';
    const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

    let isExpanded = false;
    let dockPosition = 'bottom'; // 'bottom' or 'top'
    let rootEl = null;
    let containerEl = null;
    let panelEl = null;
    let toggleBtn = null;
    let dockBtn = null;
    let chatBtn = null;
    let focusChatInputCallback = null;

    const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

    function getStoredState(key, defaultValue) {
        try {
            const stored = sessionStorage.getItem(key);
            if (stored === null) return defaultValue;
            return JSON.parse(stored);
        } catch (e) {
            // Fallback to default if sessionStorage is inaccessible or data is corrupt
            return defaultValue;
        }
    }

    function setStoredState(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            // Fail silently if sessionStorage is inaccessible
        }
    }

    function applyTransitions(element, enable) {
        if (prefersReducedMotion.matches) {
            element.style.transition = enable ? '' : 'none'; // Revert to CSS default or disable
        }
    }

    function render() {
        const dockText = dockPosition === 'bottom' ? 'Dock Top' : 'Dock Bottom';
        const toggleText = isExpanded ? 'Collapse' : 'Expand';
        const expandedAria = isExpanded ? 'true' : 'false';

        rootEl.innerHTML = `
            <div class="${CONTAINER_CLASS} ${dockPosition === 'bottom' ? DOCK_BOTTOM_CLASS : DOCK_TOP_CLASS} ${isExpanded ? '' : COLLAPSED_CLASS}">
                <div class="${PANEL_CLASS}">
                    <!-- Collapsed strip -->
                    <div class="lifeos-ai-rail-collapsed-strip" style="${isExpanded ? 'display: none;' : ''}">
                        <div class="lifeos-ai-rail-indicator">AI Rail</div>
                        <button class="lifeos-ai-rail-toggle-btn" aria-expanded="${expandedAria}">${toggleText}</button>
                    </div>

                    <!-- Expanded content -->
                    <div class="lifeos-ai-rail-expanded-content" style="${isExpanded ? '' : 'display: none;'}">
                        <div class="lifeos-ai-rail-header">
                            <div class="lifeos-ai-rail-indicator">AI Rail</div>
                            <div class="lifeos-ai-rail-actions">
                                <button class="lifeos-ai-rail-dock-btn" title="Toggle dock position">${dockText}</button>
                                <button class="lifeos-ai-rail-toggle-btn" aria-expanded="${expandedAria}">${toggleText}</button>
                            </div>
                        </div>
                        <div class="lifeos-ai-rail-body">
                            <p>I know your commitments, your patterns, your wins, and what you're working on. Ask me anything.</p>
                            <button class="lifeos-ai-rail-chat-btn">Open Lumin Chat</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        containerEl = rootEl.querySelector(`.${CONTAINER_CLASS}`);
        panelEl = rootEl.querySelector(`.${PANEL_CLASS}`);
        // Get the toggle button that is currently visible
        toggleBtn = rootEl.querySelector(`.${isExpanded ? 'lifeos-ai-rail-expanded-content' : 'lifeos-ai-rail-collapsed-strip'} .lifeos-ai-rail-toggle-btn`);
        dockBtn = rootEl.querySelector('.lifeos-ai-rail-dock-btn');
        chatBtn = rootEl.querySelector('.lifeos-ai-rail-chat-btn');

        if (toggleBtn) toggleBtn.onclick = toggleExpanded;
        if (dockBtn) dockBtn.onclick = toggleDockPosition;
        if (chatBtn) chatBtn.onclick = handleChatAction;

        // Apply initial reduced motion state
        applyTransitions(containerEl, true);
        applyTransitions(panelEl, true);
    }

    function toggleExpanded() {
        isExpanded = !isExpanded;
        setStoredState(STORAGE_KEY_EXPANDED, isExpanded);

        applyTransitions(containerEl, false);
        applyTransitions(panelEl, false);

        if (isExpanded) {
            containerEl.classList.remove(COLLAPSED_CLASS);
            rootEl.querySelector('.lifeos-ai-rail-collapsed-strip').style.display = 'none';
            rootEl.querySelector('.lifeos-ai-rail-expanded-content').style.display = '';
        } else {
            containerEl.classList.add(COLLAPSED_CLASS);
            rootEl.querySelector('.lifeos-ai-rail-collapsed-strip').style.display = '';
            rootEl.querySelector('.lifeos-ai-rail-expanded-content').style.display = 'none';
        }

        // Update button text and aria-expanded for both toggle buttons (only one is visible)
        const newToggleText = isExpanded ? 'Collapse' : 'Expand';
        const newExpandedAria = isExpanded ? 'true' : 'false';
        rootEl.querySelectorAll('.lifeos-ai-rail-toggle-btn').forEach(btn => {
            btn.textContent = newToggleText;
            btn.setAttribute('aria-expanded', newExpandedAria);
        });

        // Re-enable transitions after a short delay to allow DOM update
        setTimeout(() => {
            applyTransitions(containerEl, true);
            applyTransitions(panelEl, true);
        }, 50);
    }

    function toggleDockPosition() {
        dockPosition = dockPosition === 'bottom' ? 'top' : 'bottom';
        setStoredState(STORAGE_KEY_DOCK, dockPosition);

        applyTransitions(containerEl, false);
        applyTransitions(panelEl, false);

        if (dockPosition === 'bottom') {
            containerEl.classList.remove(DOCK_TOP_CLASS);
            containerEl.classList.add(DOCK_BOTTOM_CLASS);
        } else {
            containerEl.classList.remove(DOCK_BOTTOM_CLASS);
            containerEl.classList.add(DOCK_TOP_CLASS);
        }

        if (dockBtn) {
            dockBtn.textContent = dockPosition === 'bottom' ? 'Dock Top' : 'Dock Bottom';
        }

        setTimeout(() => {
            applyTransitions(containerEl, true);
            applyTransitions(panelEl, true);
        }, 50);
    }

    function handleChatAction() {
        if (focusChatInputCallback) {
            focusChatInputCallback();
        } else {
            // Default behavior: try to focus chat input in current document, else open chat overlay
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.focus();
                chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                window.open('/overlay/lifeos-chat.html', '_blank');
            }
        }
    }

    function mount(options = {}) {
        rootEl = document.getElementById(ROOT_ID);
        if (!rootEl) {
            rootEl = document.createElement('div');
            rootEl.id = ROOT_ID;
            document.body.appendChild(rootEl);
        }

        isExpanded = getStoredState(STORAGE_KEY_EXPANDED, false);
        dockPosition = getStoredState(STORAGE_KEY_DOCK, 'bottom');
        focusChatInputCallback = options.focusChatInputCallback;

        render();

        // Listen for theme changes on document.documentElement
        const themeObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    // The rail's CSS uses CSS variables, so visual updates are automatic.
                    // This observer fulfills the "listens for theme attribute changes" requirement.
                }
            }
        });
        themeObserver.observe(document.documentElement, { attributes: true });

        // Listen for reduced motion preference changes
        prefersReducedMotion.addEventListener('change', () => {
            // When preference changes, re-apply transitions based on the new preference
            applyTransitions(containerEl, true);
            applyTransitions(panelEl, true);
        });
    }

    // Attach mount function to window
    window.LifeOSDashboardAiRail = { mount };

})();