<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LifeOS Cross-Surface Discovery Specification</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #e8e8f0; background-color: #0a0a0f; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 20px auto; background-color: #111118; padding: 30px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.07); }
        h1, h2, h3 { color: #5b6af5; margin-top: 25px; margin-bottom: 15px; }
        h1 { font-size: 2.2em; }
        h2 { font-size: 1.8em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; }
        h3 { font-size: 1.4em; }
        p { margin-bottom: 10px; }
        ul { margin-left: 20px; margin-bottom: 10px; }
        li { margin-bottom: 5px; }
        code { background-color: #1e1e28; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Menlo, monospace; color: #9999bb; }
        .note { background-color: rgba(91,106,245,0.15); border-left: 4px solid #5b6af5; padding: 15px; margin-top: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>LifeOS Cross-Surface Discovery Specification</h1>
        <p><strong>Date:</strong> 2026-04-26</p>
        <p>This document specifies the desired functionality for cross-surface discovery features within the LifeOS platform. Implementation is deferred.</p>

        <h2>1. Jumping from Dashboard to Lumin with Context Hints</h2>
        <h3>1.1. Objective</h3>
        <p>Enable seamless transitions from specific Dashboard elements directly into the Lumin chat interface, carrying relevant context to inform Lumin's response.</p>

        <h3>1.2. Functionality</h3>
        <ul>
            <li><strong>Contextual Jump Points:</strong> Identify key interactive elements on the Dashboard (e.g., individual MITs, calendar events, goals, score tiles) that would benefit from direct Lumin interaction.</li>
            <li><strong>Action Trigger:</strong> Introduce a clear UI affordance (e.g., a "Discuss with Lumin" button, an icon, or a long-press action) on these elements.</li>
            <li><strong>Contextual Payload:</strong> When triggered, the system should capture and transmit a structured context payload to Lumin. This payload should include:
                <ul>
                    <li>Type of entity (e.g., <code>MIT</code>, <code>CalendarEvent</code>, <code>Goal</code>, <code>Score</code>).</li>
                    <li>Unique identifier of the entity (e.g., <code>mit_id</code>, <code>event_id</code>).</li>
                    <li>Key attributes (e.g., <code>title</code>, <code>description</code>, <code>status</code>, <code>score_value</code>).</li>
                </ul>
            </li>
            <li><strong>Lumin Initial Prompt:</strong> Lumin should receive this context and generate an initial, proactive message or prompt to the user, acknowledging the context. For example: "I see you're looking at your MIT 'Finish Q3 Report'. How can I help you with that?"</li>
            <li><strong>Lumin Chat Thread:</strong> The jump should open a new or existing Lumin chat thread, pre-populated with the contextual prompt.</li>
        </ul>

        <h2>2. Command Palette Feasibility</h2>
        <h3>2.1. Objective</h3>
        <p>Evaluate the feasibility of implementing a system-wide command palette for rapid access to LifeOS functions, navigation, and potential direct Lumin commands.</p>

        <h3>2.2. Functionality (Feasibility Study Scope)</h3>
        <ul>
            <li><strong>Activation:</strong> Standard keyboard shortcut (e.g., <code>Cmd+K</code> on macOS, <code>Ctrl+K</code> on Windows/Linux).</li>
            <li><strong>Search & Filter:</strong> A text input field that allows users to search for actions, settings, or entities.</li>
            <li><strong>Initial Scope:</strong>
                <ul>
                    <li><strong>Navigation:</strong> Jump to Dashboard, Lumin, specific domain views (e.g., Health, Finance).</li>
                    <li><strong>Common Actions:</strong> "Add new MIT", "Create new Goal", "Schedule event".</li>
                    <li><strong>Lumin Integration (Conceptual):</strong> Explore how direct Lumin commands (e.g., <code>/plan</code>, <code>/draft</code>) could be exposed or initiated from the palette.</li>
                </ul>
            </li>
            <li><strong>Technical Considerations:</strong> The feasibility study should assess:
                <ul>
                    <li>Performance impact on various devices.</li>
                    <li>Integration with existing routing and state management.</li>
                    <li>Accessibility requirements.</li>
                    <li>Potential for extensibility by other domains.</li>
                </ul>
            </li>
        </ul>
        <div class="note">
            <strong>Note:</strong> This is a feasibility study. The primary output is an assessment and high-level design, not immediate implementation.
        </div>

        <h2>3. Searchable Entities List (MITs/Goals/Events)</h2>
        <h3>3.1. Objective</h3>
        <p>Provide a unified search capability across core LifeOS entities, allowing users to quickly locate and access specific information.</p>

        <h3>3.2. Functionality</h3>
        <ul>
            <li><strong>Target Entities:</strong> Initially, the search should cover:
                <ul>
                    <li>Most Important Tasks (MITs)</li>
                    <li>Goals</li>
                    <li>Calendar Events</li>
                </ul>
            </li>
            <li><strong>Search Interface:</strong> This search could be integrated into the proposed Command Palette (Section 2) or a dedicated search bar accessible from the Dashboard or a global header.</li>
            <li><strong>Search Scope:</strong> Search should query relevant fields for each entity (e.g., title, description, status, dates).</li>
            <li><strong>Results Display:</strong> Search results should be presented clearly, indicating the entity type and providing enough context (e.g., snippet of description, date) to identify the item.</li>
            <li><strong>Direct Access:</strong> Clicking a search result should navigate the user directly to the detailed view of that entity, or to a contextual view within Lumin if applicable (as per Section 1).</li>
            <li><strong>Backend Integration:</strong> Requires a backend search endpoint capable of querying across multiple data sources/tables.</li>
        </ul>
    </div>
</body>
</html>