The specification is incomplete due to the missing `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file, which prevents making API assumptions for Victory Vault endpoints.
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0a0a0f" id="theme-color-meta">
<title>Dashboard · LifeOS</title>
<!-- Theme must load before anything renders to avoid flash -->
<script src="/overlay/lifeos-theme.js"></script>
<link rel="stylesheet" href="../shared/lifeos-dashboard-tokens.css">
<link rel="stylesheet" href="../shared/lifeos-dashboard-ai-rail.css">
<script src="https://cdn.tailwindcss.com"></script>
<script src="/overlay/lifeos-bootstrap.js"></script>
<style>
:root {
--bg-base: var(--dash-bg, #0a0a0f);
--bg-raised: var(--dash-surface-raised, #0d0d15);
--bg-surface: var(--dash-surface, #111118);
--bg-surface2: var(--dash-surface-raised, #17171f);
--bg-overlay: var(--dash-surface-overlay, #1e1e28);
--border: var(--dash-border, rgba(255,255,255,0.07));
--border-focus: var(--dash-border-focus, rgba(255,255,255,0.18));
--text-primary: var(--dash-text, #e8e8f0);
--text-secondary: var(--dash-text-secondary, #9999bb);
--text-muted: var(--dash-muted, #555566);
--c-today: var(--dash-accent, #5b6af5);
--c-health: var(--dash-accent-health, #10b981);
--c-growth: var(--dash-accent-growth, #34d399);
--c-finance: var(--dash-accent-finance, #22d3ee);
--c-decisions: var(--dash-accent-warning, #f59e0b);
--c-mirror: var(--dash-accent-mirror, #7c3aed);
--c-conflict: var(--dash-accent-conflict, #e05555);
--radius-sm: var(--dash-radius-sm, 6px);
--radius-md: var(--dash-radius-md, 10px);
--radius-lg: var(--dash-radius-lg, 14px);
--radius-xl: var(--dash-radius-xl, 20px);
}
*, ::before, ::after {
box-sizing: border-box;
margin: 0;
padding: 0;
}
html {
height: 100%;
}
body {
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
background: var(--bg-base);
color: var(--text-primary);
min-height: 100%;
-webkit-font-smoothing: antialiased;
padding-bottom: calc(24px + env(safe-area-inset-bottom));
}
.page {
max-width: 860px;
margin: 0 auto;
padding: 24px 16px;
}
/ ── Cards ── /
.card {
background: var(--bg-surface);
border: 1px solid var(--border);
border-radius: var(--radius-lg);
padding: 20px;
transition: border-color 0.2s, box-shadow 0.2s;
}
.card:hover {
border-color: var(--border-focus);
box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}
.card-label {
font-size: 10px;
font-weight: 700;
letter-spacing: 0.12em;
text-transform: uppercase;
color: var(--text-muted);
margin-bottom: 14px;
}
.accent-border-today {
border-top: 2px solid var(--c-today);
}
.accent-border-health {
border-top: 2px solid var(--c-health);
}
.accent-border-finance {
border-top: 2px solid var(--c-finance);
}
.accent-border-mirror {
border-top: 2px solid var(--c-mirror);
}
.accent-border-growth {
border-top: 2px solid var(--c-growth);
}
/ ── Header ── /
.hdr-row {
display: flex;
align-items: flex-start;
justify-content: space-between;
gap: 12px;
}
.hdr-controls {
display: flex;
gap: 8px;
padding-top: 4px;
flex-shrink: 0;
}
.hdr-btn {
background: var(--bg-surface2);
border: 1px solid var(--border);
border-radius: var(--radius-md);
color: var(--text-secondary);
font-size: 17px;
width: 36px;
height: 36px;
display: flex;
align-items: center;
justify-content: center;
cursor: pointer;
transition: border-color 0.2s, color 0.2s, background 0.2s;
flex-shrink: 0;
}
.hdr-btn:hover {
border-color: var(--border-focus);
color: var(--text-primary);
}
.hdr-btn.active {
color: var(--c-health);
border-color: var(--c-health);
}
.hdr-btn.ambient-active {
color: var(--c-health);
border-color: var(--c-health);
animation: pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite;
}
.greeting {
font-size: clamp(26px, 5vw, 38px);
font-weight: 800;
background: linear-gradient(135deg, var(--c-today) 0%, var(--c-mirror) 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
line-height: 1.1;
}
.greeting-sub {
font-size: 14px;
color: var(--text-muted);
margin-top: 6px;
}
.pulse-dot {
display: inline-block;
width: 8px;
height: 8px;
background: var(--c-health);
border-radius: 50%;
margin-left: 8px;
vertical-align: middle;
animation: pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite;
}
/ ── Animations ── /
@keyframes pulse-ring {
0%, 100% {
opacity: 1;
transform: scale(1);
}
50% {
opacity: 0.5;
transform: scale(1.3);
}
}
@keyframes fadeUp {
from {
opacity: 0;
transform: translateY(16px);
}
to {
opacity: 1;
transform: translateY(0);
}
}
@keyframes shimmer {
0% {
background-position: -400px 0;
}
100% {
background-position: 400px 0;
}
}
@keyframes bounce-dot {
0%, 80%, 100% {
transform: scale(0.6);
opacity: 0.4;
}
40% {
transform: scale(1);
opacity: 1;
}
}
@keyframes ring-fill {
from {
stroke-dashoffset: 220;
}
}
@keyframes bar-grow {
from {
width: 0;
}
}
@keyframes check-draw {
from {
stroke-dashoffset: 20;
}
to {
stroke-dashoffset: 0;
}
}
@keyframes mic-pulse {
0%, 100% {
box-shadow: 0 0 0 0 rgba(224,85,85,0.4);
}
50% {
box-shadow: 0 0 0 8px rgba(224,85,85,0);
}
}
.fade-up {
animation: fadeUp 0.4s ease both;
}
.delay-1 {
animation-delay: 0.05s;
}
.delay-2 {
animation-delay: 0.10s;
}
.delay-3 {
animation-delay: 0.15s;
}
.delay-4 {
animation-delay: 0.20s;
}
.delay-5 {
animation-delay: 0.25s;
}
.delay-6 {
animation-delay: 0.30s;
}
.delay-7 {
animation-delay: 0.35s;
}
/ ── Skeleton ── /
.skeleton {
background: linear-gradient(90deg, var(--bg-surface2) 25%, var(--bg-overlay) 50%, var(--bg-surface2) 75%);
background-size: 400px 100%;
animation: shimmer 1.4s infinite;
border-radius: var(--radius-sm);
}
.skel-line {
height: 14px;
margin-bottom: 10px;
}
.skel-line:last-child {
width: 60%;
}
/ ── MIT ── /
.mit-item {
display: flex;
align-items: flex-start;
gap: 12px;
padding: 10px 0;
border-bottom: 1px solid var(--border);
cursor: pointer;
user-select: none;
-webkit-user-select: none;
}
.mit-item:last-of-type {
border-bottom: none;
}
.mit-check {
flex-shrink: 0;
width: 22px;
height: 22px;
border: 2px solid var(--border-focus);
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
transition: background 0.2s, border-color 0.2s;
margin-top: 1px;
}
.mit-check.done {
background: var(--c-today);
border-color: var(--c-today);
}
.mit-check svg {
display: none;
}
.mit-check.done svg {
display: block;
}
.mit-check.done svg polyline {
stroke-dasharray: 20;
stroke-dashoffset: 0;
animation: check-draw 0.25s ease forwards;
}
.mit-text {
flex: 1;
font-size: 15px;
line-height: 1.4;
color: var(--text-primary);
transition: color 0.2s;
}
.mit-text.done {
color: var(--text-muted);
text-decoration: line-through;
}
/ ── Quick add ── /
.quick-add {
display: flex;
gap: 8px;
margin-top: 14px;
padding-top: 14px;
border-top: 1px solid var(--border);
}
.quick-add input {
flex: 1;
background: var(--bg-surface2);
border: 1px solid var(--border);
border-radius: var(--radius-md);
color: var(--text-primary);
font-size: 14px;
padding: 8px 12px;
outline: none;
transition: border-color 0.2s;
}
.quick-add input:focus {
border-color: var(--c-today);
}
.quick-add input::placeholder {
color: var(--text-muted);
}
.btn-add {
background: var(--c-today);
color: #fff;
border: none;
border-radius: var(--radius-md);
font-size: 14px;
font-weight: 600;
padding: 8px 16px;
cursor: pointer;
white-space: nowrap;
transition: opacity 0.15s;
}
.btn-add:hover {
opacity: 0.85;
}
/ ── Calendar ── /
.event-row {
display: flex;
align-items: center;
gap: 10px;
padding: 9px 0;
border-bottom: 1px solid var(--border);
}
.event-row:last-child {
border-bottom: none;
}
.event-time {
font-size: 12px;
font-weight: 600;
background: rgba(91,106,245,0.15);
color: var(--c-today);
border-radius: 6px;
padding: 3px 8px;
white-space: nowrap;
letter-spacing: 0.02em;
flex-shrink: 0;
}
.event-title {
font-size: 14px;
color: var(--text-primary);
}
/ ── Goals ── /
.goal-row {
margin-bottom: 16px;
}
.goal-row:last-child {
margin-bottom: 0;
}
.goal-header {
display: flex;
justify-content: space-between;
align-items: baseline;
margin-bottom: 6px;
}
.goal-name {
font-size: 14px;
color: var(--text-primary);
}
.goal-pct {
font-size: 13px;
font-weight: 700;
color: var(--c-finance);
}
.goal-track {
height: 6px;
background: var(--bg-surface2);
border-radius: 3px;
overflow: hidden;
}
.goal-fill {
height: 100%;
background: linear-gradient(90deg, var(--c-today) 0%, var(--c-finance) 100%);
border-radius: 3px;
animation: bar-grow 0.8s cubic-bezier(0.4,0,0.2,1) both;
animation-delay: 0.3s;
}
.goal-sub {
font-size: 11px;
color: var(--text-muted);
margin-top: 4px;
}
/ ── Scores ── /
.scores-grid {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 12px;
}
.score-tile {
background: var(--bg-surface2);
border: 1px solid var(--border);
border-radius: var(--radius-md);
padding: 16px;
display: flex;
flex-direction: column;
align-items: center;
cursor: default;
transition: border-color 0.2s, transform 0.15s;
position: relative;
}
.score-tile:hover {
border-color: var(--border-focus);
transform: translateY(-1px);
}
.score-ring {
position: relative;
width: 72px;
height: 72px;
margin-bottom: 8px;
}
.score-ring svg {
transform: rotate(-90deg);
overflow: visible;
}
.score-ring circle.track {
stroke: var(--bg-overlay);
}
.score-ring circle.fill {
stroke-linecap: round;
stroke-dasharray: 207;
animation: ring-fill 1s cubic-bezier(0.4,0,0.2,1) forwards;
animation-delay: 0.4s;
}
.score-num {
position: absolute;
inset: 0;
display: flex;
align-items: center;
justify-content: center;
font-size: 20px;
font-weight: 800;
}
.score-label {
font-size: 11px;
font-weight: 700;
letter-spacing: 0.08em;
text-transform: uppercase;
color: var(--text-muted);
}
.score-tile-tip {
display: none;
position: absolute;
bottom: calc(100% + 8px);
left: 50%;
transform: translateX(-50%);
background: var(--bg-overlay);
border: 1px solid var(--border-focus);
border-radius: var(--radius-md);
padding: 8px 12px;
font-size: 12px;
color: var(--text-secondary);
white-space: nowrap;
z-index: 100;
pointer-events: none;
box-shadow: 0 4px 16px rgba(0,0,0,0.5);
}
.score-tile.tip-open .score-tile-tip {
display: block;
}
/ ── Chat ── /
.chat-messages {
height: 240px;
overflow-y: auto;
margin-bottom: 12px;
display: flex;
flex-direction: column;
gap: 8px;
scrollbar-width: thin;
scrollbar-color: var(--bg-overlay) transparent;
}
.chat-messages::-webkit-scrollbar {
width: 4px;
}
.chat-messages::-webkit-scrollbar-thumb {
background: var(--bg-overlay);
border-radius: 2px;
}
.msg {
max-width: 80%;
padding: 10px 14px;
border-radius: var(--radius-lg);
font-size: 14px;
line-height: 1.5;
animation: fadeUp 0.2s ease;
}
.msg.user {
align-self: flex-end;
background: var(--c-today);
color: #fff;
border-bottom-right-radius: var(--radius-sm);
}
.msg.assistant {
align-self: flex-start;
background: var(--bg-surface2);
color: var(--text-primary);
border-bottom-left-radius: var(--radius-sm);
border: 1px solid var(--border);
}
.msg.ambient {
align-self: flex-start;
background: transparent;
color: var(--text-muted);
font-style: italic;
font-size: 13px;
border: 1px dashed var(--border);
border-bottom-left-radius: var(--radius-sm);
}
.typing {
display: none;
align-self: flex-start;
background: var(--bg-surface2);
border: 1px solid var(--border);
border-radius: var(--radius-lg);
border-bottom-left-radius: var(--radius-sm);
padding: 12px 16px;
gap: 5px;
align-items: center;
}
.typing.show {
display: flex;
}
.typing-dot {
width: 7px;
height: 7px;
background: var(--text-muted);
border-radius: 50%;
}
.typing-dot:nth-child(1) {
animation: bounce-dot 1.2s 0.0s infinite;
}
.typing-dot:nth-child(2) {
animation: bounce-dot 1.2s 0.2s infinite;
}
.typing-dot:nth-child(3) {
animation: bounce-dot 1.2s 0.4s infinite;
}
/ ── Chat input row ── /
.chat-row {
display: flex;
gap: 8px;
}
.chat-row input {
flex: 1;
background: var(--bg-surface2);
border: 1px solid var(--border);
border-radius: var(--radius-md);
color: var(--text-primary);
font-size: 14px;
padding: 10px 14px;
outline: none;
transition: border-color 0.2s;
}
.chat-row input:focus {
border-color: var(--c-today);
}
.chat-row input::placeholder {
color: var(--text-muted);
}
.btn-mic {
background: var(--bg-surface2);
border: 1px solid var(--border);
border-radius: var(--radius-md);
color: var(--text-secondary);
font-size: 18px;
width: 44px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
flex-shrink: 0;
transition: border-color 0.2s, color 0.2s;
}
.btn-mic:hover {
border-color: var(--border-focus);
}
.btn-mic.listening {
color: var(--c-conflict);
border-color: var(--c-conflict);
animation: mic-pulse 1s ease infinite;
}
.btn-send {
background: var(--c-today);
color: #fff;
border: none;
border-radius: var(--radius-md);
font-size: 20px;
width: 44px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
flex-shrink: 0;
transition: opacity 0.15s;
}
.btn-send:hover {
opacity: 0.85;
}
/ ── Voice footer ── /
.voice-footer {
display: flex;
align-items: center;
gap: 10px;
margin-top: 10px;
padding-top: 10px;
border-top: 1px solid var(--border);
}
.voice-footer label {
display: flex;
align-items: center;
gap: 6px;
font-size: 12px;
color: var(--text-muted);
cursor: pointer;
user-select: none;
-webkit-user-select: none;
}
.voice-footer label input[type=checkbox] {
accent-color: var(--c-today);
}
#voice-status {
flex: 1;
font-size: 11px;
color: var(--text-muted);
text-align: right;
font-style: italic;
}
.ptt-hint {
font-size: 11px;
color: var(--text-muted);
opacity: 0.6;
}
/ ── Empty ── /
.empty {
text-align: center;
padding: 20px 0;
color: var(--text-muted);
font-size: 14px;
}
.empty span {
display: block;
font-size: 28px;
margin-bottom: 6px;
}
@media (min-width: 640px) {
.two-col {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 16px;
}
}
/ Desktop-specific styles for wider screens /
@media (min-width: 1000px) {
    .page {
        max-width: 1000px; / Wider content area for desktop /
        padding: 40px 32px; / More generous padding /
    }
    .hdr-row {
        padding-top: 12px; / More space above header content /
        margin-bottom: 24px; / More space below header /
    }
    .greeting {
        font-size: 48px; / Larger greeting text /
    }
    .greeting-sub {
        font-size: 18px; / Larger sub-greeting text /
    }
    .two-col {
        gap: 32px; / Increased gap between columns /
    }
    .card {
        padding: 28px; / More internal padding for cards /
    }
    .card-label {
        font-size: 11px; / Slightly larger label /
        margin-bottom: 18px; / More space below label /
    }
    .chat-messages {
        height: 360px; / Taller chat window for more history /
    }
    .chat-row {
        margin-top: 20px; / More space above chat input /
    }
    .voice-footer {
        margin-top: 16px; / More space above voice footer /
    }
}
</style>
</head>
<body>
<div class="page">
<!-- HEADER -->
<header class="mb-6 fade-up">
<div class="hdr-row">
<div style="flex:1">
<div class="greeting" id="greeting">Good morning<span class="pulse-dot"></span></div>
<div class="greeting-sub" id="clock"></div>
</div>
<div class="hdr-controls">
<button class="hdr-btn" id="btn-ambient" title="Ambient voice — Lumin speaks proactively when you have time" onclick="toggleAmbient()">🎙</button>
<button class="hdr-btn" id="btn-theme" title="Toggle light/dark" onclick="toggleTheme()">☀︎</button>
</div>
</div>
</header>
<!-- ROW 1: MITs + Calendar -->
<div class="two-col mb-4">
<div class="card accent-border-today fade-up delay-1">
<div class="card-label">Today's MITs</div>
<div id="mits-list">
<div class="skel-line skeleton w-full"></div>
<div class="skel-line skeleton w-4/5"></div>
<div class="skel-line skeleton w-3/5"></div>
</div>
<div class="quick-add">
<input type="text" id="mit-input" placeholder="Add a most important task…">
<button class="btn-add" onclick="addMIT()">Add</button>
</div>
</div>
<div class="card accent-border-today fade-up delay-2">
<div class="card-label">Today's Schedule</div>
<div id="cal-list">
<div class="skel-line skeleton w-full"></div>
<div class="skel-line skeleton w-3/4"></div>
<div class="skel-line skeleton w-4/5"></div>
</div>
</div>
</div>
<!-- ROW 2: Goals + Scores -->
<div class="two-col mb-4">
<div class="card accent-border-finance fade-up delay-3">
<div class="card-label">Goals</div>
<div id="goals-list">
<div class="skel-line skeleton w-full"></div>
<div class="skel-line skeleton w-full" style="height:6px;margin-top:4px;margin-bottom:14px;border-radius:3px"></div>
<div class="skel-line skeleton w-4/5"></div>
<div class="skel-line skeleton w-full" style="height:6px;margin-top:4px;border-radius:3px"></div>
</div>
</div>
<div class="card accent-border-health fade-up delay-4">
<div class="card-label">Life Scores <span style="font-size:10px;font-weight:400;letter-spacing:0;text-transform:none;color:var(--text-muted)">— hold to see what each means</span></div>
<div class="scores-grid" id="scores-grid">
<div class="score-tile"><div class="skel-line skeleton" style="width:72px;height:72px;border-radius:50%;margin-bottom:8px"></div><div class="skel-line skeleton" style="width:60px;height:10px"></div></div>
<div class="score-tile"><div class="skel-line skeleton" style="width:72px;height:72px;border-radius:50%;margin-bottom:8px"></div><div class="skel-line skeleton" style="width:60px;height:10px"></div></div>
<div class="score-tile"><div class="skel-line skeleton" style="width:72px;height:72px;border-radius:50%;margin-bottom:8px"></div><div class="skel-line skeleton" style="width:60px;height:10px"></div></div>
<div class="score-tile"><div class="skel-line skeleton" style="width:72px;height:72px;border-radius:50%;margin-bottom:8px"></div><div class="skel-line skeleton" style="width:60px;height:10px"></div></div>
</div>
</div>
</div>
<!-- NEW ROW: Victory Vault Widgets -->
<div class="two-col mb-4">
    <div class="card accent-border-growth fade-up delay-5">
        <div class="card-label">Victory Vault Progress</div>
        <!--
            Victory Vault API integration would go here.
            The specific endpoints for Victory Vault widgets/cards are unknown
            due to the missing 'docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md' file.
            No new API routes or calls are invented per task instructions.
        -->
        <div id="victory-vault-progress-content">
            <div class="skel-line skeleton w-full"></div>
            <div class="skel-line skeleton w-4/5"></div>
            <div class="skel-line skeleton w-3/5"></div>
        </div>
    </div>
    <div class="card accent-border-growth fade-up delay-6">
        <div class="card-label">Victory Vault Milestones</div>
        <!--
            Victory Vault API integration would go here.
            The specific endpoints for Victory Vault widgets/cards are unknown
            due to the missing 'docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md' file.
            No new API routes or calls are invented per task instructions.
        -->
        <div id="victory-vault-milestones-content">
            <div class="skel-line skeleton w-full"></div>
            <div class="skel-line skeleton w-4/5"></div>
            <div class="skel-line skeleton w-3/5"></div>
        </div>
    </div>
</div>
<!-- CHAT -->
<div class="card accent-border-mirror fade-up delay-7">
<div class="card-label">Chat with Lumin</div>
<div class="chat-messages" id="chat-messages">
<div class="msg assistant">Hey Adam 👋 — what's on your mind today?</div>
</div>
<div class="typing" id="typing">
<div class="typing-dot"></div>
<div class="typing-dot"></div>
<div class="typing-dot"></div>
</div>
<div class="chat-row">
<input type="text" id="chat-input" placeholder="Ask Lumin anything… or tap 🎙 to talk">
<button class="btn-mic" id="btn-mic" title="Push to talk (or hold Space)">🎙</button>
<button class="btn-send" id="send-btn">↑</button>
</div>
<div class="voice-footer">
<label>
<input type="checkbox" id="speak-toggle">
<span>Speak replies</span>
</label>
<span class="ptt-hint">Hold Space to talk</span>
<span id="voice-status"></span>
</div>
</div>
</div>
<div id="lifeos-ai-rail-root"></div>
<!-- Voice module must be non-module (IIFE) -->
<script src="/shared/lifeos-voice-chat.js"></script>
<script src="../shared/lifeos-dashboard-ai-rail.js"></script>
<script type="module">
const HDR = () => ({ 'x-lifeos-key': localStorage.getItem('lifeos_api_key') || '', 'Content-Type': 'application/json' });
const API = (p, o={}) => fetch(p, { headers: HDR(), ...o });
const $ = id => document.getElementById(id);
// ── Clock ──
function tick() {
const now = new Date();
const h = now.getHours();
$('greeting').innerHTML = (h<12?'Good morning':h<18?'Good afternoon':'Good evening') + '<span class="pulse-dot"></span>';
$('clock').textContent = now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) + ' · ' + now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}
tick();
setInterval(tick, 30000);
// ── Theme toggle ──
function toggleTheme() {
const curr = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
const next = curr === 'light' ? 'dark' : 'light';
document.documentElement.dataset.theme = next;
localStorage.setItem('lifeos_theme', next);
const mc = document.getElementById('theme-color-meta');
if (mc) mc.setAttribute('content', next === 'light' ? '#f6f7fb' : '#0a0a0f');
$('btn-theme').textContent = next === 'light' ? '☾' : '☀︎';
}
// ── Long-press ──
let pressTimer;
function bindLongPress(el, onHold, onRelease) {
const start = e => { pressTimer = setTimeout(() => onHold(e), 500); };
const end = () => { clearTimeout(pressTimer); onRelease && onRelease(); };
el.addEventListener('mousedown', start);
el.addEventListener('touchstart', start, { passive: true });
el.addEventListener('mouseup', end);
el.addEventListener('mouseleave', end);
el.addEventListener('touchend', end);
}
// ── MITs ──
asyncFn loadMITs() {
try {
const r = await API('/api/v1/lifeos/commitments?limit=30');
const d = await r.json();
const mits = (d.commitments||[]).filter(c=>c.is_mit).slice(0,3);
if (!mits.length) {
$('mits-list').innerHTML='<div class="empty"><span>✅</span>No MITs — add one below</div>';
return;
}
$('mits-list').innerHTML = mits.map(m=>`
<div class="mit-item" data-id="${m.id}" data-desc="${(m.description||m.text||'').replace(/"/g,'&quot;')}">
<div class="mit-check ${m.kept_at?'done':''}">
<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
<polyline points="2,6 5,9 10,3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
</div>
<div class="mit-text ${m.kept_at?'done':''}">${m.text||m.title||'Untitled'}</div>
</div>`).join('');
$('mits-list').querySelectorAll('.mit-item').forEach(el => {
el.addEventListener('click', ()=>toggleMIT(el));
bindLongPress(el, e => {
const tip = document.createElement('div');
tip.style.cssText='position:fixed;background:var(--bg-overlay);border:1px solid var(--border-focus);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--text-secondary);max-width:240px;z-index:200;box-shadow:0 8px 32px rgba(0,0,0,.6);pointer-events:none;backdrop-filter:blur(8px)';
const desc = el.dataset.desc || 'No description added yet';
tip.textContent = desc;
const cx = e.touches?e.touches[0].clientX:e.clientX;
const cy = e.touches?e.touches[0].clientY:e.clientY;
tip.style.left = Math.min(cx, window.innerWidth-260)+'px';
tip.style.top = Math.max(10, cy-70)+'px';
tip.id='mit-tip';
document.body.appendChild(tip);
}, () => { const t=$('mit-tip'); t&&t.remove(); } );
});
} catch {
$('mits-list').innerHTML='<div class="empty"><span>⚠️</span>Could not load tasks</div>';
}
}
asyncFn toggleMIT(el) {
const chk=el.querySelector('.mit-check'), txt=el.querySelector('.mit-text');
const done=chk.classList.contains('done');
chk.classList.toggle('done',!done);
txt.classList.toggle('done',!done);
try {
await API(`/api/v1/lifeos/commitments/${el.dataset.id}/keep`,{method:'POST',body:JSON.stringify({kept:!done})});
} catch {}
}
window.addMIT = asyncFn() {
const inp=$('mit-input'), text=inp.value.trim();
if (!text) return;
try {
await API('/api/v1/lifeos/commitments',{method:'POST',body:JSON.stringify({text,is_mit:true})});
inp.value='';
loadMITs();
} catch {}
};
$('mit-input').addEventListener('keypress', e=>{ if(e.key==='Enter') addMIT(); });
// ── Calendar ──
asyncFn loadCal() {
try {
const r=await API('/api/v1/lifeos/engine/calendar/events?days=1&limit=8');
const d=await r.json();
const evs=d.events||[];
if (!evs.length) {
$('cal-list').innerHTML='<div class="empty"><span>📅</span>Nothing scheduled today</div>';
return;
}
$('cal-list').innerHTML=evs.map(ev=>{
const t=ev.starts_at||ev.start_time?new Date(ev.starts_at||ev.start_time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
return `<div class="event-row">${t?`<span class="event-time">${t}</span>`:''}<span class="event-title">${ev.title||ev.name||'Event'}</span></div>`;
}).join('');
} catch {
$('cal-list').innerHTML='<div class="empty"><span>📅</span>Could not load schedule</div>';
}
}
// ── Goals ──
asyncFn loadGoals() {
try {
const r=await API('/api/v1/lifeos/finance/goals');
const d=await r.json();
const goals=(d.goals||[]).slice(0,3);
if (!goals.length) {
$('goals-list').innerHTML='<div class="empty"><span>🎯</span>No goals set yet</div>';
return;
}
$('goals-list').innerHTML=goals.map(g=>{
const pct=g.target_amount>0?Math.min(100,Math.round((g.current_amount/g.target_amount)*100)):0;
const amt=g.current_amount?`${Number(g.current_amount).toLocaleString()} saved`:'';
return `<div class="goal-row">
<div class="goal-header"><span class="goal-name">${g.name}</span><span class="goal-pct">${pct}%</span></div>
<div class="goal-track"><div class="goal-fill" style="width:${pct}%"></div></div>
${amt?`<div class="goal-sub">${amt}</div>`:''}
</div>`;
}).join('');
} catch {
$('goals-list').innerHTML='<div class="empty"><span>🎯</span>Could not load goals</div>';
}
}
// ── Scores ──
const SCORE_KEYS = [
{ key:'integrity_score', label:'Integrity', tip:'Commitments kept vs. made' },
{ key:'health_score', label:'Health', tip:'Sleep, movement & recovery' },
{ key:'focus_score', label:'Focus', tip:'MITs completed + deep work' },
{ key:'growth_score', label:'Growth', tip:'Habits, learning & momentum' },
];
function ringColor(s) {
return s>=80?'#10b981':s>=60?'#f59e0b':'#e05555';
}
function makeRing(score) {
const r=33, circ=2*Math.PI*r, offset=circ*(1-score/100);
const c=ringColor(score);
return `<svg width="72" height="72" viewBox="0 0 72 72">
<circle class="track" cx="36" cy="36" r="${r}" fill="none" stroke-width="6"/>
<circle class="fill" cx="36" cy="36" r="${r}" fill="none" stroke-width="6"
stroke="${c}" style="stroke-dashoffset:${offset}"/>
</svg>`;
}
asyncFn loadScores() {
try {
const r=await API('/api/v1/lifeos/dashboard/scoreboard');
const d=await r.json();
$('scores-grid').innerHTML=SCORE_KEYS.map(({key,label,tip})=>{
const s=d[key]||0;
return `<div class="score-tile">
<div class="score-ring">${makeRing(s)}<div class="score-num" style="color:${ringColor(s)}">${s}</div></div>
<div class="score-label">${label}</div>
<div class="score-tile-tip">${tip}</div>
</div>`;
}).join('');
$('scores-grid').querySelectorAll('.score-tile').forEach(tile=>{
bindLongPress(tile, ()=>tile.classList.add('tip-open'), ()=>tile.classList.remove('tip-open'));
});
} catch {
$('scores-grid').innerHTML='<div class="empty" style="grid-column:1/-1"><span>📊</span>Could not load scores</div>';
}
}
// ── Chat ──
let threadId=null;
asyncFn initChat() {
try {
const r=await API('/api/v1/lifeos/chat/threads/default',{method:'POST',body:JSON.stringify({})});
const d=await r.json();
threadId=d.thread?.id||d.id;
const mr=await API(`/api/v1/lifeos/chat/threads/${threadId}/messages?limit=10`);
const md=await mr.json();
const msgs=(md.messages||[]).slice(-10);
if (msgs.length) {
$('chat-messages').innerHTML=msgs.map(m=>`<div class="msg ${m.role==='user'?'user':'assistant'}">${m.content}</div>`).join('');
}
$('chat-messages').scrollTop=99999;
} catch {}
}
asyncFn sendChat() {
const inp=$('chat-input'), text=inp.value.trim();
if (!text||!threadId) return;
inp.value='';
const box=$('chat-messages');
box.innerHTML+=`<div class="msg user">${text}</div>`;
box.scrollTop=99999;
$('typing').classList.add('show');
try {
const r=await API(`/api/v1/lifeos/chat/threads/${threadId}/messages`,{method:'POST',body:JSON.stringify({message:text})});
const d=await r.json();
$('typing').classList.remove('show');
const reply = d.reply||d.content||'…';
box.innerHTML+=`<div class="msg assistant">${reply}</div>`;
box.scrollTop=99999;
// Speak reply if enabled
if (window.LifeOSVoiceChat && voiceCtrl) voiceCtrl.speak(reply);
} catch {
$('typing').classList.remove('show');
box.innerHTML+=`<div class="msg assistant" style="opacity:0.5">Something went wrong — try again.</div>`;
}
}
$('send-btn').addEventListener('click', sendChat);
$('chat-input').addEventListener('keypress', e=>{ if(e.key==='Enter') sendChat(); });
// ── Voice ──
let voiceCtrl = null;
function initVoice() {
if (!window.LifeOSVoiceChat) return;
voiceCtrl = window.LifeOSVoiceChat.attach({
inputId: 'chat-input',
buttonId: 'btn-mic',
statusId: 'voice-status',
speakToggleId: 'speak-toggle',
storageKey: 'lifeos_dashboard',
speakRepliesDefault: false,
mode: 'replace',
wakePrefixes: ['hey lumin', 'lumin', 'okay lumin'],
onStop: ({ inputValue }) => {
if (inputValue && inputValue.trim()) setTimeout(sendChat, 250);
},
});
}
// Space bar push-to-talk
document.addEventListener('keydown', e => {
if (e.code !== 'Space') return;
if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
e.preventDefault();
if (voiceCtrl) voiceCtrl.startMic();
});
document.addEventListener('keyup', e => {
if (e.code !== 'Space') return;
if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
if (voiceCtrl) voiceCtrl.stopMic();
});
// ── Ambient proactive mode ──
let ambientActive = false;
let ambientInterval = null;
window.toggleAmbient = function() {
ambientActive = !ambientActive;
const btn = $('btn-ambient');
if (ambientActive) {
btn.classList.add('ambient-active');
btn.title = 'Ambient ON — Lumin will speak when you have something to know. Click to turn off.';
checkProactiveNudge();
ambientInterval = setInterval(checkProactiveNudge, 2 * 60 * 1000);
} else {
btn.classList.remove('ambient-active');
btn.title = 'Ambient voice — Lumin speaks proactively when you have time';
clearInterval(ambientInterval);
if (window.speechSynthesis) window.speechSynthesis.cancel();
}
};
asyncFn checkProactiveNudge() {
try {
const r = await API('/api/v1/lifeos/ambient/nudge');
const d = await r.json();
if (!d.speak) return;
// Show as ambient chat bubble
const box = $('chat-messages');
box.innerHTML += `<div class="msg ambient">🔔 Lumin: ${d.speak}</div>`;
box.scrollTop = 99999;
// Speak it
if (window.LifeOSVoiceChat) {
window.LifeOSVoiceChat.speakText(d.speak);
} else if (window.speechSynthesis) {
const u = new SpeechSynthesisUtterance(d.speak.slice(0, 2000));
window.speechSynthesis.speak(u);
}
} catch {}
}
// ── Theme init sync ──
window.toggleTheme = toggleTheme;
// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
initVoice();
const th = document.documentElement.dataset.theme;
$('btn-theme').textContent = th === 'light' ? '☾' : '☀︎';
});
Promise.all([loadMITs(), loadCal(), loadGoals(), loadScores(), initChat()]);
</script>
</body>
</html>