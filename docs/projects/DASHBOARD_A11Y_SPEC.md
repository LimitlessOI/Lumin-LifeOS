# Dashboard accessibility specification (draft)

**Authority:** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `public/overlay/lifeos-dashboard.html`, `public/overlay/lifeos-app.html`

**Gap note (2026-05-06):** A prior `/build` pass wrote a full HTML document into this **`*.md`** path (model followed HTML output contract despite markdown target). Supervisor **GAP-FILL** replaces with a real spec until **`routes/lifeos-council-builder-routes.js`** adds a **`markdown_codegen`** gate for **`target_file` ending `.md`** (reject leading `<!DOCTYPE` / `<html`).

## Non-goals (this doc)

Replace production overlay HTML wholesale—implementation stays in **`lifeos-dashboard.html`** + shared JS/CSS unless a dedicated queued task targets those files.

## Requirements

### Keyboard

- Logical tab order inside dashboard iframe: landmark regions (main, complementary if used), AI rail collapse/expand, primary actions before decorative chrome.
- **Escape** collapses transient panels where applicable (match existing shell patterns).

### Motion

- Respect **`prefers-reduced-motion`** for decorative transitions (`ring-fill`, skeletons, drawer animations).

### Screen readers

- **`#lifeos-ai-rail-root`** region label; collapsed strip exposes **`aria-expanded`**; dock toggle exposes state.
- Score tiles / rings: numerical value surfaced as text where graphics alone would be meaningless (pattern already partly in dashboard—preserve on change).

### Contrast / theme

- Light + dark modes keep **WCAG-ish** minimal contrast on `--dash-text` vs `--dash-surface` per tokens file; interactive states get visible **`focus-visible`** outlines.

### Mobile / safe-area

- Bottom rail + shell tabs obey **`env(safe-area-inset-*)`**; no tap targets smaller than ~44×44 px equivalent on primary controls.

## Verification

Manual: VoiceOver NVDA smoke on dashboard iframe + shell navigation. Automated: defer until overlay E2E harness exists (`docs/LIFEOS_SHELL_ACCEPTANCE.md`).
