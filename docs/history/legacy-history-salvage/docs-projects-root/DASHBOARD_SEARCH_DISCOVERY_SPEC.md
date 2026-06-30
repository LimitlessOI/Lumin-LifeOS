<!-- SYNOPSIS: Documentation — DASHBOARD SEARCH DISCOVERY SPEC. -->

ASSUMPTIONS:
1.  The task "Specify cross-surface discovery" implies creating a specification document.
2.  Despite the "Generate the complete implementation code" instruction in the output contract, the "defer implementation" in the task means the HTML output should *describe* the features, not *implement* them in JavaScript/CSS/HTML for immediate deployment.
3.  The `target_file` for this specification is `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, and I am providing its content in HTML format due to the "HTML FULL FILE — STRICT OUTPUT CONTRACT" instruction.
4.  The HTML document will be a self-contained specification, not modifying `lifeos-dashboard.html` or `lifeos-chat.html`.

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cross-Surface Discovery Specification · LifeOS</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #e8e8f0; background-color: #0a0a0f; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background-color: #111118; padding: 30px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.07); }
        h1, h2, h3 { color: #6c63ff; margin-top: 20px; margin-bottom: 10px; }
        h1 { font-size: 2.2em; }
        h2 { font-size: 1.8em; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 5px; }
        h3 { font-size: 1.4em; }
        p { margin-bottom: 10px; }
        ul { margin-bottom: 10px; padding-left: 20px; }
        li { margin-bottom: 5px; }
        code { background-color: #1e1e28; padding: 2px 5px; border-radius: 4px; font-family: monospace; color: #9999bb; }
        .note { background-color: rgba(108,99,255,0.12); border-left: 4px solid #6c63ff; padding: 10px 15px; margin: 20px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Cross-Surface Discovery Specification</h1>
        <p><strong>Date:</strong> 2026-04-26</p>
        <p>This document specifies proposed enhancements for cross-surface discovery within the LifeOS platform, enabling seamless transitions and efficient information retrieval across the Dashboard and Lumin chat interfaces. Implementation is deferred.</p>

        <h2>1. Jumping from Dashboard to Lumin with Context Hints</h2>
        <h3>1.1. Objective</h3>
        <p>Enable users to initiate a conversation with Lumin directly from the Dashboard, automatically providing Lumin with relevant context about the user's current view or selected entity on the Dashboard.</p>

        <h3>1.2. User Experience</h3>
        <ul>
            <li><strong>Contextual Chat Button:</strong> On Dashboard widgets (e.g., MITs, Goals, Calendar Events), a small, discreet icon (e.g., a chat bubble or Lumin's avatar) will appear on hover or as a persistent element.</li>
            <li><strong>Click Action:</strong> Clicking this icon will open the Lumin chat interface (<code>public/overlay/lifeos-chat.html</code>) and automatically pre-populate the chat input or send an initial message to Lumin.</li>
            <li><strong>Pre-populated Message Examples:</strong>
                <ul>
                    <li>From an MIT: "Lumin, tell me more about this MIT: '[MIT Description]'."</li>
                    <li>From a Goal: "Lumin, what's the next step for my goal: '[Goal Name]'?"</li>
                    <li>From a Calendar Event: "Lumin, what should I prepare for this event: '[Event Title]' at [Time]?"</li>
                    <li>From a general widget area (e.g., "Today's MITs" card): "Lumin, I'm looking at my MITs. What's your take on my progress today?"</li>
                </ul>
            </li>
            <li><strong>Lumin's Response:</strong> Lumin will receive the contextual hint and respond intelligently, leveraging its knowledge base and the provided context.</li>
        </ul>

        <h3>1.3. Technical Considerations (High-Level)</h3>
        <ul>
            <li><strong>Dashboard Integration:</strong> Each relevant Dashboard widget (e.g., <code>lifeos-widget-mit.js</code>, <code>lifeos-widget-score.js</code>) will need to expose a mechanism to trigger this action and pass its specific data.</li>
            <li><strong>Lumin Chat Interface:</strong> The <code>lifeos-chat.html</code> would need to accept URL parameters or a JavaScript API call to receive the context and pre-fill the input/send the message.
                <ul>
                    <li>Example: <code>/overlay/lifeos-chat.html?contextType=mit&entityId=123&description=My%20MIT</code></li>
                </ul>
            </li>
            <li><strong>API Endpoint:</strong> A new or extended chat API endpoint might be needed to handle these contextual messages, ensuring Lumin can correctly interpret and act upon the provided context.</li>
            <li><strong>Security:</strong> Ensure proper sanitization and authorization for any data passed between surfaces.</li>
        </ul>

        <h2>2. Command Palette Feasibility</h2>
        <h3>2.1. Objective</h3>
        <p>Evaluate the feasibility of implementing a system-wide command palette for quick access to actions, navigation, and information across LifeOS.</p>

        <h3>2.2. User Experience</h3>
        <ul>
            <li><strong>Activation:</strong> A universal keyboard shortcut (e.g., <code>Cmd+K</code> on macOS, <code>Ctrl+K</code> on Windows/Linux) would open a modal command palette.</li>
            <li><strong>Search & Filter:</strong> Users can type to search for:
                <ul>
                    <li><strong>Actions:</strong> "Add MIT", "Review Goals", "Start Mirror Session", "Toggle Theme".</li>
                    <li><strong>Navigation:</strong> "Go to Dashboard", "Open Lumin Chat", "View Settings".</li>
                    <li><strong>Entities:</strong> Search for specific MITs, Goals, Calendar Events, or even past chat threads.</li>
                </ul>
            </li>
            <li><strong>Contextual Commands:</strong> The palette could offer context-aware commands based on the current page (e.g., if on Dashboard, suggest "Add MIT for Today").</li>
        </ul>

        <h3>2.3. Technical Considerations (High-Level)</h3>
        <ul>
            <li><strong>Global Event Listener:</strong> A single, lightweight JavaScript module would listen for the activation shortcut.</li>
            <li><strong>Modal UI:</strong> A reusable, accessible modal component for the palette.</li>
            <li><strong>Search Indexing:</strong> A client-side or server-side mechanism to index available commands, navigation targets, and searchable entities.
                <ul>
                    <li>Client-side: Each domain/widget registers its commands/entities with a central palette service.</li>
                    <li>Server-side: A dedicated API endpoint (e.g., <code>/api/v1/lifeos/search/commands</code>, <code>/api/v1/lifeos/search/entities</code>) to provide a comprehensive list.</li>
                </ul>
            </li>
            <li><strong>Action Dispatch:</strong> A standardized way to dispatch actions (e.g., calling a global JS function, navigating to a URL, triggering an API call) based on user selection.</li>
            <li><strong>Performance:</strong> Ensure fast search and rendering, especially for a large number of entities/commands.</li>
        </ul>

        <h2>3. Searchable Entities List (MITs/Goals/Events)</h2>
        <h3>3.1. Objective</h3>
        <p>Provide a unified search capability for core LifeOS entities (MITs, Goals, Calendar Events) beyond just chat messages.</p>

        <h3>3.2. User Experience</h3>
        <ul>
            <li><strong>Integrated Search:</strong> This could be part of the Command Palette (as described above) or a dedicated search input on the Dashboard or Lumin chat.</li>
            <li><strong>Search Scope:</strong> Users can specify or implicitly search across:
                <ul>
                    <li>Most Important Tasks (MITs)</li>
                    <li>Goals (current and archived)</li>
                    <li>Calendar Events (past and future)</li>
                    <li>(Future) Other entities like Journal entries, Hypotheses, etc.</li>
                </ul>
            </li>
            <li><strong>Results Display:</strong> Search results would clearly indicate the entity type, relevant details (e.g., MIT description, Goal progress, Event time), and a link to navigate to the full detail view of that entity.</li>
        </ul>

        <h3>3.3. Technical Considerations (High-Level)</h3>
        <ul>
            <li><strong>API Endpoint:</strong> A new, generalized search API endpoint (e.g., <code>/api/v1/lifeos/search/unified?q=query&types=mits,goals,events</code>) would be required.</li>
            <li><strong>Database Indexing:</strong> Ensure relevant database tables (<code>commitments</code>, <code>goals</code>, <code>calendar_events</code>) are indexed for efficient full-text search.</li>
            <li><strong>Result Formatting:</strong> The API should return structured data that can be easily rendered on the client-side, including metadata for navigation.</li>
            <li><strong>Permissions:</strong> Search results must respect user permissions and data privacy.</li>
            <li><strong>Existing Search Extension:</strong> The existing <code>/api/v1/lifeos/chat/search</code> endpoint in <code>lifeos-chat.html</code> could be refactored or extended to support broader entity search.</li>
        </ul>
    </div>
</body>
</html>