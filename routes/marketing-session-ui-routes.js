// SYNOPSIS: SocialMediaOS / MarketingOS Phase 1 SSR UI — consent → coach → extract → generate → approve → export
// @ssot docs/products/marketingos/PRODUCT_HOME.md

function escapeHtml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderPage(title, bodyHtml, clientScript = '') {
  const authBootstrap = `
      function marketingAuthHeaders(extra = {}) {
        const h = { 'Content-Type': 'application/json', ...extra };
        const token = localStorage.getItem('lifeos_access_token') || '';
        const key = localStorage.getItem('command_key')
          || localStorage.getItem('commandKey')
          || localStorage.getItem('lifeos_command_key')
          || localStorage.getItem('COMMAND_CENTER_KEY')
          || localStorage.getItem('lifeos_key')
          || '';
        if (token) h['Authorization'] = 'Bearer ' + token;
        else if (key) { h['x-command-key'] = key; h['x-api-key'] = key; }
        return h;
      }
      function marketingOwnerId() {
        try {
          const token = localStorage.getItem('lifeos_access_token') || '';
          if (!token) return localStorage.getItem('lifeos_user') || 'adam';
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
          return payload.sub || payload.handle || localStorage.getItem('lifeos_user') || 'adam';
        } catch {
          return localStorage.getItem('lifeos_user') || 'adam';
        }
      }
      function escapeHtml(unsafe) {
        return String(unsafe ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
      function showMsg(el, text, kind) {
        el.innerText = text;
        el.className = 'message ' + (kind || '');
        el.style.display = 'block';
      }
    `;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} | SocialMediaOS</title>
    <style>
        :root {
          --bg: #0a0a0f;
          --surface: #14141c;
          --border: rgba(255,255,255,0.08);
          --text: #e8e8f0;
          --muted: #9999bb;
          --accent: #7c3aed;
          --ok: #10b981;
          --warn: #f59e0b;
          --bad: #ef4444;
        }
        body { font-family: "Manrope", "Avenir Next", system-ui, sans-serif; margin: 0; padding: 20px; background: radial-gradient(1200px 600px at 10% -10%, rgba(124,58,237,0.22), transparent), var(--bg); color: var(--text); line-height: 1.6; }
        .container { max-width: 720px; margin: 32px auto; background: var(--surface); padding: 28px 32px; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 24px 80px rgba(0,0,0,0.35); }
        .brand { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); font-weight: 700; margin-bottom: 8px; }
        h1, h2 { color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 10px; margin: 0 0 18px; font-family: "Space Grotesk", "Trebuchet MS", sans-serif; }
        p, li { color: var(--muted); }
        a { color: #a78bfa; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .actions-row { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; }
        button, input[type="submit"] { background: var(--accent); color: white; padding: 11px 16px; border: none; border-radius: 10px; cursor: pointer; font-size: 15px; }
        button.secondary { background: transparent; border: 1px solid var(--border); color: var(--text); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        button:hover:not(:disabled) { filter: brightness(1.08); }
        input[type="text"], textarea, select { width: 100%; padding: 10px; margin-top: 5px; margin-bottom: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 15px; background: #0d0d15; color: var(--text); box-sizing: border-box; }
        textarea { min-height: 120px; resize: vertical; }
        label { display: block; margin-bottom: 5px; font-weight: 600; color: var(--text); }
        .message { padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; }
        .message.success { background: rgba(16,185,129,0.15); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.35); }
        .message.error { background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.35); }
        .form-group { margin-bottom: 16px; }
        .coach-message { background: rgba(16,185,129,0.1); padding: 14px; border-radius: 10px; margin-bottom: 12px; border-left: 4px solid var(--ok); }
        .user-message { background: rgba(59,130,246,0.1); padding: 14px; border-radius: 10px; margin-bottom: 12px; border-right: 4px solid #3b82f6; text-align: right; }
        .hook-detected { color: #fbbf24; font-weight: 700; margin-top: 6px; }
        .content-card { background: #0d0d15; border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 16px; }
        .content-card h3 { margin-top: 0; color: var(--text); }
        .content-card .actions { text-align: right; margin-top: 12px; }
        .content-card .actions button { margin-left: 8px; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 0.75em; font-weight: 700; text-transform: uppercase; }
        .status-badge.draft, .status-badge.pending { background: rgba(245,158,11,0.2); color: #fbbf24; }
        .status-badge.approved { background: rgba(16,185,129,0.2); color: #6ee7b7; }
        .status-badge.rejected { background: rgba(239,68,68,0.2); color: #fca5a5; }
        .nav-links { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 18px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="brand">SocialMediaOS</div>
        ${bodyHtml}
    </div>
    <script>
    ${authBootstrap}
    ${clientScript}
    </script>
</body>
</html>`;
}

export function registerMarketingSessionUiRoutes(app, deps) {
  const { logger } = deps;

  app.get('/marketing', (req, res) => {
    const body = `
            <h1>SocialMediaOS</h1>
            <p>Turn a real conversation into a content pack — coach → extract → generate → approve → export.</p>
            <div class="actions-row">
              <a href="/marketing/session/new"><button>Start New Session</button></a>
              <a href="/marketing/calendar"><button class="secondary">Content Calendar</button></a>
              <a href="/marketing/atoms"><button class="secondary">Atom Library</button></a>
              <a href="/creative/studio"><button class="secondary">Creative Engine Studio</button></a>
            </div>
            <div class="nav-links">
              <a href="/overlay/lifeos-app.html?stack=socialmediaos">Open inside LifeOS</a>
              <a href="/overlay/lifeos-app.html?page=lifeos-lifere.html">LifeRE Marketing panel</a>
            </div>
        `;
    res.send(renderPage('SocialMediaOS', body));
  });

  app.get('/marketing/session/new', (req, res) => {
    const body = `
            <h1>New Session</h1>
            <p>Consent is required before coaching starts. You review and approve every piece before export.</p>
            <form id="consentForm">
                <div class="form-group">
                    <label for="consentAccepted">I agree to let SocialMediaOS process my input and generate marketing content. I am responsible for reviewing and approving all content before publication.</label>
                    <input type="checkbox" id="consentAccepted" name="consentAccepted" required>
                    <span>I understand and agree</span>
                </div>
                <div class="form-group">
                    <label for="sessionType">Session focus</label>
                    <select id="sessionType" name="sessionType" required>
                        <option value="social_media">Social Media Content</option>
                        <option value="blog_post">Blog Post</option>
                        <option value="email_campaign">Email Campaign</option>
                    </select>
                </div>
                <button type="submit">Start Coaching</button>
            </form>
            <div id="message" class="message" style="display:none;"></div>
        `;
    const clientScript = `
            document.getElementById('consentForm').addEventListener('submit', async function(event) {
                event.preventDefault();
                const messageDiv = document.getElementById('message');
                messageDiv.style.display = 'none';

                const consentAccepted = document.getElementById('consentAccepted').checked;
                const sessionType = document.getElementById('sessionType').value;
                if (!consentAccepted) {
                    showMsg(messageDiv, 'You must agree to the terms to proceed.', 'error');
                    return;
                }

                try {
                    const consentResponse = await fetch('/api/v1/marketing/consent', {
                        method: 'POST',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({
                            owner_id: marketingOwnerId(),
                            consent_type: 'session_recording',
                            consent_text: 'I agree to allow SocialMediaOS to process my input and generate marketing content. I am responsible for reviewing and approving all generated content before publication.',
                            consented_at: new Date().toISOString(),
                            data: { session_type: sessionType }
                        })
                    });
                    const consentData = await consentResponse.json();
                    if (!consentResponse.ok) throw new Error(consentData.error || 'Failed to record consent.');

                    const sessionResponse = await fetch('/api/v1/marketing/sessions', {
                        method: 'POST',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({
                            owner_id: marketingOwnerId(),
                            consent_record_id: consentData.id || consentData.consent?.id,
                            session_type: sessionType,
                            input_mode: 'text',
                            status: 'initialized'
                        })
                    });
                    const sessionData = await sessionResponse.json();
                    if (!sessionResponse.ok) throw new Error(sessionData.error || 'Failed to start session.');

                    window.location.href = '/marketing/session/' + (sessionData.id || sessionData.session?.id);
                } catch (error) {
                    console.error('Error in new session setup:', error);
                    showMsg(messageDiv, 'Error: ' + (error && error.message ? error.message : String(error)), 'error');
                }
            });
        `;
    res.send(renderPage('Start New Session', body, clientScript));
  });

  app.get('/marketing/session/:id', (req, res) => {
    const sessionId = req.params.id;
    const body = `
            <h1>Coaching Session</h1>
            <p>Talk about your business, stories, and goals. When you have enough material, extract stories then generate the content pack.</p>
            <div id="conversation"></div>
            <form id="coachForm">
                <div class="form-group">
                    <label for="userInput">Your message</label>
                    <textarea id="userInput" name="userInput" placeholder="E.g. I help Vegas buyers and sellers — most agents ghost after closing and I refuse to." required></textarea>
                </div>
                <div class="actions-row">
                  <button type="submit">Send to Coach</button>
                  <button type="button" class="secondary" id="extractBtn">Extract Stories</button>
                  <button type="button" id="generateBtn">Generate Content Pack</button>
                </div>
            </form>
            <div id="message" class="message" style="display:none;"></div>
            <div class="nav-links">
              <a href="/marketing/session/${escapeHtml(sessionId)}/content">Review &amp; Approve</a>
              <a href="/marketing/session/${escapeHtml(sessionId)}/export">Export</a>
              <a href="/marketing">Dashboard</a>
            </div>
        `;
    const clientScript = `
            const sessionId = ${JSON.stringify(sessionId)};
            const conversationDiv = document.getElementById('conversation');
            const messageDiv = document.getElementById('message');

            async function loadSession() {
                const response = await fetch('/api/v1/marketing/sessions/' + sessionId, { headers: marketingAuthHeaders() });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to fetch session.');
                const session = data.session || data;
                renderConversation(session.coach_messages_json || []);
                return session;
            }

            function renderConversation(messages) {
                conversationDiv.innerHTML = '';
                (messages || []).forEach(msg => {
                    const msgElement = document.createElement('div');
                    if (msg.role === 'user') {
                        msgElement.className = 'user-message';
                        msgElement.innerHTML = '<p><strong>You:</strong> ' + escapeHtml(msg.content) + '</p>';
                    } else {
                        msgElement.className = 'coach-message';
                        let contentHtml = '<p><strong>Coach:</strong> ' + escapeHtml(msg.content) + '</p>';
                        if (msg.metadata && msg.metadata.hooks_detected && msg.metadata.hooks_detected.length) {
                            contentHtml += '<div class="hook-detected">HOOK DETECTED: ' + escapeHtml(msg.metadata.hooks_detected.join(', ')) + '</div>';
                        }
                        if (msg.hookDetected || msg.hookText) {
                            contentHtml += '<div class="hook-detected">HOOK DETECTED: ' + escapeHtml(msg.hookText || 'yes') + '</div>';
                        }
                        msgElement.innerHTML = contentHtml;
                    }
                    conversationDiv.appendChild(msgElement);
                });
            }

            document.getElementById('coachForm').addEventListener('submit', async function(event) {
                event.preventDefault();
                messageDiv.style.display = 'none';
                const userInput = document.getElementById('userInput').value;
                if (!userInput.trim()) {
                    showMsg(messageDiv, 'Please enter a message.', 'error');
                    return;
                }
                document.getElementById('userInput').value = '';
                try {
                    const response = await fetch('/api/v1/marketing/sessions/' + sessionId + '/coach', {
                        method: 'POST',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({ message: userInput, owner_id: marketingOwnerId() })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to get coach reply.');
                    if (data.hookDetected) showMsg(messageDiv, 'Hook detected: ' + (data.hookText || 'yes'), 'success');
                    await loadSession();
                } catch (error) {
                    console.error('Error in coaching session:', error);
                    showMsg(messageDiv, 'Error: ' + error.message, 'error');
                }
            });

            document.getElementById('extractBtn').addEventListener('click', async function() {
                messageDiv.style.display = 'none';
                this.disabled = true;
                try {
                    const response = await fetch('/api/v1/marketing/sessions/' + sessionId + '/extract', {
                        method: 'POST',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({ owner_id: marketingOwnerId() })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Extract failed.');
                    const n = (data.extractions || data.items || []).length;
                    showMsg(messageDiv, 'Extracted ' + n + ' story items. Next: Generate Content Pack.', 'success');
                } catch (error) {
                    console.error('Extract error:', error);
                    showMsg(messageDiv, 'Error: ' + error.message, 'error');
                } finally {
                    this.disabled = false;
                }
            });

            document.getElementById('generateBtn').addEventListener('click', async function() {
                messageDiv.style.display = 'none';
                this.disabled = true;
                try {
                    const response = await fetch('/api/v1/marketing/sessions/' + sessionId + '/generate', {
                        method: 'POST',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({ owner_id: marketingOwnerId() })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Generate failed.');
                    const n = (data.pieces || data.content || []).length;
                    showMsg(messageDiv, 'Generated ' + n + ' pieces. Opening review…', 'success');
                    setTimeout(function() { window.location.href = '/marketing/session/' + sessionId + '/content'; }, 600);
                } catch (error) {
                    console.error('Generate error:', error);
                    showMsg(messageDiv, 'Error: ' + error.message, 'error');
                } finally {
                    this.disabled = false;
                }
            });

            loadSession().catch(function(error) {
                console.error('Error fetching session details:', error);
                showMsg(messageDiv, 'Error loading conversation: ' + error.message, 'error');
            });
        `;
    res.send(renderPage('Marketing Session', body, clientScript));
  });

  app.get('/marketing/session/:id/content', (req, res) => {
    const sessionId = req.params.id;
    const body = `
            <h1>Review &amp; Approve</h1>
            <p>Approve pieces you want in the export pack. Reject anything that needs another pass.</p>
            <div id="contentList"><p>Loading content…</p></div>
            <div id="message" class="message" style="display:none;"></div>
            <div class="actions-row">
              <a href="/marketing/session/${escapeHtml(sessionId)}/export"><button>Proceed to Export</button></a>
              <a href="/marketing/session/${escapeHtml(sessionId)}"><button class="secondary">Back to Coaching</button></a>
            </div>
        `;
    const clientScript = `
            const sessionId = ${JSON.stringify(sessionId)};
            const contentListDiv = document.getElementById('contentList');
            const messageDiv = document.getElementById('message');

            async function fetchContentPieces() {
                try {
                    const response = await fetch('/api/v1/marketing/sessions/' + sessionId + '/content', { headers: marketingAuthHeaders() });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to fetch content pieces.');
                    const contentPieces = Array.isArray(data) ? data : (data.pieces || data.content || []);
                    if (!contentPieces.length) {
                        contentListDiv.innerHTML = '<p>No content pieces yet. Go back to the session and run Extract → Generate.</p>';
                        return;
                    }
                    contentListDiv.innerHTML = contentPieces.map(function(piece) {
                        const status = String(piece.status || 'draft').toLowerCase();
                        return '<div class="content-card" id="content-piece-' + escapeHtml(piece.id) + '">' +
                          '<h3>' + escapeHtml(piece.title || piece.platform || 'Untitled') + '</h3>' +
                          '<p><strong>Platform:</strong> ' + escapeHtml(piece.platform || 'N/A') +
                          ' · <strong>Format:</strong> ' + escapeHtml(piece.format || 'N/A') +
                          ' · <span class="status-badge ' + escapeHtml(status) + '">' + escapeHtml(status) + '</span></p>' +
                          '<p>' + escapeHtml(piece.content_text || piece.body || 'No content text available.') + '</p>' +
                          '<div class="actions">' +
                          '<button data-action="approve" data-id="' + escapeHtml(piece.id) + '"' + (status === 'approved' ? ' disabled' : '') + '>Approve</button>' +
                          '<button class="secondary" data-action="reject" data-id="' + escapeHtml(piece.id) + '"' + (status === 'rejected' ? ' disabled' : '') + '>Reject</button>' +
                          '</div></div>';
                    }).join('');
                    contentListDiv.querySelectorAll('button[data-action]').forEach(function(btn) {
                      btn.addEventListener('click', function() {
                        updateContentStatus(btn.getAttribute('data-id'), btn.getAttribute('data-action'));
                      });
                    });
                } catch (error) {
                    console.error('Error fetching content pieces:', error);
                    contentListDiv.innerHTML = '<p class="message error">Error loading content: ' + escapeHtml(error.message) + '</p>';
                }
            }

            async function updateContentStatus(contentId, action) {
                messageDiv.style.display = 'none';
                try {
                    const response = await fetch('/api/v1/marketing/content/' + contentId, {
                        method: 'PATCH',
                        headers: marketingAuthHeaders(),
                        body: JSON.stringify({ action: action, owner_id: marketingOwnerId() })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to update content status.');
                    showMsg(messageDiv, 'Content ' + action + 'd.', 'success');
                    fetchContentPieces();
                } catch (error) {
                    console.error('Error updating content status:', error);
                    showMsg(messageDiv, 'Error: ' + error.message, 'error');
                }
            }

            fetchContentPieces();
        `;
    res.send(renderPage('Review & Approve Content', body, clientScript));
  });

  app.get('/marketing/session/:id/export', (req, res) => {
    const sessionId = req.params.id;
    const body = `
            <h1>Export Content Pack</h1>
            <p>Downloads approved pieces only. Approve at least one piece first.</p>
            <button id="downloadButton">Download Content Pack</button>
            <div id="message" class="message" style="display:none;"></div>
            <div class="nav-links">
              <a href="/marketing/session/${escapeHtml(sessionId)}/content">Back to Review</a>
              <a href="/marketing">Dashboard</a>
            </div>
        `;
    const clientScript = `
            const sessionId = ${JSON.stringify(sessionId)};
            const messageDiv = document.getElementById('message');
            document.getElementById('downloadButton').addEventListener('click', async function() {
                messageDiv.style.display = 'none';
                try {
                    const response = await fetch('/api/v1/marketing/sessions/' + sessionId + '/export', { headers: marketingAuthHeaders() });
                    if (!response.ok) {
                      const data = await response.json().catch(function(){ return {}; });
                      throw new Error(data.error || ('Export failed (' + response.status + ')'));
                    }
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'socialmediaos-session-' + sessionId + '.txt';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    showMsg(messageDiv, 'Download started.', 'success');
                } catch (error) {
                    console.error('Error initiating download:', error);
                    showMsg(messageDiv, 'Error: ' + error.message, 'error');
                }
            });
        `;
    res.send(renderPage('Export Content Pack', body, clientScript));
  });

  logger.info('Marketing session UI routes registered.');
}

export default registerMarketingSessionUiRoutes;
