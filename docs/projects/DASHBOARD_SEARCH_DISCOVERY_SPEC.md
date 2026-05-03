<!DOCTYPE html>
<html lang="en">
<head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Lumin — LifeOS</title> <script src="/overlay/lifeos-bootstrap.js"></script> <style> , ::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } :root { --bg: #0a0a0f; --bg-raised: #0d0d15; --bg-surface: #111118; --bg-card: #17171f; --bg-overlay: #1e1e28; --border: rgba(255,255,255,0.07); --accent: #6c63ff; --accent-dim: rgba(108,99,255,0.12); --accent-glow:rgba(108,99,255,0.25); --text: #e8e8f0; --text-muted: #9999bb; --text-dim: #555566; --green: #22c55e; --red: #ef4444; --radius: 14px; } body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; height: 100vh; display: flex; overflow: hidden; } / ══ Sidebar ══════════════════════════════════════════════════════════════ / .sidebar { width: 260px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; background: var(--bg-raised); overflow: hidden; } .sidebar-header { padding: 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; } .lumin-brand { display: flex; align-items: center; gap: 10px; } .lumin-avatar { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, #6c63ff, #a78bfa); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; } .lumin-name { font-weight: 700; font-size: 15px; } .lumin-status { font-size: 11px; color: var(--green); display: flex; align-items: center; gap: 4px; } .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); } .new-chat-btn { width: 32px; height: 32px; border-radius: 8px; background: var(--accent-dim); border: 1px solid rgba(108,99,255,0.2); color: var(--accent); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: background 0.15s; } .new-chat-btn:hover { background: var(--accent); color: #fff; } / Search / .search-box { padding: 10px 14px; border-bottom: 1px solid var(--border); } .search-box input { width: 100%; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; color: var(--text); font-size: 13px; font-family: inherit; } .search-box input:focus { outline: none; border-color: var(--accent); } .search-box input::placeholder { color: var(--text-dim); } / Mode filter / .mode-filter { display: flex; gap: 4px; padding: 8px 14px; overflow-x: auto; flex-shrink: 0; } .mode-chip { flex-shrink: 0; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all 0.12s; } .mode-chip.active, .mode-chip:hover { background: var(--accent-dim); border-color: var(--accent); color: var(--text); } / Thread list / .thread-list { flex: 1; overflow-y: auto; padding: 6px 8px; } .thread-item { padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background 0.12s; position: relative; } .thread-item:hover { background: var(--bg-card); } .thread-item.active { background: var(--accent-dim); border: 1px solid rgba(108,99,255,0.2); } .thread-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .thread-meta { font-size: 11px; color: var(--text-dim); margin-top: 2px; display: flex; align-items: center; gap: 6px; } .thread-pin { color: var(--accent); font-size: 10px; } .thread-mode-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--bg-overlay); color: var(--text-muted); } / ══ Main chat area ════════════════════════════════════════════════════════ / .chat-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; } / Chat header / .chat-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; } .chat-title-group { display: flex; align-items: center; gap: 12px; } .chat-title { font-size: 16px; font-weight: 600; } .chat-mode-select {
      background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; padding: 4px 10px; color: var(--text-muted); font-size: 12px; cursor: pointer; font-family: inherit; } .chat-mode-select:focus { outline: none; border-color: var(--accent); } .chat-header-actions { display: flex; gap: 6px; } .icon-btn { width: 32px; height: 32px; border-radius: 8px; background: transparent; border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; transition: all 0.12s; } .icon-btn:hover { background: var(--bg-card); color: var(--text); } / Messages / .messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; } .msg-group { display: flex; flex-direction: column; gap: 2px; } .msg-group.user { align-items: flex-end; } .msg-group.assistant { align-items: flex-start; } .msg-sender { font-size: 11px; color: var(--text-dim); padding: 0 4px; margin-bottom: 4px; } .msg-bubble { max-width: 72%; padding: 12px 16px; border-radius: 18px; font-size: 14.5px; line-height: 1.65; position: relative; } .msg-group.user .msg-bubble { background: var(--accent); color: #fff; border-bottom-right-radius: 4px; } .msg-group.assistant .msg-bubble { background: var(--bg-overlay); border: 1px solid var(--border); border-bottom-left-radius: 4px; } .msg-bubble.pinned { border-color: rgba(108,99,255,0.5); } / Message actions (appear on hover) / .msg-actions { display: none; gap: 4px; margin-top: 4px; } .msg-group:hover .msg-actions { display: flex; } .msg-action { padding: 3px 8px; border-radius: 6px; font-size: 11px; background: var(--bg-card); border: 1px solid var(--border); color: var(--text-dim); cursor: pointer; transition: all 0.1s; } .msg-action:hover { color: var(--text); border-color: var(--accent); } .msg-action.active { color: var(--accent); border-color: var(--accent); } / Code blocks in messages / .msg-bubble pre { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin: 8px 0; overflow-x: auto; font-size: 13px; font-family: 'SF Mono', Menlo, monospace; } / Typing indicator / .typing-bubble { background: var(--bg-overlay); border: 1px solid var(--border); border-radius: 18px; border-bottom-left-radius: 4px; padding: 14px 18px; display: flex; gap: 5px; align-items: center; width: fit-content; } .typing-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-dim); animation: pulse 1.3s infinite; } .typing-dot:nth-child(2) { animation-delay: 0.2s; } .typing-dot:nth-child(3) { animation-delay: 0.4s; } @keyframes pulse { 0%, 60%, 100% { transform: scale(1); opacity: 0.5; } 30% { transform: scale(1.3); opacity: 1; background: var(--accent); } } / Welcome / empty state / .welcome { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 40px; text-align: center; } .welcome-avatar { width: 72px; height: 72px; border-radius: 22px; background: linear-gradient(135deg, #6c63ff, #a78bfa); display: flex; align-items: center; justify-content: center; font-size: 36px; box-shadow: 0 0 40px var(--accent-glow); } .welcome h2 { font-size: 22px; font-weight: 700; } .welcome p { font-size: 14px; color: var(--text-muted); max-width: 400px; line-height: 1.7; } .quick-prompts { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 500px; } .quick-prompt { padding: 8px 16px; border-radius: 20px; background: var(--bg-card); border: 1px solid var(--border); font-size: 13px; color: var(--text-muted); cursor: pointer; transition: all 0.15s; } .quick-prompt:hover { background: var(--accent-dim); border-color: var(--accent); color: var(--text); } / Context bar / .context-bar { padding: 8px 20px; border-top: 1px solid var(--border); display: flex; gap: 8px; align-items: center; flex-shrink: 0; overflow-x: auto; } .context-pill { flex-shrink: 0; padding: 4px 10px; border-radius: 20px; background: var(--bg-card); border: 1px solid var(--border); font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; } .context-pill .dot { width: 6px; height: 6px; border-radius: 50%; } .context-pill.green .dot { background: var(--green); } .context-pill.accent .dot { background: var(--accent); } / Input bar / .input-bar { padding: 14px 16px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; } .input-row { display: flex; gap: 10px; align-items: flex-end; } .input-wrap { flex: 1; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; display: flex; align-items: flex-end; gap: 4px; padding: 4px 4px 4px 14px; transition: border-color 0.15s; } .input-wrap:focus-within { border-color: var(--accent); } .input-wrap textarea { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-size: 14px; font-family: inherit; resize: none; padding: 8px 0; min-height: 36px; max-height: 160px; line-height: 1.5; } .input-wrap textarea::placeholder { color: var(--text-dim); } .input-tools { display: flex; gap: 2px; padding-bottom: 4px; } .input-tool { width: 32px; height: 32px; border-radius: 8px; background: transparent; border: none; color: var(--text-dim); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.1s; } .input-tool:hover { background: var(--bg-card); color: var(--text); } .send-btn { width: 44px; height: 44px; border-radius: 12px; background: var(--accent); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.15s, transform 0.1s; flex-shrink: 0; } .send-btn:hover { opacity: 0.85; } .send-btn:active { transform: scale(0.95); } .send-btn:disabled { opacity: 0.35; cursor: not-allowed; } .send-btn svg { width: 18px; height: 18px; fill: #fff; } / Pinned bar / .pinned-bar { display: none; padding: 10px 20px; border-bottom: 1px solid rgba(108,99,255,0.2); background: var(--accent-dim); gap: 8px; align-items: center; flex-shrink: 0; } .pinned-bar.show { display: flex; } .pinned-label { font-size: 12px; color: var(--accent); font-weight: 600; flex-shrink: 0; } .pinned-preview { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; } / Search results panel / .search-panel { display: none; position: absolute; top: 60px; left: 0; right: 0; background: var(--bg-raised); border-bottom: 1px solid var(--border); max-height: 300px; overflow-y: auto; z-index: 100; } .search-panel.show { display: block; } .search-result { padding: 12px 20px; border-bottom: 1px solid var(--border); cursor: pointer; } .search-result:hover { background: var(--bg-card); } .search-result-text { font-size: 13px; color: var(--text-muted); } .search-result-meta { font-size: 11px; color: var(--text-dim); margin-top: 2px; } / Scrollbars / ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; } / Lumin build bridge / .build-toggle { font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-dim); border: 1px solid rgba(108,99,255,0.3); border-radius: 8px; padding: 6px 10px; cursor: pointer; font-family: inherit; } .build-toggle:hover { filter: brightness(1.1); } .build-panel { display: none; flex-direction: column; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--border); background: var(--bg-raised); font-size: 12px; color: var(--text-muted); } .build-panel.open { display: flex; } .build-hint { line-height: 1.5; } .build-hint code { background: var(--bg-card); padding: 1px 6px; border-radius: 4px; font-size: 11px; } .build-form { display: flex; flex-direction: column; gap: 8px; } .build-form textarea { width: 100%; min-height: 56px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; color: var(--text); font-family: inherit; font-size: 13px; resize: vertical; } .build-form-actions { display: flex; gap: 8px; flex-wrap: wrap; } .build-btn { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; } .build-btn:disabled { opacity: 0.4; cursor: not-allowed; } .build-btn.secondary { background: var(--bg-card); color: var(--text); border: 1px solid var(--border); } .build-ops-pre { margin-top: 10px; padding: 10px; font-size: 11px; line-height: 1.45; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; max-height: 180px; overflow: auto; white-space: pre-wrap; word-break: break-word; color: var(--text-dim); } .build-jobs { max-height: 140px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-surface); } .build-job-row { padding: 8px 10px; border-bottom: 1px solid var(--border); font-size: 11px; } .build-job-row:last-child { border-bottom: none; } .build-job-title { color: var(--text); font-weight: 500; } .build-status-strip { display: none; padding: 8px 16px; background: var(--accent-dim); border-top: 1px solid rgba(108,99,255,0.2); font-size: 12px; color: var(--text-muted); } .build-status-strip.show { display: block; } / Mobile / @media (max-width: 600px) { .sidebar { display: none; } } / ══ Voice mode ══════════════════════════════════════════════════════════ / .voice-bar { display: none; align-items: center; gap: 8px; padding: 6px 14px; background: var(--bg-raised); border-top: 1px solid var(--border); flex-shrink: 0; min-height: 36px; } .voice-bar.show { display: flex; } .voice-mode-pill { display: flex; border-radius: 20px; background: var(--bg-surface); border: 1px solid var(--border); overflow: hidden; flex-shrink: 0; } .vm-btn { padding: 4px 11px; font-size: 11px; cursor: pointer; background: none; border: none; color: var(--text-muted); transition: all 0.15s; font-family: inherit; } .vm-btn.active { background: var(--accent); color: #fff; } .vm-btn:hover:not(.active) { color: var(--text); background: var(--bg-overlay); } .voice-status-area { flex: 1; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); min-width: 0; } .v-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: var(--green); display: none; } .v-dot.show { display: block; animation: vpulse 1s ease-in-out infinite; } .v-dot.speaking { background: var(--accent); } @keyframes vpulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.5} } .v-stop-btn { display: none; padding: 3px 9px; font-size: 11px; border-radius: 12px; background: var(--bg-overlay); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; flex-shrink: 0; font-family: inherit; } .v-stop-btn:hover { border-color: var(--accent); color: var(--text); } .v-settings-btn { padding: 3px 7px; font-size: 13px; background: none; border: none; color: var(--text-dim); cursor: pointer; flex-shrink: 0; } .v-settings-btn:hover { color: var(--text-muted); } / Voice settings drawer / .voice-settings-panel { display: none; padding: 10px 14px 12px; background: var(--bg-raised); border-top: 1px solid var(--border); gap: 10px; flex-wrap: wrap; align-items: center; font-size: 12px; color: var(--text-muted); } .voice-settings-panel.show { display: flex; } .v-setting { display: flex; align-items: center; gap: 6px; } .v-setting label { white-space: nowrap; } .v-setting select, .v-setting input[type=range] { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text); padding: 2px 4px; font-size: 11px; font-family: inherit; max-width: 160px; } / Streaming cursor / .stream-cursor { display: inline-block; width: 2px; height: 14px; background: var(--accent); margin-left: 2px; animation: sblink 0.7s step-end infinite; vertical-align: middle; } @keyframes sblink { 0%,100%{opacity:1} 50%{opacity:0} } / Mic button active state / .input-tool.mic-active { color: var(--accent); animation: vpulse 1s ease-in-out infinite; } </style>
</head>
<body>
<!-- ══ Sidebar ══════════════════════════════════════════════════════════════ -->
<div class="sidebar"> <div class="sidebar-header"> <div class="lumin-brand"> <div class="lumin-avatar">✦</div> <div> <div class="lumin-name">Lumin</div> <div class="lumin-status"><span class="status-dot"></span>Always here</div> </div> </div> <button class="new-chat-btn" title="New chat" onclick="newThread()">+</button> </div> <div class="search-box"> <input type="text" id="sidebar-search" placeholder="Search conversations..." oninput="searchThreads(this.value)"> </div> <div class="mode-filter" id="mode-filter"> <div class="mode-chip active" data-mode="" onclick="filterMode('', this)">All</div> <div class="mode-chip" data-mode="general" onclick="filterMode('general', this)">General</div> <div class="mode-chip" data-mode="mirror" onclick="filterMode('mirror', this)">Mirror</div> <div class="mode-chip" data-mode="coach" onclick="filterMode('coach', this)">Coach</div> <div class="mode-chip" data-mode="finance" onclick="filterMode('finance', this)">Finance</div> <div class="mode-chip" data-mode="relationship" onclick="filterMode('relationship', this)">Relationships</div> <div class="mode-chip" data-mode="health" onclick="filterMode('health', this)">Health</div> <div class="mode-chip" data-mode="planning" onclick="filterMode('planning', this)">Planning</div> </div> <div class="thread-list" id="thread-list"> <!-- threads injected here --> </div>
</div>
<!-- ══ Chat area ════════════════════════════════════════════════════════════ -->
<div class="chat-area"> <div class="chat-header"> <div class="chat-title-group"> <div class="chat-title" id="chat-title">Lumin</div> <select class="chat-mode-select" id="mode-select" onchange="changeMode(this.value)">
        <option value="general">General</option>
        <option value="mirror">Mirror</option>
        <option value="coach">Coach</option>
        <option value="finance">Finance</option>
        <option value="relationship">Relationships</option>
        <option value="health">Health</option>
        <option value="planning">Planning</option>
      </select>
    </div>
    <div class="chat-header-actions">
      <button type="button" class="build-toggle" id="build-toggle-btn" title="Build: plan, draft, jobs" onclick="toggleBuildPanel()">Build</button>
      <button class="icon-btn" title="Search messages" onclick="toggleSearchPanel()">🔍</button>
      <button class="icon-btn" title="Show pinned" onclick="togglePinnedBar()">📌</button>
    </div>
  </div>
  <!-- Search panel -->
  <div class="search-panel" id="search-panel" style="position:relative">
    <div style="padding:12px 20px; border-bottom:1px solid var(--border)"> <input type="text" id="msg-search-input" placeholder="Search this conversation..." style="width:100%;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-family:inherit;font-size:13px" oninput="searchMessages(this.value)"> </div> <div id="search-results"></div> </div> <!-- Pinned messages bar --> <div class="pinned-bar" id="pinned-bar"> <span class="pinned-label">📌 Pinned</span> <span class="pinned-preview" id="pinned-preview">—</span> <button class="icon-btn" style="flex-shrink:0" onclick="hidePinnedBar()">✕</button> </div>

  <!-- Cross-Surface Discovery Specification (Deferred Implementation) -->
  <!--
    This section outlines planned features for cross-surface discovery,
    with implementation deferred.

    1. Jumping from Dashboard to Lumin with Context Hints:
       - Mechanism: When navigating from the LifeOS Dashboard (e.g., clicking an MIT, goal, or event), Lumin should receive context. This could be via URL parameters (e.g., `lifeos-chat.html?contextType=mit&id=123`) or a dedicated API endpoint to "prime" Lumin's context.
       - Lumin Behavior: Upon receiving context, Lumin should:
         - Display a temporary "context pill" in the context bar (similar to MITs/Score) indicating the active context (e.g., "Viewing MIT: 'Finish project X'").
         - Potentially pre-fill the chat input with a relevant prompt (e.g., "Tell me more about MIT 'Finish project X'") or offer quick actions related to the context.
         - Adjust its conversational model to prioritize information relevant to the provided context.

    2. Command Palette Feasibility:
       - Trigger: A global keyboard shortcut (e.g., `Cmd+K` or `Ctrl+K`) should open a command palette overlay.
       - Functionality: The palette should allow users to:
         - Search across all LifeOS entities (MITs, goals, events, memories, threads).
         - Quickly initiate actions (e.g., "New general chat", "New mirror session", "Add MIT", "Log event").
         - Navigate directly to specific entities or views within Lumin or other LifeOS surfaces.
       - UI: An overlay modal, similar to common command palettes (e.g., VS Code, Slack), with a search input and dynamic list of results/actions.

    3. Searchable Entities List (MITs/Goals/Events):
       - Integration: Extend the existing search functionality (currently message-focused) or introduce a dedicated "Entity Search" panel.
       - Scope: Allow searching for:
         - MITs: By title, description, status.
         - Goals: By name, progress, associated projects.
         - Events: By title, date, participants.
         - Other Entities: Potentially memories, journal entries, people.
       - Display: Results should clearly indicate the entity type and provide a quick link to view/interact with that entity (e.g., open a specific MIT detail view, or jump to a chat thread discussing a goal).
  -->

  <!-- Messages --> <div class="messages" id="messages"> <div class="welcome" id="welcome"> <div class="welcome-avatar">✦</div> <h2>Hey, I'm Lumin</h2> <p>Your personal AI — always here. Help me prepare.')">Help me prepare for a hard conversation</div> <div class="quick-prompt" onclick="sendQuick('How is my financial picture looking?')">Financial picture</div> </div> </div> </div> <!-- Voice mode bar — shown when mic button is toggled --> <div class="voice-bar" id="voice-bar"> <div class="voice-mode-pill"> <button class="vm-btn active" id="vm-text" onclick="VM.setMode('text')">Text</button> <button class="vm-btn" id="vm-voice-in" onclick="VM.setMode('voice-in')">🎙 Listen</button> <button class="vm-btn" id="vm-voice-2way" onclick="VM.setMode('voice-2way')">🔄 2-Way</button> </div> <div class="voice-status-area"> <span class="v-dot" id="v-dot"></span> <span id="v-status-text">Ready</span> </div> <button class="v-stop-btn" id="v-stop-btn" onclick="VM.stopAll()">⏹ Stop</button> <button class="v-settings-btn" title="Voice settings" onclick="VM.toggleSettings()">⚙</button> </div> <!-- Voice settings drawer --> <div class="voice-settings-panel" id="voice-settings-panel"> <div class="v-setting"> <label>Voice:</label> <select id="v-voice-select" onchange="VM.setVoice(this.value)">
        <option value="">Default</option>
      </select>
    </div>
    <div class="v-setting">
      <label>Speed:</label>
      <input type="range" id="v-rate" min="0.5" max="2" step="0.1" value="1.0"
             oninput="VM.setRate(this.value)" title="Speech rate">
      <span id="v-rate-label">1.0×</span>
    </div>
    <div class="v-setting">
      <label>Silence timeout:</label>
      <input type="range" id="v-silence" min="500" max="3000" step="250" value="1500"
             oninput="VM.setSilence(this.value)" title="ms of silence before auto-send">
      <span id="v-silence-label">1.5s</span>
    </div>
  </div>
  <div class="build-status-strip" id="build-status-strip" aria-live="polite"></div>
  <div class="build-panel" id="build-panel">
    <div class="build-hint">
      In chat, start a line with <code>/plan</code> or <code>/draft</code> (or <code>lumin plan:</code> / <code>lumin draft:</code>) to run the governed build bridge. Results are stored as jobs. <code>Cmd+L</code> / <code>Ctrl+L</code> focuses this chat.
    </div>
    <div class="build-form">
      <textarea id="build-goal-input" placeholder="Describe the change (goal)…"></textarea>
      <div class="build-form-actions">
        <button type="button" class="build-btn" id="build-plan-btn" onclick="runBuildFromPanel('plan')">Run plan</button>
        <button type="button" class="build-btn secondary" id="build-draft-btn" onclick="runBuildFromPanel('draft')">Run draft</button>
        <button type="button" class="build-btn secondary" onclick="loadBuildJobs()">Refresh jobs</button>
        <button type="button" class="build-btn secondary" onclick="loadBuildOps()">Build ops</button>
        <button type="button" class="build-btn secondary" onclick="fillSuggestedP1Goal()" title="Insert a P1 LifeOS backlog goal for council planning">P1 goal</button>
      </div>
    </div>
    <pre class="build-ops-pre" id="build-ops-pre" style="display:none" aria-live="polite"></pre>
    <div class="build-jobs" id="build-jobs-list"><div class="build-job-row" style="border:none">Open panel to load recent jobs…</div></div>
  </div>
  <!-- Context bar -->
  <div class="context-bar" id="context-bar" style="display:none">
    <span style="font-size:11px;color:var(--text-dim);flex-shrink:0">Context:</span> <div class="context-pill green"><span class="dot"></span><span id="ctx-mits">— MITs</span></div> <div class="context-pill accent"><span class="dot"></span><span id="ctx-score">No score yet</span></div> <div class="context-pill"><span id="ctx-commitments">— commitments</span></div> <div class="context-pill"><span id="ctx-joy">No joy log</span></div> </div> <!-- Input --> <div class="input-bar"> <div class="input-row"> <div class="input-wrap"> <textarea id="chat-input" placeholder='Hey Lumin...' rows="1" onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea> <div class="input-tools"> <button class="input-tool" id="mic-toggle-btn" title="Toggle voice mode" onclick="VM.toggleBar()">🎙</button> <button class="input-tool" id="interrupt-toggle-btn" title="Toggle conflict interrupt" onclick="toggleInterruptEnabled()">🛡️</button> <button class="input-tool" id="interrupt-sensitivity-btn" title="Cycle interrupt sensitivity" onclick="cycleInterruptSensitivity()">◔</button> </div> </div> <button class="send-btn" id="send-btn" onclick="sendMessage()" title="Send (Enter)"> <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg> </button> </div> </div>
