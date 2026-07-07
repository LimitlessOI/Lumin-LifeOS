/**
 * SYNOPSIS: services/marketing-session-ui.js
 */
// services/marketing-session-ui.js
import escape from 'lodash.escape';

const generateHtml = (title, body, scripts = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escape(title)} - MarketingOS</title>
    <style>
        body { font-family: sans-serif; margin: 2em; line-height: 1.6; color: #333; max-width: 600px; margin-left: auto; margin-right: auto; }
        h1, h2 { color: #2c3e50; }
        label { display: block; margin-bottom: 0.5em; font-weight: bold; }
        input[type="text"], textarea, select { width: 100%; padding: 0.8em; margin-bottom: 1em; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { background-color: #3498db; color: white; padding: 0.8em 1.2em; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; }
        button:hover { background-color: #2980b9; }
        .form-group { margin-bottom: 1.5em; }
        .message { padding: 1em; margin-bottom: 1em; border-radius: 4px; }
        .message.success { background-color: #d4edda; color: #155724; border-color: #c3e6cb; }
        .message.error { background-color: #f8d7da; color: #721c24; border-color: #f5c6cb; }
        .content-item { border: 1px solid #eee; padding: 1em; margin-bottom: 1em; border-radius: 4px; }
        .content-item.approved { background-color: #e6ffe6; }
        .content-item.rejected { background-color: #ffe6e6; }
    </style>
</head>
<body>
    ${body}
    ${scripts ? `<script>${scripts}</script>` : ''}
</body>
</html>
`;

export function registerMarketingSessionUi(app) {
    // GET /marketing (landing/dashboard — start a new session)
    app.get('/marketing', (req, res) => {
        const html = generateHtml(
            'Marketing Dashboard',
            `
            <h1>MarketingOS Dashboard</h1>
            <p>Welcome to MarketingOS. Start a new social media content generation session.</p>
            <button onclick="window.location.href='/marketing/session/new'">Start New Session</button>
            `
        );
        res.send(html);
    });

    // GET /marketing/session/new (consent + session setup)
    app.get('/marketing/session/new', (req, res) => {
        const html = generateHtml(
            'New Marketing Session',
            `
            <h1>New Social Media Session</h1>
            <p>This tool helps generate social media content. By proceeding, you agree to review and approve all generated content before publication.</p>
            <form id="newSessionForm">
                <div class="form-group">
                    <label for="platform">Target Platform:</label>
                    <select id="platform" name="platform" required>
                        <option value="linkedin">LinkedIn</option>
                        <option value="twitter">Twitter</option>
                        <option value="facebook">Facebook</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="topic">Session Topic:</label>
                    <input type="text" id="topic" name="topic" placeholder="e.g., 'New product launch for SaaS', 'Company culture post'" required>
                </div>
                <button type="submit">Start Session</button>
            </form>
            `,
            `
            document.getElementById('newSessionForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const platform = document.getElementById('platform').value;
                const topic = document.getElementById('topic').value;

                try {
                    const response = await fetch('/api/v1/marketing/sessions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ platform, topic }),
                    });
                    const data = await response.json();
                    if (response.ok) {
                        window.location.href = \`/marketing/session/\${data.sessionId}\`;
                    } else {
                        alert('Error starting session: ' + (data.message || response.statusText));
                    }
                } catch (error) {
                    console.error('Network error:', error);
                    alert('Network error. Please try again.');
                }
            });
            `
        );
        res.send(html);
    });

    // GET /marketing/session/:id (coaching conversation, text input; posts to /api/v1/marketing/sessions/:id/coach)
    app.get('/marketing/session/:id', (req, res) => {
        const sessionId = escape(req.params.id);
        const html = generateHtml(
            'Session Coaching',
            `
            <h1>Session Coaching: ${sessionId}</h1>
            <div id="conversation">
                <p><strong>System:</strong> How can I assist you with this marketing session?</p>
            </div>
            <form id="coachForm">
                <div class="form-group">
                    <label for="message">Your Input:</label>
                    <textarea id="message" name="message" rows="4" placeholder="e.g., 'Generate ideas for a LinkedIn post about Q3 results'"></textarea>
                </div>
                <button type="submit">Send</button>
            </form>
            `,
            `
            const sessionId = '${sessionId}';
            const conversationDiv = document.getElementById('conversation');
            const coachForm = document.getElementById('coachForm');
            const messageInput = document.getElementById('message');

            const addMessage = (sender, text) => {
                const p = document.createElement('p');
                p.innerHTML = \`<strong>\${sender}:</strong> \${text}\`;
                conversationDiv.appendChild(p);
                conversationDiv.scrollTop = conversationDiv.scrollHeight; // Scroll to bottom
            };

            coachForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const message = messageInput.value.trim();
                if (!message) return;

                addMessage('You', message);
                messageInput.value = ''; // Clear input

                try {
                    const response = await fetch(\`/api/v1/marketing/sessions/\${sessionId}/coach\`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ message }),
                    });
                    const data = await response.json();
                    if (response.ok) {
                        addMessage('System', data.response);
                    } else {
                        addMessage('System', 'Error: ' + (data.message || response.statusText));
                    }
                } catch (error) {
                    console.error('Network error:', error);
                    addMessage('System', 'Network error. Please try again.');
                }
            });
            `
        );
        res.send(html);
    });

    // GET /marketing/session/:id/content (review + approve generated pieces; PATCHes /api/v1/marketing/content/:id)
    app.get('/marketing/session/:id/content', async (req, res) => {
        const sessionId = escape(req.params.id);
        let contentItemsHtml = '<p>No content generated yet. Use the coaching interface to generate content.</p>';
        let scripts = `const sessionId = '${sessionId}';`;

        try {
            // Fetch content items for the session (assuming an API to list them)
            const apiResponse = await fetch(`http://localhost:3000/api/v1/marketing/sessions/${sessionId}/content`); // Assume API is on same host/port
            if (apiResponse.ok) {
                const contentItems = await apiResponse.json();
                if (contentItems && contentItems.length > 0) {
                    contentItemsHtml = contentItems.map(item => `
                        <div class="content-item ${item.status === 'approved' ? 'approved' : item.status === 'rejected' ? 'rejected' : ''}" id="content-item-${escape(item.id)}">
                            <h3>${escape(item.title || 'Untitled Content')}</h3>
                            <p>${escape(item.text)}</p>
                            <p><em>Status: <span id="status-${escape(item.id)}">${escape(item.status)}</span></em></p>
                            <button onclick="updateContentStatus('${escape(item.id)}', 'approved')" ${item.status === 'approved' ? 'disabled' : ''}>Approve</button>
                            <button onclick="updateContentStatus('${escape(item.id)}', 'rejected')" ${item.status === 'rejected' ? 'disabled' : ''}>Reject</button>
                        </div>
                    `).join('');

                    scripts += `
                    async function updateContentStatus(contentId, status) {
                        try {
                            const response = await fetch(\`/api/v1/marketing/content/\${contentId}\`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ status }),
                            });
                            const data = await response.json();
                            if (response.ok) {
                                const statusSpan = document.getElementById(\`status-\${contentId}\`);
                                if (statusSpan) statusSpan.textContent = status;
                                const contentDiv = document.getElementById(\`content-item-\${contentId}\`);
                                if (contentDiv) {
                                    contentDiv.classList.remove('approved', 'rejected');
                                    if (status === 'approved') contentDiv.classList.add('approved');
                                    if (status === 'rejected') contentDiv.classList.add('rejected');
                                    // Disable buttons after action
                                    contentDiv.querySelectorAll('button').forEach(btn => btn.disabled = true);
                                }
                            } else {
                                alert('Error updating content: ' + (data.message || response.statusText));
                            }
                        } catch (error) {
                            console.error('Network error:', error);
                            alert('Network error. Please try again.');
                        }
                    }
                    `;
                }
            } else {
                contentItemsHtml = `<p class="message error">Failed to load content: ${apiResponse.statusText}</p>`;
            }
        } catch (error) {
            console.error('Error fetching content:', error);
            contentItemsHtml = `<p class="message error">Network error fetching content. Please try again.</p>`;
        }


        const html = generateHtml(
            'Review Content',
            `
            <h1>Review & Approve Content: ${sessionId}</h1>
            <p>Review the generated content pieces below. Approve or reject each piece as needed.</p>
            <div id="contentList">
                ${contentItemsHtml}
            </div>
            <p><button onclick="window.location.href='/marketing/session/${sessionId}/export'">Proceed to Export</button></p>
            `,
            scripts
        );
        res.send(html);
    });

    // GET /marketing/session/:id/export (download the content pack via /api/v1/marketing/sessions/:id/export)
    app.get('/marketing/session/:id/export', (req, res) => {
        const sessionId = escape(req.params.id);
        const html = generateHtml(
            'Export Content',
            `
            <h1>Export Content Pack: ${sessionId}</h1>
            <p>Your content session is complete. You can now download the approved content pack.</p>
            <button onclick="downloadContentPack('${sessionId}')">Download Content Pack</button>
            `,
            `
            const sessionId = '${sessionId}';
            function downloadContentPack(sessionId) {
                window.location.href = \`/api/v1/marketing/sessions/\${sessionId}/export\`;
            }
            `
        );
        res.send(html);
    });
}

export default registerMarketingSessionUi;