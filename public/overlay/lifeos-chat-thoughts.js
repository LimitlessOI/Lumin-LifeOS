/**
 * SYNOPSIS: LifeOS overlay UI — Lifeos Chat Thoughts.
 */
(function() {
    document.addEventListener("DOMContentLoaded", function() {
        const messageContainer = document.querySelector("#lumin-messages");
        if (!messageContainer) return;

        const originalFetch = window.fetch;
        window.fetch = function() {
            return originalFetch.apply(this, arguments).then(response => {
                const clone = response.clone();
                clone.json().then(data => {
                    if (data.assistant_response) {
                        renderThoughtStream(data.assistant_response, messageContainer);
                    }
                });
                return response;
            });
        };

        function renderThoughtStream(response, container) {
            const thoughtStream = document.createElement('div');
            thoughtStream.classList.add('thought-stream');
            const labels = {
                model_routing: "Model Routing/Provider Used",
                command_ran: "Command Ran",
                command_executed: "Command Executed",
                target_file: "Target File",
                sha: "SHA/Commit SHA",
                first_blocker: "First Blocker",
                command_truth: "Command Truth",
                pass_fail: "Pass/Fail",
                build_status: "Build Status",
                duration_ms: "Duration (ms)"
            };

            for (const key in labels) {
                if (response[key] !== undefined) {
                    const item = createThoughtItem(labels[key], response[key]);
                    thoughtStream.appendChild(item);
                }
            }

            if (response.thoughts) {
                const thoughtsContainer = document.createElement('div');
                response.thoughts.forEach(thought => {
                    const thoughtItem = document.createElement('div');
                    thoughtItem.textContent = `${thought.timestamp}: ${thought.text}`;
                    thoughtsContainer.appendChild(thoughtItem);
                });
                thoughtStream.appendChild(thoughtsContainer);
            }

            const controlPanel = createControlPanel(thoughtStream);
            container.insertBefore(controlPanel, container.firstChild);
            container.insertBefore(thoughtStream, controlPanel.nextSibling);
        }

        function createThoughtItem(label, value) {
            const item = document.createElement('div');
            item.classList.add('thought-item');
            const header = document.createElement('div');
            header.textContent = label;
            header.classList.add('thought-header');
            header.style.cursor = 'pointer';
            header.addEventListener('click', toggleThought.bind(null, item));
            const content = document.createElement('div');
            content.textContent = value;
            content.classList.add('thought-content');
            content.style.display = 'none';
            item.appendChild(header);
            item.appendChild(content);
            return item;
        }

        function toggleThought(item) {
            const content = item.querySelector('.thought-content');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        }

        function createControlPanel(thoughtStream) {
            const panel = document.createElement('div');
            panel.classList.add('control-panel');
            const expandButton = document.createElement('button');
            expandButton.textContent = 'Expand All';
            expandButton.addEventListener('click', expandAllThoughts.bind(null, thoughtStream));
            const collapseButton = document.createElement('button');
            collapseButton.textContent = 'Collapse All';
            collapseButton.addEventListener('click', collapseAllThoughts.bind(null, thoughtStream));
            panel.appendChild(expandButton);
            panel.appendChild(collapseButton);
            return panel;
        }

        function collapseAllThoughts(thoughtStream) {
            const items = thoughtStream.querySelectorAll('.thought-item .thought-content');
            items.forEach(item => {
                item.style.display = 'none';
            });
        }

        function expandAllThoughts(thoughtStream) {
            const items = thoughtStream.querySelectorAll('.thought-item .thought-content');
            items.forEach(item => {
                item.style.display = 'block';
            });
        }

        window.LifeOSChatThoughts = {
            renderThoughtStream: renderThoughtStream,
            toggleThought: toggleThought,
            collapseAllThoughts: collapseAllThoughts,
            expandAllThoughts: expandAllThoughts
        };
    });
})();