</div>
<script>
const { TOKEN, USER, headers: lifeoHeaders, requireAuth } = getLifeOSContext();
requireAuth('/overlay/lifeos-login.html');
const BASE = '/api/v1/lifeos/chat';
const H = lifeoHeaders();
let currentThreadId = null;
let allThreads = [];
let activeFilter = '';
let searchOpen = false;
let pinnedVisible = false;
let isTyping = false;
let interruptTimer = null;
let interruptToastTimer = null;
let interruptSettings = { enabled: true, sensitivity: 'medium' };
let buildPanelOpen = false;
/ Insert into goal box — P1 from Amendment 21 backlog: Commitment → execution desk. */
const SUGGESTED_P1_LUMIN_GOAL =
  'Priority LifeOS: specify the first vertical slice of the Commitment → execution desk (outbound follow-ups with review-before-send, cancel/self-handle, MIT fallback). Name tables, routes under /api/v1/lifeos/delegate/*, overlay touchpoints, and verification commands. Label shipped vs stub.';
// ── Boot ─────────────────────────────────────────────────────────────────────
asyncFn boot() { document.addEventListener('keydown', onGlobalChatShortcut); await loadThreads(); await loadContext(); await loadInterruptSettings(); // Open default thread (or create one)
  const def = allThreads.find(t => t.mode === 'general') || allThreads[0]; if (def) { await openThread(def.id); } else { await newThread(); }
}
function onGlobalChatShortcut(e) {
  const isMac = navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    if (input) {
      input.focus();
      input.scrollIntoView({ block: 'nearest' });
    }
  }
  // TODO: Future: Implement Cmd+K / Ctrl+K for command palette
  // if (mod && e.key.toLowerCase() === 'k') {
  //   e.preventDefault();
  //   // openCommandPalette();
  // }
}
// ── Threads ───────────────────────────────────────────────────────────────────
asyncFn loadThreads() { try { const res = await fetch(`${BASE}/threads?user=${encodeURIComponent(USER || 'adam')}`, { headers: H }); const data = await res.json(); if (!data.ok) return; allThreads = data.threads; renderThreadList(allThreads); } catch {}
}
function renderThreadList(threads) { const list = document.getElementById('thread-list'); const filtered = activeFilter ? threads.filter(t => t.mode === activeFilter) : threads; if (!filtered.length) { list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:13px">No conversations yet</div>`; return; } list.innerHTML = filtered.map(t => `
    <div class="thread-item ${t.id === currentThreadId ? 'active' : ''}"
         onclick="openThread(${t.id})">
      ${t.pinned ? '<span class="thread-pin">📌 </span>' : ''}
      <div class="thread-title">${escHtml(t.title || 'New conversation')}</div>
      <div class="thread-meta">
        <span class="thread-mode-badge">${t.mode}</span>
        ${t.last_message_at ? fmtTime(t.last_message_at) : 'Just created'}
        ${t.message_count ? `· ${t.message_count} msgs` : ''}
      </div>
    </div>` ).join('');
}
asyncFn newThread(mode = 'general') { try { const res = await fetch(`${BASE}/threads`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ user: USER || 'adam', mode }), }); const data = await res.json(); if (!data.ok) return; allThreads.unshift(data.thread); renderThreadList(allThreads); await openThread(data.thread.id, true); } catch {}
}
asyncFn openThread(threadId, fresh = false) { currentThreadId = threadId; renderThreadList(allThreads); // highlight active const thread = allThreads.find(t => t.id === threadId); if (thread) { document.getElementById('chat-title').textContent = thread.title || 'New conversation'; const sel = document.getElementById('mode-select'); sel.value = thread.mode || 'general'; } if (fresh) { clearMessages(); return; } try { const res = await fetch(`${BASE}/threads/${threadId}/messages?user=${encodeURIComponent(USER || 'adam')}&limit=60`, { headers: H }); const data = await res.json(); if (!data.ok) return; renderMessages(data.messages); } catch {}
}
// ── Messages ──────────────────────────────────────────────────────────────────
function renderMessages(messages) { const container = document.getElementById('messages'); document.getElementById('welcome').style.display = 'none'; container.innerHTML = ''; for (const msg of messages) { appendMessageEl(msg); } scrollToBottom();
}
function appendMessageEl(msg) { const container = document.getElementById('messages'); document.getElementById('welcome').style.display = 'none'; const group = document.createElement('div'); group.className = `msg-group ${msg.role}`; group.dataset.id = msg.id; const senderLabel = msg.role === 'user' ? (USER || 'You') : 'Lumin'; const isAssistant = msg.role === 'assistant'; group.innerHTML = `
    <div class="msg-sender">${senderLabel} · ${fmtTime(msg.created_at)}</div>
    <div class="msg-bubble ${msg.pinned ? 'pinned' : ''}">${renderContent(msg.content)}</div>
    <div class="msg-actions">
      ${isAssistant ? ` <button class="msg-action" onclick="copyMsg(${msg.id}, this)" title="Copy">Copy</button> <button class="msg-action ${msg.reaction === 'thumbs_up' ? 'active' : ''}" onclick="react(${msg.id}, 'thumbs_up', this)">👍</button> <button class="msg-action ${msg.reaction === 'thumbs_down' ? 'active' : ''}" onclick="react(${msg.id}, 'thumbs_down', this)">👎</button> ` : ''}
      <button class="msg-action ${msg.pinned ? 'active' : ''}" onclick="togglePin(${msg.id}, this)">${msg.pinned ? 'Unpin' : 'Pin'}</button>
    </div>`; container.appendChild(group);
}
function renderContent(text) { // Basic markdown: code blocks, bold, line breaks return escHtml(text) .replace(/([\s\S]*?)/g, '<pre>$1</pre>') .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.3);padding:1px 5px;border-radius:4px;font-family:monospace">$1</code>')
    .replace(/\\(.?)\\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
function clearMessages() {
  const container = document.getElementById('messages');
  container.innerHTML = '<div class="welcome" id="welcome" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:40px;text-align:center"></div>';
  document.getElementById('welcome').innerHTML = ` <div class="welcome-avatar">✦</div> <h2>New conversation</h2> <p>What's on your mind?</p>`;
}
function showTyping() {
  const container = document.getElementById('messages');
  const el = document.createElement('div');
  el.className = 'msg-group assistant';
  el.id = 'typing-el';
  el.innerHTML = `<div class="msg-sender">Lumin</div><div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  container.appendChild(el);
  scrollToBottom();
}
function removeTyping() {
  document.getElementById('typing-el')?.remove();
}
/
- /plan, /draft, /queue (shortcuts for governed build bridge; does not use normal Lumin chat).
 */
function parseLuminBuildIntent(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const low = raw.toLowerCase();
  if (low.startsWith('/plan ')) {
    return { type: 'plan', goal: raw.slice(6).trim() };
  }
  if (low.startsWith('/draft ')) {
    return { type: 'draft', goal: raw.slice(7).trim() };
  }
  if (low === '/queue' || low === '/queue-adam') {
    return { type: 'queue', title: 'Adam follow-up' };
  }
  if (low.startsWith('/queue ') || low.startsWith('/queue-adam ')) {
    const rest = low.startsWith('/queue-adam ') ? raw.slice(12).trim() : raw.slice(7).trim();
    return { type: 'queue', title: rest || 'Adam follow-up' };
  }
  if (low.startsWith('lumin plan:')) {
    return { type: 'plan', goal: raw.slice('lumin plan:'.length).trim() };
  }
  if (low.startsWith('lumin draft:')) {
    return { type: 'draft', goal: raw.slice('lumin draft:'.length).trim() };
  }
  if (low.startsWith('lumin queue:') || low.startsWith('lumin queue-adam:')) {
    const cut = low.startsWith('lumin queue-adam:') ? 'lumin queue-adam:'.length : 'lumin queue:'.length;
    return { type: 'queue', title: raw.slice(cut).trim() || 'Adam follow-up' };
  }
  return null;
}
function setBuildStatus(msg) {
  const el = document.getElementById('build-status-strip');
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.classList.add('show');
  } else {
    el.textContent = '';
    el.classList.remove('show');
  }
}
asyncFn executeBuildIntent(verb, userText) {
  const u = USER || 'adam';
  isTyping = true;
  document.getElementById('send-btn').disabled = true;
  if (verb === 'plan' || verb === 'draft') {
    const goal = String(userText || '').trim();
    if (!goal) {
      appendMessageEl({ id: 'e', role: 'assistant', content: 'Add a goal after `/plan` or `/draft`.', created_at: new Date().toISOString() });
      isTyping = false;
      document.getElementById('send-btn').disabled = false;
      return;
    }
    if (!currentThreadId) {
      appendMessageEl({ id: 'nt', role: 'assistant', content: 'Open a thread first, then run build.', created_at: new Date().toISOString() });
      isTyping = false;
      document.getElementById('send-btn').disabled = false;
      return;
    }
    const line = (verb === 'plan' ? '/plan ' : '/draft ') + goal;
    appendMessageEl({ id: 'buser', role: 'user', content: line, created_at: new Date().toISOString() });
    showTyping();
    setBuildStatus(verb === 'plan' ? 'Plan running (council)…' : 'Draft running (council)…');
    try {
      const url  = verb === 'plan' ? `${BASE}/build/plan` : `${BASE}/build/draft`;
      const res  = await fetch(url, {
        method: 'POST',
        headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: u, goal, thread_id: currentThreadId }),
      });
      const data = await res.json();
      removeTyping();
      if (!res.ok || !data.ok) throw new Error(data.error || res.statusText);
      const text = (verb === 'plan' ? (data.plan || data.job?.result_text) : (data.draft || data.job?.result_text)) || 'Done.';
      const meta = data.job ? `\n\n— Job #${data.job.id} · ${data.job.status} · ${data.job.kind}` : '';
      appendMessageEl({ id: 'bres', role: 'assistant', content: String(text) + meta, created_at: new Date().toISOString() });
    } catch (e) {
      removeTyping();
      appendMessageEl({ id: 'berr', role: 'assistant', content: 'Build failed: ' + e.message, created_at: new Date().toISOString() });
    } finally {
      setBuildStatus('');
      isTyping = false;
      document.getElementById('send-btn').disabled = false;
      document.getElementById('chat-input')?.focus();
      loadBuildJobs();
    }
    return;
  }
  if (verb === 'queue') {
    if (!currentThreadId) {
      appendMessageEl({ id: 'qnt', role: 'assistant', content: 'Open a thread first, then /queue.', created_at: new Date().toISOString() });
      isTyping = false;
      document.getElementById('send-btn').disabled = false;
      return;
    }
    const title = String(userText || '').trim() || 'Adam follow-up';
    appendMessageEl({ id: 'tq', role: 'user', content: '/queue ' + title, created_at: new Date().toISOString() });
    showTyping();
    try {
      const res  = await fetch(`${BASE}/build/pending-adam`, {
        method: 'POST',
        headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: u, title, thread_id: currentThreadId, description: 'Queued from Lumin chat' }),
      });
      const data = await res.json();
      removeTyping();
      if (!res.ok || !data.ok) throw new Error(data.error || res.statusText);
      appendMessageEl({ id: 'qok', role: 'assistant', content: 'Queued for Adam/operator: pending_adam #' + (data.pending_adam?.id || '?') + ' — ' + title, created_at: new Date().toISOString() });
    } catch (e) {
      removeTyping();
      appendMessageEl({ id: 'qer', role: 'assistant', content: 'Queue failed: ' + e.message, created_at: new Date().toISOString() });
    } finally {
      isTyping = false;
      document.getElementById('send-btn').disabled = false;
      document.getElementById('chat-input')?.focus();
    }
  }
}
function toggleBuildPanel() {
  buildPanelOpen = !buildPanelOpen;
  const p = document.getElementById('build-panel');
  const b = document.getElementById('build-toggle-btn');
  if (p) p.classList.toggle('open', buildPanelOpen);
  if (b) b.setAttribute('aria-expanded', buildPanelOpen ? 'true' : 'false');
  if (buildPanelOpen) { loadBuildJobs(); loadBuildOps(); }
}
function fillSuggestedP1Goal() {
  const ta = document.getElementById('build-goal-input');
  if (ta) {
    ta.value = SUGGESTED_P1_LUMIN_GOAL;
    ta.focus();
  }
}
asyncFn loadBuildJobs() {
  const list = document.getElementById('build-jobs-list');
  if (!list) return;
  list.innerHTML = '<div class="build-job-row">Loading…</div>';
  try {
    const res  = await fetch(`${BASE}/build/jobs?user=${encodeURIComponent(USER || 'adam')}&limit=12`, { headers: H });
    const data = await res.json();
    if (!data.ok || !data.jobs?.length) {
      list.innerHTML = '<div class="build-job-row">No build jobs yet. Use <code>/plan</code> or the Run plan button.</div>';
      return;
    }
    list.innerHTML = data.jobs.map(j => ` <div class="build-job-row"> <div class="build-job-title">#${j.id} · ${escHtml(j.kind || '')} — ${escHtml(j.status || '')}</div> <div>${escHtml((j.title || j.step_detail || '—').slice(0, 120))} · ${fmtTime(j.created_at || j.updated_at)}</div> </div>`).join('');
  } catch (e) {
    list.innerHTML = '<div class="build-job-row">Could not load jobs (council/DB off?). ' + escHtml(e.message) + '</div>';
  }
}
asyncFn loadBuildOps() {
  const pre = document.getElementById('build-ops-pre');
  if (!pre) return;
  pre.style.display = 'block';
  pre.textContent = 'Loading build ops (last 24h)…';
  try {
    const res  = await fetch(`${BASE}/build/ops?user=${encodeURIComponent(USER || 'adam')}&hours=24`, { headers: H });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      pre.textContent = 'Build ops failed: ' + (data.error || res.statusText);
      return;
    }
    pre.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    pre.textContent = 'Build ops error: ' + e.message;
  }
}
asyncFn runBuildFromPanel(kind) {
  const ta = document.getElementById('build-goal-input');
  const goal = (ta?.value || '').trim();
  if (!goal) { alert('Enter a goal first.'); return; }
  const planBtn  = document.getElementById('build-plan-btn');
  const draftBtn = document.getElementById('build-draft-btn');
  if (planBtn) planBtn.disabled = true;
  if (draftBtn) draftBtn.disabled = true;
  try {
    if (kind === 'plan') await executeBuildIntent('plan', goal);
    else await executeBuildIntent('draft', goal);
    if (ta) ta.value = '';
  } finally {
    if (planBtn) planBtn.disabled = false;
    if (draftBtn) draftBtn.disabled = false;
    loadBuildJobs();
  }
}
// ── Send ──────────────────────────────────────────────────────────────────────
// ── Streaming send ────────────────────────────────────────────────────────────
// Creates a message bubble that fills in token by token from the SSE stream.
function createStreamBubble() {
  const group = document.createElement('div');
  group.className = 'msg-group assistant';
  group.dataset.id = 'stream-tmp';
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  const cursor = document.createElement('span');
  cursor.className = 'stream-cursor';
  bubble.appendChild(cursor);
  group.appendChild(bubble);
  document.getElementById('messages').appendChild(group);
  scrollToBottom();
  return {