// SYNOPSIS: Marketing Session UI Routes
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import express from 'express';

export function registerMarketingSessionUiRoutes(app, deps) {
  const { logger, baseUrl } = deps;

  // Helper to render a basic HTML page structure
  const renderPage = (title, bodyContent, scriptContent = '') => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | LifeOS Marketing</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f7f6; color: #333; display: flex; justify-content: center; }
            .container { background-color: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 30px; max-width: 600px; width: 100%; box-sizing: border-box; }
            h1, h2 { color: #2c3e50; text-align: center; margin-bottom: 25px; }
            form { display: flex; flex-direction: column; gap: 15px; }
            label { font-weight: 600; color: #34495e; }
            input[type="text"], input[type="email"], textarea, select { padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px; width: 100%; box-sizing: border-box; }
            button { background-color: #28a745; color: white; padding: 12px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; transition: background-color 0.2s ease; }
            button:hover { background-color: #218838; }
            .message { padding: 12px; border-radius: 6px; margin-top: 20px; text-align: center; }
            .message.success { background-color: #d4edda; color: #155724; border-color: #c3e6cb; }
            .message.error { background-color: #f8d7da; color: #721c24; border-color: #f5c6cb; }
            .link-button { display: inline-block; background-color: #007bff; color: white; padding: 10px 15px; border-radius: 6px; text-decoration: none; font-size: 16px; margin-top: 20px; text-align: center; }
            .link-button:hover { background-color: #0056b3; }
            .form-group { margin-bottom: 15px; }
            .chat-container { border: 1px solid #eee; border-radius: 8px; padding: 15px; max-height: 400px; overflow-y: auto; background-color: #f9f9f9; margin-bottom: 20px; }
            .chat-message { margin-bottom: 10px; padding: 10px; border-radius: 8px; line-height: 1.5; }
            .chat-message.user { background-color: #e0f7fa; text-align: right; margin-left: 20%; }
            .chat-message.coach { background-color: #f0f4f8; text-align: left; margin-right: 20%; }
            .hook-flag { font-size: 0.8em; color: #dc3545; font-weight: bold; margin-left: 10px; }
            .content-item { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; background-color: #fefefe; }
            .content-item h3 { margin-top: 0; color: #34495e; }
            .content-item p { color: #555; }
            .content-actions { display: flex; gap: 10px; margin-top: 15px; }
            .content-actions button.approve { background-color: #28a745; }
            .content-actions button.approve:hover { background-color: #218838; }
            .content-actions button.regenerate { background-color: #ffc107; color: #333; }
            .content-actions button.regenerate:hover { background-color: #e0a800; }
            .status-badge { display: inline-block; padding: 5px 10px; border-radius: 12px; font-size: 0.8em; font-weight: bold; margin-left: 10px; }
            .status-badge.approved { background-color: #d4edda; color: #155724; }
            .status-badge.pending { background-color: #fff3cd; color: #856404; }
        </style>
    </head>
    <body>
        <div class="container">
            ${bodyContent}
        </div>
        <script>
            ${scriptContent}
        </script>
    </body>
    </html>
  `;

  // GET /marketing (landing/dashboard — start a new session)
  app.get('/marketing', (req, res) => {
    logger.info('Serving marketing landing page');
    const bodyContent = `
      <h1>MarketingOS Dashboard</h1>
      <p>Welcome to MarketingOS. Start a new session to generate content tailored for your social media presence.</p>
      <a href="/marketing/session/new" class="link-button">Start New Marketing Session</a>
    `;
    res.send(renderPage('MarketingOS Dashboard', bodyContent));
  });

  // GET /marketing/session/new (consent + session setup — posts to /api/v1/marketing/consent then /api/v1/marketing/sessions)
  app.get('/marketing/session/new', (req, res) => {
    logger.info('Serving new marketing session setup page');
    const bodyContent = `
      <h1>New Marketing Session Setup</h1>
      <p>Before we begin, please review and consent to our terms for content generation.</p>
      <form id="sessionSetupForm">
        <div class="form-group">
          <input type="checkbox" id="consent" name="consent" required>
          <label for="consent">I consent to LifeOS generating marketing content based on my inputs and business context.</label>
        </div>
        <div class="form-group">
          <label for="sessionType">Session Type:</label>
          <select id="sessionType" name="sessionType" required>
            <option value="social_media_campaign">Social Media Campaign</option>
            <option value="blog_post_series">Blog Post Series</option>
            <option value="email_newsletter">Email Newsletter</option>
          </select>
        </div>
        <div class="form-group">
          <label for="businessId">Your Business ID (optional):</label>
          <input type="text" id="businessId" name="businessId" placeholder="e.g., biz_abc123">
        </div>
        <div class="form-group">
          <label for="inputMode">Input Mode:</label>
          <select id="inputMode" name="inputMode" required>
            <option value="text">Text Input</option>
            <option value="audio">Audio Upload</option>
          </select>
        </div>
        <button type="submit">Start Session</button>
        <div id="message" class="message" style="display:none;"></div>
      </form>
    `;

    const scriptContent = `
      document.getElementById('sessionSetupForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const consentCheckbox = document.getElementById('consent');
        const sessionType = document.getElementById('sessionType').value;
        const businessId = document.getElementById('businessId').value;
        const inputMode = document.getElementById('inputMode').value;
        const messageDiv = document.getElementById('message');

        if (!consentCheckbox.checked) {
          messageDiv.textContent = 'You must consent to proceed.';
          messageDiv.className = 'message error';
          messageDiv.style.display = 'block';
          return;
        }

        messageDiv.style.display = 'none';

        try {
          // Step 1: Record Consent
          const consentResponse = await fetch('/api/v1/marketing/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consentText: 'I consent to LifeOS generating marketing content based on my inputs and business context.',
              consentType: 'marketing_content_generation',
              source: 'MarketingOS_UI',
              data: { sessionType, businessId, inputMode }
            })
          });

          if (!consentResponse.ok) {
            const errorData = await consentResponse.json();
            throw new Error(errorData.message || 'Failed to record consent');
          }
          const consentData = await consentResponse.json();
          const consentRecordId = consentData.id;

          // Step 2: Create Marketing Session
          const sessionResponse = await fetch('/api/v1/marketing/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consentRecordId: consentRecordId,
              sessionType: sessionType,
              businessId: businessId || null,
              inputMode: inputMode
            })
          });

          if (!sessionResponse.ok) {
            const errorData = await sessionResponse.json();
            throw new Error(errorData.message || 'Failed to create session');
          }
          const sessionData = await sessionResponse.json();
          window.location.href = \`/marketing/session/\${sessionData.id}\`;

        } catch (error) {
          messageDiv.textContent = 'Error: ' + error.message;
          messageDiv.className = 'message error';
          messageDiv.style.display = 'block';
          console.error('Session setup error:', error);
        }
      });
    `;
    res.send(renderPage('New Marketing Session', bodyContent, scriptContent));
  });

  // GET /marketing/session/:id (coaching conversation, text input; posts to /api/v1/marketing/sessions/:id/coach and shows the coach replies + HOOK DETECTED flags)
  app.get('/marketing/session/:id', async (req, res) => {
    const sessionId = req.params.id;
    logger.info({ sessionId }, 'Serving marketing session coaching page');

    // Fetch existing session data to display chat history
    let sessionData = { coach_messages_json: '[]', transcript_text: '' };
    try {
      const apiResponse = await fetch(`${baseUrl}/api/v1/marketing/sessions/${sessionId}`);
      if (apiResponse.ok) {
        sessionData = await apiResponse.json();
      } else {
        logger.warn({ sessionId, status: apiResponse.status }, 'Failed to fetch session data for coaching page');
      }
    } catch (error) {
      logger.error({ sessionId, error: error.message }, 'Error fetching session data for coaching page');
    }

    const coachMessages = JSON.parse(sessionData.coach_messages_json || '[]');
    const chatHistoryHtml = coachMessages.map(msg => {
      const isUser = msg.role === 'user';
      const hookFlag = msg.hookDetected ? `<span class="hook-flag">HOOK DETECTED</span>` : '';
      const text = msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Basic HTML escaping
      return `<div class="chat-message ${isUser ? 'user' : 'coach'}">${text}${hookFlag}</div>`;
    }).join('');

    const bodyContent = `
      <h1>Marketing Coaching Session: ${sessionId}</h1>
      <p>Engage with the MarketingOS coach to refine your content strategy. Type your messages below.</p>
      <div class="chat-container" id="chatContainer">
        ${chatHistoryHtml}
      </div>
      <form id="coachForm">
        <div class="form-group">
          <label for="userMessage">Your Message:</label>
          <textarea id="userMessage" name="userMessage" rows="4" placeholder="Tell me about your business, target audience, or content ideas..." required></textarea>
        </div>
        <button type="submit">Send Message</button>
        <div id="message" class="message" style="display:none;"></div>
      </form>
      <a href="/marketing/session/${sessionId}/content" class="link-button">Review Generated Content</a>
    `;

    const scriptContent = `
      const sessionId = '${sessionId}';
      const chatContainer = document.getElementById('chatContainer');
      const userMessageInput = document.getElementById('userMessage');
      const messageDiv = document.getElementById('message');

      function appendMessage(role, content, hookDetected = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = \`chat-message \${role}\`;
        messageDiv.innerHTML = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (hookDetected) {
          messageDiv.innerHTML += '<span class="hook-flag">HOOK DETECTED</span>';
        }
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      document.getElementById('coachForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const userMessage = userMessageInput.value.trim();
        if (!userMessage) return;

        appendMessage('user', userMessage);
        userMessageInput.value = '';
        messageDiv.style.display = 'none';

        try {
          const response = await fetch(\`/api/v1/marketing/sessions/\${sessionId}/coach\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send message to coach');
          }

          const coachReply = await response.json();
          appendMessage('coach', coachReply.reply, coachReply.hookDetected);

        } catch (error) {
          messageDiv.textContent = 'Error: ' + error.message;
          messageDiv.className = 'message error';
          messageDiv.style.display = 'block';
          console.error('Coaching error:', error);
        }
      });
      chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to bottom on load
    `;
    res.send(renderPage(`Session ${sessionId} Coaching`, bodyContent, scriptContent));
  });

  // GET /marketing/session/:id/content (review + approve generated pieces; PATCHes /api/v1/marketing/content/:id)
  app.get('/marketing/session/:id/content', async (req, res) => {
    const sessionId = req.params.id;
    logger.info({ sessionId }, 'Serving marketing session content review page');

    let contentPieces = [];
    try {
      const apiResponse = await fetch(`${baseUrl}/api/v1/marketing/sessions/${sessionId}/content`);
      if (apiResponse.ok) {
        contentPieces = await apiResponse.json();
      } else {
        logger.warn({ sessionId, status: apiResponse.status }, 'Failed to fetch content pieces');
      }
    } catch (error) {
      logger.error({ sessionId, error: error.message }, 'Error fetching content pieces');
    }

    const contentHtml = contentPieces.length > 0
      ? contentPieces.map(piece => `
          <div class="content-item" id="content-item-${piece.id}">
            <h3>${piece.title || 'Untitled Content'} <span class="status-badge ${piece.status === 'approved' ? 'approved' : 'pending'}">${piece.status}</span></h3>
            <p><strong>Platform:</strong> ${piece.platform || 'N/A'}</p>
            <p><strong>Format:</strong> ${piece.format || 'N/A'}</p>
            <p>${piece.content_text ? piece.content_text.replace(/\\n/g, '<br>') : 'No content available.'}</p>
            ${piece.url ? `<p><a href="${piece.url}" target="_blank">View Source</a></p>` : ''}
            <div class="content-actions">
              <button class="approve" data-content-id="${piece.id}" ${piece.status === 'approved' ? 'disabled' : ''}>Approve</button>
              <button class="regenerate" data-content-id="${piece.id}">Regenerate</button>
            </div>
            <div id="status-message-${piece.id}" class="message" style="display:none;"></div>
          </div>
        `).join('')
      : '<p>No content pieces generated yet. Please complete the coaching session.</p>';

    const bodyContent = `
      <h1>Review & Approve Content: ${sessionId}</h1>
      <p>Review the generated marketing content pieces below. Approve the ones you like or request regeneration.</p>
      <div id="contentList">
        ${contentHtml}
      </div>
      <a href="/marketing/session/${sessionId}/export" class="link-button">Download Content Pack</a>
    `;

    const scriptContent = `
      const sessionId = '${sessionId}';

      async function updateContentStatus(contentId, status) {
        const messageDiv = document.getElementById(\`status-message-\${contentId}\`);
        messageDiv.style.display = 'none';

        try {
          const response = await fetch(\`/api/v1/marketing/content/\${contentId}\`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || \`Failed to update content status to \${status}\`);
          }

          const updatedPiece = await response.json();
          const contentItem = document.getElementById(\`content-item-\${contentId}\`);
          if (contentItem) {
            const statusBadge = contentItem.querySelector('.status-badge');
            if (statusBadge) {
              statusBadge.textContent = updatedPiece.status;
              statusBadge.className = \`status-badge \${updatedPiece.status === 'approved' ? 'approved' : 'pending'}\`;
            }
            const approveButton = contentItem.querySelector('button.approve');
            if (approveButton && updatedPiece.status === 'approved') {
              approveButton.disabled = true;
            }
          }
          messageDiv.textContent = \`Content \${contentId} \${status} successfully.\`;
          messageDiv.className = 'message success';
          messageDiv.style.display = 'block';

        } catch (error) {
          messageDiv.textContent = 'Error: ' + error.message;
          messageDiv.className = 'message error';
          messageDiv.style.display = 'block';
          console.error('Content update error:', error);
        }
      }

      document.getElementById('contentList').addEventListener('click', (event) => {
        if (event.target.classList.contains('approve')) {
          const contentId = event.target.dataset.contentId;
          updateContentStatus(contentId, 'approved');
        } else if (event.target.classList.contains('regenerate')) {
          const contentId = event.target.dataset.contentId;
          // In a real scenario, this would trigger an API call to regenerate
          // For now, we'll just log and show a message.
          const messageDiv = document.getElementById(\`status-message-\${contentId}\`);
          messageDiv.textContent = 'Regeneration request sent (feature coming soon!).';
          messageDiv.className = 'message success';
          messageDiv.style.display = 'block';
          console.log(\`Regenerate content \${contentId}\`);
        }
      });
    `;
    res.send(renderPage(`Review Content ${sessionId}`, bodyContent, scriptContent));
  });

  // GET /marketing/session/:id/export (download the content pack via /api/v1/marketing/sessions/:id/export)
  app.get('/marketing/session/:id/export', (req, res) => {
    const sessionId = req.params.id;
    logger.info({ sessionId }, 'Serving marketing session export page');

    const bodyContent = `
      <h1>Export Content Pack: ${sessionId}</h1>
      <p>Your marketing content pack is ready for download.</p>
      <button id="downloadButton" class="link-button">Download Content Pack</button>
      <div id="message" class="message" style="display:none;"></div>
      <a href="/marketing/session/${sessionId}/content" class="link-button" style="background-color: #6c757d;">Back to Review</a>
    `;

    const scriptContent = `
      const sessionId = '${sessionId}';
      const messageDiv = document.getElementById('message');

      document.getElementById('downloadButton').addEventListener('click', async () => {
        messageDiv.style.display = 'none';
        try {
          // Trigger the API endpoint for download. The browser will handle the file download.
          window.location.href = \`/api/v1/marketing/sessions/\${sessionId}/export\`;
          messageDiv.textContent = 'Download initiated. Please check your downloads.';
          messageDiv.className = 'message success';
          messageDiv.style.display = 'block';
        } catch (error) {
          messageDiv.textContent = 'Error initiating download: ' + error.message;
          messageDiv.className = 'message error';
          messageDiv.style.display = 'block';
          console.error('Download error:', error);
        }
      });
    `;
    res.send(renderPage(`Export Content ${sessionId}`, bodyContent, scriptContent));
  });
}

export default registerMarketingSessionUiRoutes;