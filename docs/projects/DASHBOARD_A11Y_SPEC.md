# Dashboard accessibility specification

**Authority:** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `public/overlay/lifeos-dashboard.html`, `public/overlay/lifeos-app.html`

**Gap note (2026-05-06):** A prior `/build` pass wrote a full HTML document into another **`*.md`** dashboard spec path (model followed HTML output contract despite markdown target). **GAP-FILL** keeps this file as Markdown; see related specs under `docs/projects/DASHBOARD_*`.

## Non-goals (this doc)

Replace production overlay HTML wholesale — implementation stays in **`lifeos-dashboard.html`** + shared JS/CSS unless a dedicated queued task targets those files.

## Concise requirements (shell)

### Keyboard

- Logical tab order inside dashboard iframe: landmark regions (main, complementary if used), AI rail collapse/expand, primary actions before decorative chrome.
- **Escape** collapses transient panels where applicable (match existing shell patterns).

### Motion

- Respect **`prefers-reduced-motion`** for decorative transitions (`ring-fill`, skeletons, drawer animations).

### Screen readers

- **`#lifeos-ai-rail-root`** region label; collapsed strip exposes **`aria-expanded`**; dock toggle exposes state.
- Score tiles / rings: numerical value surfaced as text where graphics alone would be meaningless (pattern already partly in dashboard — preserve on change).

### Contrast / theme

- Light + dark modes keep **WCAG-ish** minimal contrast on `--dash-text` vs `--dash-surface` per tokens file; interactive states get visible **`focus-visible`** outlines.

### Mobile / safe-area

- Bottom rail + shell tabs obey **`env(safe-area-inset-*)`**; no tap targets smaller than ~44×44 px equivalent on primary controls.

### Verification

Manual: VoiceOver / NVDA smoke on dashboard iframe + shell navigation. Automated: defer until overlay E2E harness exists (`docs/LIFEOS_SHELL_ACCEPTANCE.md`).

---

## Detailed WCAG checklist (dashboard shell)

The following expands the bullets above against WCAG 2.1–oriented expectations for the dashboard shell.

### 1. Semantic structure and landmarks (SC 1.3.1)

The dashboard shell must utilize appropriate HTML5 semantic elements and ARIA landmark roles to convey structure.

- The primary content area should be within `<main>` or `role="main"`.
- The document header (`<header>`) should provide an implicit **`role="banner"`** where applicable.
- Section navigation should use `<nav>` or `role="navigation"` when introduced.
- `lifeos-ai-rail-root` should use an appropriate landmark (`role="complementary"` or `role="region"`) with an accessible name (`aria-label`).
- Interactive sections (MITs, schedule, goals, scores, chat) need a logical heading hierarchy (`<h2>`, `<h3>`).

### 2. Keyboard operability and focus (SC 2.1.1, 2.4.3, 2.4.7)

All interactive components must be operable via keyboard with logical tab order and visible focus.

- Buttons (e.g. `.hdr-btn`, `.btn-add`, `.btn-mic`, `.btn-send`), inputs (`#mit-input`, `#chat-input`, `#speak-toggle`), and list/tile interactions (`.mit-item`, `.score-tile`) must be reachable with Tab / Shift+Tab and activatable with standard keys.
- **Focus visible:** `:focus-visible` (or equivalent) must meet contrast and prominence expectations.
- **No keyboard trap (2.1.2):** Any modal or rail must release focus appropriately; future modals must manage focus return.

### Long-press / pointer-only patterns

Where long-press is used (e.g. `.mit-item`, `.score-tile`), provide a keyboard-accessible alternative: focusable disclosure, **`aria-describedby`**, or an explicit info control.

### 3. Color contrast (SC 1.4.3, 1.4.11)

- Body text targets **≥ 4.5:1** against its background where WCAG AA applies.
- Meaningful icons and chart strokes target **≥ 3:1** non-text contrast where they convey information.

### 4. Motion (SC 2.3.3)

Respect **`prefers-reduced-motion`**. For users who prefer reduced motion, taper or disable non-essential animations (`pulse-ring`, `fadeUp`, `shimmer`, `bounce-dot`, `ring-fill`, `bar-grow`, `check-draw`, `mic-pulse`, etc.) via `@media (prefers-reduced-motion: reduce)`.

### 5. Focus traps in future widgets

Modal dialogs or complex widgets must implement focus containment while open and restore focus on dismiss.
