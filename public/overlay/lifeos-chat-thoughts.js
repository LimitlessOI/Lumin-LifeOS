/**
 * SYNOPSIS: LifeOS Chat Thought Stream UI Module
 * LifeOS Chat Thought Stream UI Module
 *
 * This script intercepts chat API responses to display a thought stream
 * above assistant messages. It is a classic browser script, self-initializing
 * on DOMContentLoaded, and does not use ES module imports/exports.
 */
(function() {
    // Exit silently if the environment is not a browser or necessary elements are missing
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    const MESSAGE_ENDPOINT_PATTERNS = [
        /\/api\/v1\/lifeos\/builderos\/command-control\/founder-interface\/message/,
        /\/message/ // Legacy path
    ];
    const LUMIN_MESSAGES_CONTAINER_ID = 'lumin-messages';
    const THOUGHT_STREAM_CLASS = 'lifeos-thought-stream';
    const THOUGHT_ITEM_CLASS = 'lifeos-thought-item';
    const THOUGHT_HEADER_CLASS = 'lifeos-thought-header';
    const THOUGHT_CONTENT_CLASS = 'lifeos-thought-content';
    const CHEVRON_CLASS = 'lifeos-chevron';
    const COLLAPSED_CLASS = 'collapsed';
    const EXPAND_ALL_BUTTON_ID = 'lifeos-expand-all-thoughts';
    const COLLAPSE_ALL_BUTTON_ID = 'lifeos-collapse-all-thoughts';

    let luminMessagesContainer = null;

    /**
     * Creates a collapsible thought item.
     * @param {string} label - The label for the thought item.
     * @param {string} content - The content to display when expanded.
     * @param {boolean} isCollapsed - Initial state of the item.
     * @returns {HTMLElement} The created thought item element.
     */
    function createThoughtItem(label, content, isCollapsed = true) {
        const item = document.createElement('div');
        item.classList.add(THOUGHT_ITEM_CLASS);

        const header = document.createElement('div');
        header.classList.add(THOUGHT_HEADER_CLASS);
        header.setAttribute('tabindex', '0'); // Make it focusable
        header.setAttribute('role', 'button'); // Indicate it's interactive
        header.setAttribute('aria-expanded', (!isCollapsed).toString());
        header.addEventListener('click', toggleThought);
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleThought(e);
            }
        });

        const chevron = document.createElement('span');
        chevron.classList.add(CHEVRON_CLASS);
        if (isCollapsed) {
            chevron.classList.add(COLLAPSED_CLASS);
        }
        chevron.innerHTML = '&#9658;'; // Right-pointing triangle

        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;

        header.appendChild(chevron);
        header.appendChild(labelSpan);

        const contentDiv = document.createElement('pre'); // Use pre for preserving formatting
        contentDiv.classList.add(THOUGHT_CONTENT_CLASS);
        contentDiv.textContent = content;
        if (isCollapsed) {
            contentDiv.classList.add(COLLAPSED_CLASS);
        }

        item.appendChild(header);
        item.appendChild(contentDiv);

        return item;
    }

    /**
     * Toggles the collapsed state of a thought item.
     * @param {Event} event - The click event.
     */
    function toggleThought(event) {
        const header = event.currentTarget;
        const item = header.closest(`.${THOUGHT_ITEM_CLASS}`);
        if (!item) return;

        const content = item.querySelector(`.${THOUGHT_CONTENT_CLASS}`);
        const chevron = item.querySelector(`.${CHEVRON_CLASS}`);

        if (content && chevron) {
            const isCollapsed = content.classList.toggle(COLLAPSED_CLASS);
            chevron.classList.toggle(COLLAPSED_CLASS, isCollapsed);
            header.setAttribute('aria-expanded', (!isCollapsed).toString());
        }
    }

    /**
     * Collapses all thought items in the document.
     */
    function collapseAllThoughts() {
        document.querySelectorAll(`.${THOUGHT_ITEM_CLASS}`).forEach(item => {
            const content = item.querySelector(`.${THOUGHT_CONTENT_CLASS}`);
            const chevron = item.querySelector(`.${CHEVRON_CLASS}`);
            const header = item.querySelector(`.${THOUGHT_HEADER_CLASS}`);
            if (content && chevron && header && !content.classList.contains(COLLAPSED_CLASS)) {
                content.classList.add(COLLAPSED_CLASS);
                chevron.classList.add(COLLAPSED_CLASS);
                header.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /**
     * Expands all thought items in the document.
     */
    function expandAllThoughts() {
        document.querySelectorAll(`.${THOUGHT_ITEM_CLASS}`).forEach(item => {
            const content = item.querySelector(`.${THOUGHT_CONTENT_CLASS}`);
            const chevron = item.querySelector(`.${CHEVRON_CLASS}`);
            const header = item.querySelector(`.${THOUGHT_HEADER_CLASS}`);
            if (content && chevron && header && content.classList.contains(COLLAPSED_CLASS)) {
                content.classList.remove(COLLAPSED_CLASS);
                chevron.classList.remove(COLLAPSED_CLASS);
                header.setAttribute('aria-expanded', 'true');
            }
        });
    }

    /**
     * Renders a thought stream panel above an assistant message.
     * @param {HTMLElement} assistantMessageElement - The assistant message element.
     * @param {Object} data - The parsed thought data from the API response.
     */
    function renderThoughtStream(assistantMessageElement, data) {
        if (!assistantMessageElement || !data) return;

        const thoughtStreamPanel = document.createElement('div');
        thoughtStreamPanel.classList.add(THOUGHT_STREAM_CLASS);

        // Add expand/collapse all controls
        const controlsDiv = document.createElement('div');
        controlsDiv.style.display = 'flex';
        controlsDiv.style.justifyContent = 'flex-end';
        controlsDiv.style.gap = '10px';
        controlsDiv.style.marginBottom = '10px';

        const expandAllBtn = document.createElement('button');
        expandAllBtn.id = EXPAND_ALL_BUTTON_ID;
        expandAllBtn.textContent = 'Expand All';
        expandAllBtn.onclick = expandAllThoughts;
        expandAllBtn.style.padding = '5px 10px';
        expandAllBtn.style.border = '1px solid var(--lifeos-color-border)';
        expandAllBtn.style.borderRadius = '4px';
        expandAllBtn.style.background = 'var(--lifeos-color-accent)';
        expandAllBtn.style.color = 'var(--lifeos-color-text-dark)';
        expandAllBtn.style.cursor = 'pointer';
        expandAllBtn.style.fontSize = '0.8em';

        const collapseAllBtn = document.createElement('button');
        collapseAllBtn.id = COLLAPSE_ALL_BUTTON_ID;
        collapseAllBtn.textContent = 'Collapse All';
        collapseAllBtn.onclick = collapseAllThoughts;
        collapseAllBtn.style.padding = '5px 10px';
        collapseAllBtn.style.border = '1px solid var(--lifeos-color-border)';
        collapseAllBtn.style.borderRadius = '4px';
        collapseAllBtn.style.background = 'var(--lifeos-color-bg-dark)';
        collapseAllBtn.style.color = 'var(--lifeos-color-text-muted)';
        collapseAllBtn.style.cursor = 'pointer';
        collapseAllBtn.style.fontSize = '0.8em';

        controlsDiv.appendChild(expandAllBtn);
        controlsDiv.appendChild(collapseAllBtn);
        thoughtStreamPanel.appendChild(controlsDiv);

        const thoughtData = [
            { label: 'Model/Provider', value: data.model_routing || data.provider_used || 'N/A' },
            { label: 'Command Ran', value: data.command_ran ? 'Yes' : 'No' },
            { label: 'Command Executed', value: data.command_executed || 'N/A' },
            { label: 'Target File', value: data.target_file || 'N/A' },
            { label: 'SHA/Commit SHA', value: data.sha || data.commit_sha || 'N/A' },
            { label: 'First Blocker', value: data.first_blocker || 'None' },
            { label: 'Command Truth', value: data.command_truth || 'N/A' },
            { label: 'Pass/Fail', value: data.pass_fail || 'N/A' },
            { label: 'Build Status', value: data.build_status || 'N/A' },
            { label: 'Duration (ms)', value: data.duration_ms !== undefined ? data.duration_ms.toString() : 'N/A' }
        ];

        thoughtData.forEach(item => {
            thoughtStreamPanel.appendChild(createThoughtItem(item.label, item.value));
        });

        // Render thoughts array if present (future schema)
        if (Array.isArray(data.thoughts) && data.thoughts.length > 0) {
            const thoughtsSection = document.createElement('div');
            thoughtsSection.style.marginTop = '15px';
            thoughtsSection.style.borderTop = '1px solid var(--lifeos-color-border)';
            thoughtsSection.style.paddingTop = '10px';

            const thoughtsTitle = document.createElement('h4');
            thoughtsTitle.textContent = 'Detailed Thoughts';
            thoughtsTitle.style.marginBottom = '10px';
            thoughtsTitle.style.color = 'var(--lifeos-color-text)';
            thoughtsSection.appendChild(thoughtsTitle);

            data.thoughts.forEach((thought, index) => {
                const timestamp = thought.timestamp ? new Date(thought.timestamp).toLocaleString() : 'N/A';
                const thoughtContent = `${timestamp}\n${thought.step || thought.message || 'No content'}`;
                thoughtsSection.appendChild(createThoughtItem(`Thought Step ${index + 1}`, thoughtContent));
            });
            thoughtStreamPanel.appendChild(thoughtsSection);
        }

        assistantMessageElement.parentNode.insertBefore(thoughtStreamPanel, assistantMessageElement);
    }

    /**
     * Intercepts fetch calls to process chat responses.
     */
    function interceptFetch() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const [resource, options] = args;

            // Check if the request matches our target endpoints
            const isTargetEndpoint = MESSAGE_ENDPOINT_PATTERNS.some(pattern =>
                (typeof resource === 'string' && pattern.test(resource)) ||
                (resource instanceof Request && pattern.test(resource.url))
            );

            const response = await originalFetch(...args);

            if (isTargetEndpoint && response.ok) {
                const clonedResponse = response.clone();
                clonedResponse.json().then(data => {
                    if (data && data.response_type === 'assistant' && (data.model_routing || data.thoughts || data.command_ran)) {
                        // Attempt to find the last assistant message and attach the thought stream
                        setTimeout(() => { // Give the UI a moment to render the message
                            const messages = luminMessagesContainer ? luminMessagesContainer.querySelectorAll('.message-bubble.assistant') : [];
                            if (messages.length > 0) {
                                const lastAssistantMessage = messages[messages.length - 1];
                                // Ensure we don't duplicate the thought stream for the same message
                                if (!lastAssistantMessage.previousElementSibling || !lastAssistantMessage.previousElementSibling.classList.contains(THOUGHT_STREAM_CLASS)) {
                                    renderThoughtStream(lastAssistantMessage, data);
                                }
                            }
                        }, 100); // Small delay to allow message to render
                    }
                }).catch(e => console.error("LifeOS Chat Thoughts: Error parsing response JSON:", e));
            }

            return response;
        };
    }

    /**
     * Initializes the module when the DOM is ready.
     */
    function initialize() {
        luminMessagesContainer = document.getElementById(LUMIN_MESSAGES_CONTAINER_ID);

        if (!luminMessagesContainer) {
            console.warn(`LifeOS Chat Thoughts: Container #${LUMIN_MESSAGES_CONTAINER_ID} not found. Module will not function.`);
            return;
        }

        // Inject basic styles for the thought stream (if not handled by main CSS)
        // This ensures basic functionality and appearance even if external CSS is missing.
        const styleId = 'lifeos-chat-thoughts-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .${THOUGHT_STREAM_CLASS} {
                    background-color: var(--lifeos-color-bg-dark, #2b2d30);
                    border: 1px solid var(--lifeos-color-border, #444);
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 15px;
                    font-family: var(--lifeos-font-family, sans-serif);
                    color: var(--lifeos-color-text-muted, #aaa);
                    font-size: 0.9em;
                }
                .${THOUGHT_ITEM_CLASS} {
                    margin-bottom: 5px;
                }
                .${THOUGHT_HEADER_CLASS} {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    padding: 5px 0;
                    border-bottom: 1px solid var(--lifeos-color-border-subtle, #383a3d);
                    user-select: none;
                    color: var(--lifeos-color-text, #ddd);
                }
                .${THOUGHT_HEADER_CLASS}:hover {
                    background-color: var(--lifeos-color-bg-hover, #3a3c40);
                    border-radius: 4px;
                }
                .${THOUGHT_HEADER_CLASS}:focus {
                    outline: 2px solid var(--lifeos-color-accent, #007bff);
                    outline-offset: 2px;
                    border-radius: 4px;
                }
                .${CHEVRON_CLASS} {
                    margin-right: 8px;
                    transition: transform 0.2s ease-in-out;
                    color: var(--lifeos-color-accent, #007bff);
                    font-size: 0.7em;
                }
                .${CHEVRON_CLASS}.${COLLAPSED_CLASS} {
                    transform: rotate(0deg);
                }
                .${CHEVRON_CLASS}:not(.${COLLAPSED_CLASS}) {
                    transform: rotate(90deg);
                }
                .${THOUGHT_CONTENT_CLASS} {
                    margin-left: 20px;
                    padding: 5px 0;
                    border-left: 2px solid var(--lifeos-color-accent-dim, #0056b3);
                    padding-left: 10px;
                    white-space: pre-wrap; /* Preserve whitespace and wrap text */
                    word-break: break-all; /* Break long words */
                    overflow-x: auto; /* Allow horizontal scroll for very long lines */
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
                    color: var(--lifeos-color-text-muted, #aaa);
                    font-size: 0.85em;
                }
                .${THOUGHT_CONTENT_CLASS}:not(.${COLLAPSED_CLASS}) {
                    max-height: 500px; /* Arbitrary max-height for expansion */
                    padding-top: 5px;
                    padding-bottom: 5px;
                }
                .${THOUGHT_CONTENT_CLASS}.${COLLAPSED_CLASS} {
                    padding-top: 0;
                    padding-bottom: 0;
                }
                #${EXPAND_ALL_BUTTON_ID}, #${COLLAPSE_ALL_BUTTON_ID} {
                    cursor: pointer;
                    border: 1px solid var(--lifeos-color-border, #444);
                    border-radius: 4px;
                    padding: 5px 10px;
                    font-size: 0.8em;
                    transition: background-color 0.2s ease, color 0.2s ease;
                }
                #${EXPAND_ALL_BUTTON_ID} {
                    background-color: var(--lifeos-color-accent, #007bff);
                    color: var(--lifeos-color-text-dark, #fff);
                }
                #${EXPAND_ALL_BUTTON_ID}:hover {
                    background-color: var(--lifeos-color-accent-hover, #0056b3);
                }
                #${COLLAPSE_ALL_BUTTON_ID} {
                    background-color: var(--lifeos-color-bg-dark, #2b2d30);
                    color: var(--lifeos-color-text-muted, #aaa);
                }
                #${COLLAPSE_ALL_BUTTON_ID}:hover {
                    background-color: var(--lifeos-color-bg-hover, #3a3c40);
                }
            `;
            document.head.appendChild(style);
        }

        interceptFetch();
    }

    // Attach public API to window
    window.LifeOSChatThoughts = {
        renderThoughtStream,
        toggleThought,
        collapseAllThoughts,
        expandAllThoughts
    };

    // Initialize when the DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();