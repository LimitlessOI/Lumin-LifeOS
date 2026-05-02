The task description "Document how scripts... should integrate" contradicts the "HTML FULL FILE — STRICT OUTPUT CONTRACT" which requires generating the complete implementation code. Prioritizing the strict output contract, the following is the complete HTML file with the integration implemented.

```html
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
--c-mirror: var(--dash-accent-mirror, #7c3a