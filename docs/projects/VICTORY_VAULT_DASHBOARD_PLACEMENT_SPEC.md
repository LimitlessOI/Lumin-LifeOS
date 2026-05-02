The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file was not found, preventing the identification of existing Victory Vault API endpoints. Therefore, the implementation includes only placeholder HTML for the Victory Vault widgets/cards, without any API integration.
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