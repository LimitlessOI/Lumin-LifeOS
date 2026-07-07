// SYNOPSIS:
// @ssot docs/products/marketingos/PRODUCT_HOME.md
import express from 'express';

// Helper to escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderPage(title, bodyHtml, clientScript = '') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} | MarketingOS</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; margin: 0; padding: 20px; background-color: #f4f7f6; color: #333; line-height: 1.6; }
        .container { max-width: 700px; margin: 40px auto; background: #fff; padding: 30px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        h1, h2 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
        p, li { color: #555; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
        button, input[type="submit"] { background-color: #28a745; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; transition: background-color 0.2s ease; margin-top: 15px; }
        button:hover, input[type="submit"]:hover { background-color: #218838; }
        input[type="text"], textarea { width: calc(100% - 22px); padding: 10px; margin-top: 5px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; }
        textarea { min-height: 120px; resize: vertical; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #444; }
        .message { padding: 10px 15px; border-radius: 4px; margin-bottom: 15px; }
        .message.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .message.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .form-group { margin-bottom: 20px; }
        .coach-message { background-color: #e9f7ef; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 5px solid #28a745; }
        .user-message { background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-right: 5px solid #3498db; text-align: right; }
        .hook-detected { color: #e74c3c; font-weight: bold; margin-top: 5px; }
        .content-card { background-color: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .content-card h3 { margin-top: 0; color: #2c3e50; }
        .content-card .actions { text-align: right; margin-top: 15px; }
        .content-card .actions button { margin-left: 10px; }
        .status-badge { display: inline-block; padding: 5px 10px; border-radius: 12px; font-size: 0.8em; font-weight: bold; text-transform: uppercase; }
        .status-badge.pending { background-color: #fcf8e3; color: #8a6d3b; }
        .status-badge.approved { background-color: #dff0d8; color: #3c763d; }
        .status-badge.rejected { background-color: #f2dede; color: #a94442; }
    </style>
</head>
<body>
    <div class="container">
        ${bodyHtml}
    </div>
    <script>
        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        function getMarketingStoredValue(key) {
            try { return localStorage.getItem(key) || ''; } catch { return ''; }
        }
        function marketingOwnerId() {
            const params = new URLSearchParams(window.location.search);
            return params.get('owner_id') || getMarketingStoredValue('marketing_owner_id') || '';
        }
        function marketingApiUrl(path) {
            const ownerId = marketingOwnerId();
            if (!ownerId) return path;
            return path + (path.includes('?') ? '&' : '?') + 'owner_id=' + encodeURIComponent(ownerId);
        }
        function marketingJsonHeaders() {
            const headers = { 'Content-Type': 'application/json' };
            const params = new URLSearchParams(window.location.search);
            const commandKey = params.get('key')
                || getMarketingStoredValue('COMMAND_CENTER_KEY')
                || getMarketingStoredValue('commandKey')
                || getMarketingStoredValue('lifeos_command_key');
            const token = getMarketingStoredValue('lifeos_jwt') || getMarketingStoredValue('lifeosToken');
            if (commandKey) headers['x-command-key'] = commandKey;
            else if (token) headers.Authorization = 'Bearer ' + token;
            return headers;
        }
        function withMarketingOwner(body) {
            const ownerId = marketingOwnerId();
            return ownerId ? { ...body, owner_id: ownerId } : body;
        }
        ${clientScript}
    </script>
</body>
</html>`;
}

export function registerMarketingSessionUiRoutes(app, deps) {
    const { baseUrl, logger } = deps;

    // GET /marketing (landing/dashboard — start a new session)
    app.get('/marketing', (req, res) => {
        const body = `
            <h1>MarketingOS Dashboard</h1>
            <p>Welcome to MarketingOS. Let's create some compelling content for your business.</p>
            <p>Start a new marketing session to generate social media content, blog posts, or other marketing materials.</p>
            <a href="/marketing/session/new"><button>Start New Session</button></a>
        `;
        res.send(renderPage('MarketingOS Dashboard', body));
    });

    // GET /marketing/session/new (consent + session setup)
    app.get('/marketing/session/new', (req, res) => {
        const body = `
            <h1>New Marketing Session Setup</h1>
            <p>Before we begin, we need your consent to process your business information and generate content.</p>
            <form id="consentForm">
                <div class="form-group">
                    <label for="consentText">I agree to allow MarketingOS to process my input and generate marketing content based on the provided information. I understand that I am responsible for reviewing and approving all generated content before publication.</label>
                    <input type="checkbox" id="consentAccepted" name="consentAccepted" required>
                    <span>I understand and agree</span>
                </div>
                <div class="form-group">
                    <label for="sessionType">Session Type:</label>
                    <select id="sessionType" name="sessionType" required>
                        <option value="coaching">Coaching Session</option>
                        <option value="interview">Interview</option>
                        <option value="freestyle">Freestyle</option>
                    </select>
                </div>
                <button type="submit">Proceed to Session</button>
            </form>
            <div id="message" class="message" style="display:none;"></div>
        `;
        const clientScript = `
            document.getElementById('consentForm').addEventListener('submit', async function(event) {
                event.preventDefault();
                const messageDiv = document.getElementById('message');
                messageDiv.style.display = 'none';
                messageDiv.className = 'message';

                const consentAccepted = document.getElementById('consentAccepted').checked;
                const sessionType = document.getElementById('sessionType').value;

                if (!consentAccepted) {
                    messageDiv.innerText = 'You must agree to the terms to proceed.';
                    messageDiv.className = 'message error';
                    messageDiv.style.display = 'block';
                    return;
                }

                try {
                    // Step 1: Post consent
                    const consentResponse = await fetch(marketingApiUrl('/api/v1/marketing/consent'), {
                        method: 'POST',
                        headers: marketingJsonHeaders(),
                        body: JSON.stringify(withMarketingOwner({
                            consent_type: 'session_recording',
                            consent_text: 'I agree to allow MarketingOS to process my input and generate marketing content based on the provided information. I understand that I am responsible for reviewing and approving all generated content before publication.',
                            consented_at: new Date().toISOString(),
                            data: { session_type: sessionType }
                        }))
                    });
                    const consentData = await consentResponse.json();

                    if (!consentResponse.ok) {
                        throw new Error(consentData.error || 'Failed to record consent.');
                    }

                    // Step 2: Create session
                    const sessionResponse = await fetch(marketingApiUrl('/api/v1/marketing/sessions'), {
                        method: 'POST',
                        headers: marketingJsonHeaders(),
                        body: JSON.stringify(withMarketingOwner({
                            consent_record_id: consentData.id,
                            session_type: sessionType,
                            input_mode: 'text', // Assuming text input for now
                            status: 'initialized'
                        }))
                    });
                    const sessionData = await sessionResponse.json();

                    if (!sessionResponse.ok) {
                        throw new Error(sessionData.error || 'Failed to start session.');
                    }

                    const ownerId = marketingOwnerId();
                    window.location.href = '/marketing/session/' + encodeURIComponent(sessionData.id) + (ownerId ? '?owner_id=' + encodeURIComponent(ownerId) : '');

                } catch (error) {
                    console.error('Error in new session setup:', error);
                    messageDiv.innerText = 'Error: ' + error.message;
                    messageDiv.className = 'message error';
                    messageDiv.style.display = 'block';
                }
            });
        `;
        res.send(renderPage('Start New Marketing Session', body, clientScript));
    });

    // GET /marketing/session/:id (coaching conversation, text input)
    app.get('/marketing/session/:id', (req, res) => {
        const sessionId = req.params.id;
        const ownerQuery = req.query.owner_id ? `?owner_id=${encodeURIComponent(req.query.owner_id)}` : '';
        const body = `
            <h1>Marketing Coaching Session: ${escapeHtml(sessionId)}</h1>
            <p>Tell me about your business, your goals, and what kind of content you'd like to create.</p>
            <div id="conversation">
                <!-- Coach and user messages will be appended here -->
            </div>
            <form id="coachForm">
                <div class="form-group">
                    <label for="userInput">Your Message:</label>
                    <textarea id="userInput" name="userInput" placeholder="E.g., 'I sell handmade jewelry and want to promote my new summer collection on Instagram.'" required></textarea>
                </div>
                <button type="submit">Send to Coach</button>
            </form>
            <div id="message" class="message" style="display:none;"></div>
            <p><a href="/marketing/session/${escapeHtml(sessionId)}/content${ownerQuery}">Review & Approve Content</a></p>
            <p><a href="/marketing/session/${escapeHtml(sessionId)}/export${ownerQuery}">Export Content Pack</a></p>
        `;
        const clientScript = `
            const sessionId = "${escapeHtml(sessionId)}";
            const conversationDiv = document.getElementById('conversation');
            const messageDiv = document.getElementById('message');

            async function fetchSessionDetails() {
                try {
                    const response = await fetch(marketingApiUrl(\`/api/v1/marketing/sessions/\${sessionId}\`), { headers: marketingJsonHeaders() });
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to fetch session details.');
                    }
                    renderConversation(data.session?.coach_messages_json || []);
                } catch (error) {
                    console.error('Error fetching session details:', error);
                    messageDiv.innerText = 'Error loading conversation: ' + error.message;
                    messageDiv.className = 'message error';
                    messageDiv.style.display = 'block';
                }
            }

            function renderConversation(messages) {
                conversationDiv.innerHTML = ''; // Clear existing messages
                messages.forEach(msg => {
                    const msgElement = document.createElement('div');
                    if (msg.role === 'user') {
                        msgElement.className = 'user-message';
                        msgElement.innerHTML = \`<p><strong>You:</strong> \${escapeHtml(msg.content)}</p>\`;
                    } else if (msg.role === 'assistant') {
                        msgElement.className = 'coach-message';
                        let contentHtml = \`<p><strong>Coach:</strong> \${escapeHtml(msg.content)}</p>\`;
                        if (msg.metadata && msg.metadata.hooks_detected && msg.metadata.hooks_detected.length > 0) {
                            contentHtml += \`<div class="hook-detected">HOOK DETECTED: \${escapeHtml(msg.metadata.hooks_detected.join(', '))}</div>\`;
                        }
                        msgElement.innerHTML = contentHtml;
                    }
                    conversationDiv.appendChild(msgElement);
                });
                conversationDiv.scrollTop = conversationDiv.scrollHeight; // Scroll to bottom
            }

            document.getElementById('coachForm').addEventListener('submit', async function(event) {
                event.preventDefault();
                messageDiv.style.display = 'none';
                messageDiv.className = 'message';

                const userInput = document.getElementById('userInput').value;
                if (!userInput.trim()) {
                    messageDiv.innerText = 'Please enter a message.';
                    messageDiv.className = 'message error';
                    messageDiv.style.display = 'block';
                    return;
                }

                // Add user message to UI immediately
                const existingData = await fetch(marketingApiUrl(\`/api/v1/marketing/sessions/\${sessionId}\`), { headers: marketingJsonHeaders() }).then(r => r.json());
                renderConversation([...(existingData.session?.coach_messages_json || []), { role: 'user', content: userInput }]);
                document.getElementById('userInput').value = ''; // Clear input

                try {
                    const response = await fetch(marketingApiUrl(\`/api/v1/marketing/sessions/\${sessionId}/coach\`), {
                        method: 'POST',
                        headers: marketingJsonHeaders(),
                        body: JSON.stringify(withMarketingOwner({ message: userInput }))
                    });
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to get coach reply.');
                    }

                    // Re-fetch full conversation to ensure all messages and metadata are up-to-date
                    fetchSessionDetails();

                } catch (error) {
                    console.error('Error in coaching session:', error);
                    messageDiv.innerText = 'Error: ' + error.message;
                    messageDiv.className = 'message error';
                    messageDiv.style.display = 'block';
                }
            });

            fetchSessionDetails(); // Load conversation on page load
        `;
        res.send(renderPage(`Marketing Session ${sessionId}`, body, clientScript));
    });

    // GET /marketing/session/:id/content (review + approve generated pieces)
    app.get('/marketing/session/:id/content', (req, res) => {
        const sessionId = req.params.id;
        const ownerQuery = req.query.owner_id ? `?owner_id=${encodeURIComponent(req.query.owner_id)}` : '';
        const body = `
            <h1>Review & Approve Content for Session: ${escapeHtml(sessionId)}</h1>
            <p>Review the generated content pieces below. Approve the ones you want to keep, or reject those that need refinement.</p>
            <div id="contentList">
                <p>Loading content...</p>
            </div>
            <div id="message" class="message" style="display:none;"></div>
            <p><a href="/marketing/session/${escapeHtml(sessionId)}${ownerQuery}">Back to Coaching Session</a></p>
            <p><a href="/marketing/session/${escapeHtml(sessionId)}/export${ownerQuery}"><button>Proceed to Export</button></a></p>
        `;
        const clientScript = `
            const sessionId = "${escapeHtml(sessionId)}";
            const contentListDiv = document.getElementById('contentList');
            const messageDiv = document.getElementById('message');

            async function fetchContentPieces() {
                try {
                    const response = await fetch(marketingApiUrl(\`/api/v1/marketing/sessions/\${sessionId}/content\`), { headers: marketingJsonHeaders() });
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to fetch content pieces.');
                    }

                    const contentPieces = data.pieces || [];
                    if (contentPieces.length === 0) {
                        contentListDiv.innerHTML = '<p>No content pieces generated yet. Please continue your coaching session.</p>';
                        return;
                    }

                    contentListDiv.innerHTML = contentPieces.map(piece => \`
                        <div class="content-card" id="content-piece-\${escapeHtml(piece.id)}">
                            <h3>\${escapeHtml(piece.title || 'Untitled Content')}</h3>
                            <p><strong>Platform:</strong> \${escapeHtml(piece.platform || 'N/A')}</p>
                            <p><strong>Format:</strong> \${escapeHtml(piece.format || 'N/A')}</p>
                            <p><strong>Status:</strong> <span class="status-badge \${escapeHtml(piece.status.toLowerCase())}">\${escapeHtml(piece.status)}</span></p>
                            <p>\${escapeHtml(piece.content_text || piece.body || 'No content text available.')}</p>
                            \${piece.url ? \`<p><a href="\${escapeHtml(piece.url)}" target="_blank">View Source/Draft</a></p>\` : ''}
                            <div class="actions">
                                <button onclick="updateContentStatus('\${escapeHtml(piece.id)}', 'approve')" \${piece.status === 'approved' ? 'disabled' : ''}>Approve</button>
                                <button onclick="updateContentStatus('\${escapeHtml(piece.id)}', 'reject')" \${piece.status === 'rejected' ? 'disabled' : ''}>Reject</button>
                            </div>
                        </div>
                    \`).join('');

                } catch (error) {
                    console.error('Error fetching content pieces:', error);
                    contentListDiv.innerHTML = '<p class="message error">Error loading content: ' + escapeHtml(error.message) + '</p>';
                }
            }

            async function updateContentStatus(contentId, action) {
                messageDiv.style.display = 'none';
                messageDiv.className = 'message';
                try {
                    const response = await fetch(marketingApiUrl(\`/api/v1/marketing/content/\${contentId}\`), {
                        method: 'PATCH',
                        headers: marketingJsonHeaders(),
                        body: JSON.stringify(withMarketingOwner({ action }))
                    });
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to update content status.');
                    }

                    const newStatus = data.piece?.status || (action === 'approve' ? 'approved' : 'rejected');
                    messageDiv.innerText = \`Content \${escapeHtml(contentId)} status updated to \${escapeHtml(newStatus)}.\`;
                    messageDiv.className = 'message success';
                    messageDiv.style.display = 'block';

                    // Update the UI for the specific content piece
                    const contentCard = document.getElementById(\`content-piece-\${escapeHtml(contentId)}\`);
                    if (contentCard) {
                        const statusBadge = contentCard.querySelector('.status-badge');
                        statusBadge.className = \`status-badge \${escapeHtml(newStatus.toLowerCase())}\`;
                        statusBadge.innerText = escapeHtml(newStatus);
                        contentCard.querySelector('button:nth-child(1)').disabled = (newStatus === 'approved');
                        contentCard.querySelector('button:nth-child(2)').disabled = (newStatus === 'rejected');
                    }

                } catch (error) {
                    console.error('Error updating content status:', error);
                    messageDiv.innerText = 'Error: ' + error.message;
                    messageDiv.className = 'message error';
                    messageDiv.style.display = 'block';
                }
            }

            fetchContentPieces();
        `;
        res.send(renderPage('Review & Approve Content', body, clientScript));
    });

    // GET /marketing/session/:id/export (download the content pack)
    app.get('/marketing/session/:id/export', (req, res) => {
        const sessionId = req.params.id;
        const ownerQuery = req.query.owner_id ? `?owner_id=${encodeURIComponent(req.query.owner_id)}` : '';
        const body = `
            <h1>Export Content Pack for Session: ${escapeHtml(sessionId)}</h1>
            <p>Your content is ready to be exported. Click the button below to download your content pack.</p>
            <button id="downloadButton">Download Content Pack</button>
            <div id="message" class="message" style="display:none;"></div>
            <p><a href="/marketing/session/${escapeHtml(sessionId)}/content${ownerQuery}">Back to Content Review</a></p>
        `;
        const clientScript = `
            const sessionId = "${escapeHtml(sessionId)}";
            const messageDiv = document.getElementById('message');

            document.getElementById('downloadButton').addEventListener('click', async function() {
                messageDiv.style.display = 'none';
                messageDiv.className = 'message';
                try {
                    // Redirect directly to the API endpoint, which should trigger a file download
                    window.location.href = marketingApiUrl(\`/api/v1/marketing/sessions/\${sessionId}/export\`);
                    // Note: The download might not show a direct success message here
                    // as the browser handles the file download.
                    messageDiv.innerText = 'Download initiated. Please check your downloads folder.';
                    messageDiv.className = 'message success';
                    messageDiv.style.display = 'block';
                } catch (error) {
                    console.error('Error initiating download:', error);
                    messageDiv.innerText = 'Error initiating download: ' + error.message;
                    messageDiv.className = 'message error';
                    messageDiv.style.display = 'block';
                }
            });
        `;
        res.send(renderPage('Export Content Pack', body, clientScript));
    });

    logger.info('Marketing session UI routes registered.');
}

export default registerMarketingSessionUiRoutes;