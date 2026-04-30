# Gap Audit: LifeOS Dashboard Implementation vs. Brief

## Summary

**Critical Issue:** Both brief files (`LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`) returned `ENOENT` — they do not exist in the repository at the specified paths.

Without the authoritative brief, this audit compares the two production HTML files against each other and documents structural differences. The files represent two distinct architectural patterns:

1. **lifeos-dashboard.html** — Standalone dashboard page (28,849 chars)
2. **lifeos-app.html** — Full application shell with iframe content loader (91,838 chars)

---

## Gaps vs. Inferred Brief Intent

### Architecture Pattern

| Aspect | lifeos-dashboard.html | lifeos-app.html | Gap |
|--------|----------------------|-----------------|-----|
| **Purpose** | Single-page dashboard view | Full app shell + navigation chrome | Dashboard is standalone; app is the container |
| **Sidebar** | ❌ None | ✅ Full collapsible sidebar with nav groups | Dashboard has no navigation chrome |
| **Bottom tabs (mobile)** | ❌ None | ✅ 4 fixed tabs + "More" sheet | Dashboard has no mobile bottom nav |
| **AI rail direction** | Embedded chat card at bottom | Persistent drawer (right/bottom) + FAB + quick-bar | Different AI interaction patterns |
| **Theme system** | Inline theme toggle | Full theme system with sync across iframe | Dashboard uses simpler theme implementation |

### Light/Dark Intent

| Feature | lifeos-dashboard.html | lifeos-app.html | Gap |
|---------|----------------------|-----------------|-----|
| **Theme toggle UI** | ☀︎ button in header | Multiple toggles (topbar, mobile, settings) | Dashboard has single toggle point |
| **Theme persistence** | Uses `lifeos-theme.js` | Uses `lifeos-theme.js` + `lifeos-theme-overrides.css` | Dashboard missing override stylesheet |
| **Light mode CSS** | ❌ No light mode variables defined | ✅ Full `html[data-theme="light"]` ruleset | Dashboard dark-only |
| **Theme sync** | Standalone page | Syncs to iframe content via postMessage | Dashboard doesn't need sync |

### Mobile vs. Desktop

| Feature | lifeos-dashboard.html | lifeos-app.html | Gap |
|---------|----------------------|-----------------|-----|
| **Responsive strategy** | Single breakpoint (640px) for 2-col grid | Three-tier: <600px mobile, 600-999px icon sidebar, 1000px+ full | Dashboard simpler responsive |
| **Mobile chrome** | None (standalone page) | Mobile topbar + bottom nav + drawer sidebar | Dashboard has no mobile shell |
| **Safe area insets** | Basic `env(safe-area-inset-bottom)` on body | Full safe area handling on all chrome elements | App has comprehensive notch support |
| **Touch targets** | Standard button sizes | Minimum 44px touch targets throughout | Dashboard doesn't enforce 44px minimum |

### AI Rail Direction

| Feature | lifeos-dashboard.html | lifeos-app.html | Gap |
|---------|----------------------|-----------------|-----|
| **Chat UI pattern** | Embedded card in page flow | Persistent drawer overlay | Different interaction models |
| **Entry points** | Single chat card | FAB + quick-bar + topbar button + Cmd/Ctrl+L | Dashboard has one entry point |
| **Voice integration** | Push-to-talk (Space bar) + mic button | Always-on toggle + push-to-talk + drawer mic | App has richer voice options |
| **Chat persistence** | Thread created on page load | Thread persists across navigation | Dashboard thread is page-scoped |
| **Ambient mode** | ✅ Proactive nudge system | ❌ No ambient mode in shell | Dashboard has feature app lacks |

### Component Inventory

**Only in lifeos-dashboard.html:**
- Greeting header with time-based message
- MITs card with quick-add
- Calendar events card
- Goals progress card
- Life scores grid (4 tiles with ring charts)
- Embedded chat card
- Ambient voice toggle
- Long-press tooltips on MITs

**Only in lifeos-app.html:**
- Sidebar navigation (25+ sections)
- User pill with dropdown
- Settings panel (admin invites, gate-change presets, ambient sense toggle)
- Feature help popovers
- Mobile bottom nav (4 tabs + More sheet)
- Lumin FAB (floating action button)
- Lumin quick-bar (one-tap entry strip)
- Lumin persistent drawer
- Install banner (PWA prompt)
- Section color accent system
- Page metadata routing table
- Theme sync to iframe

---

## Recommended Next Queued Builds

### 1. **Create Missing Brief Files** (BLOCKING)

**File:** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`

**Content should specify:**
- Is `lifeos-dashboard.html` intended as a standalone page or should it be loaded inside `lifeos-app.html`?
- Canonical sidebar structure (nav groups, order, icons)
- Mobile bottom nav tabs (which 4 sections are primary?)
- AI rail direction (embedded vs. drawer — which is the target pattern?)
- Light/dark theme requirements (dashboard currently dark-only)
- Mockup references (if any exist)

**File:** `docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`

**Content should specify:**
- Pending dashboard tasks (e.g., score tile data sources, goal sync)
- Integration tasks (e.g., wire dashboard into app shell iframe)
- Missing features (e.g., light mode for dashboard, mobile nav)

### 2. **Align Dashboard with App Shell** (if brief confirms integration intent)

**Option A:** Dashboard as iframe content
- Remove standalone chrome from `lifeos-dashboard.html` (header, theme toggle)
- Rely on `lifeos-app.html` shell for navigation and theme
- Add to `PAGE_META` in app.html: `'lifeos-dashboard.html': { title: 'Dashboard', icon: '📊', color: '--c-dashboard' }`

**Option B:** Dashboard as standalone page
- Add light mode CSS to `lifeos-dashboard.html`
- Document use case (e.g., embeddable widget, direct link for quick view)
- Add link to full app from dashboard

### 3. **Add Light Mode to Dashboard** (if standalone)

**File:** `public/overlay/lifeos-dashboard.html`

**Changes:**
- Add `html[data-theme="light"]` CSS variables (copy from app.html)
- Update theme toggle to set `data-theme` attribute
- Test all cards, scores, and chat in light mode

### 4. **Document Section Color System**

**File:** `docs/design/section-colors.md` (new)

**Content:**
- Canonical color mapping (Today: `--c-today`, Health: `--c-health`, etc.)
- Usage in topbar accent line
- Usage in nav item active state
- Usage in card accent borders

### 5. **Standardize Voice Integration**

**Current state:**
- Dashboard has ambient proactive mode (app lacks)
- App has always-on toggle (dashboard lacks)
- Both have push-to-talk

**Recommendation:**
- Move ambient mode to app shell (make it global)
- Add always-on toggle to dashboard (if standalone)
- Document voice feature matrix in brief

### 6. **Mobile Bottom Nav Tab Order**

**Current:** Today, Inner, Health, Healing, More

**Questions for brief:**
- Is this the priority order based on usage data?
- Should Dashboard be in bottom nav instead of More sheet?
- Should Chat/Lumin be a bottom tab (currently FAB + quick-bar)?

---

## Open Questions

### 1. **What is the relationship between the two HTML files?**

- Is `lifeos-dashboard.html` a legacy artifact or an active standalone page?
- Should dashboard be loaded inside `lifeos-app.html` iframe?
- If standalone, what is the use case? (embeddable widget, quick-view URL, etc.)

### 2. **Where are the mockup files referenced in the task?**

- Task says "Reference mockup filenames from the brief"
- No mockups found in injected file list
- Do mockups exist? If so, where? (`docs/mockups/`, `public/assets/`, Figma?)

### 3. **Why does dashboard have ambient mode but app shell doesn't?**

- Dashboard: `toggleAmbient()` with proactive nudge polling
- App: Ambient sense (device hints) but no proactive voice
- Should ambient voice be global (in shell) or page-specific?

### 4. **Should dashboard scores be real-time or cached?**

- Current: Fetches from `/api/v1/lifeos/dashboard/scoreboard`
- No loading states or error boundaries
- Should scores update on interval? On visibility change?

### 5. **What is the target breakpoint strategy?**

- Dashboard: Single breakpoint (640px)
- App: Three-tier (600px, 1000px)
- Should dashboard adopt app's breakpoints for consistency?

### 6. **Is the "overnight queue" a task backlog or a scheduled build queue?**

- If backlog: Should it live in `docs/projects/` or `docs/tasks/`?
- If scheduled: Should it integrate with `startup/register-schedulers.js`?

---

## ASSUMPTIONS

1. The brief files were intended to exist but were never committed (or were deleted)
2. `lifeos-app.html` represents the current authoritative shell architecture
3. `lifeos-dashboard.html` is either:
   - A standalone page for direct access, OR
   - Content intended to be loaded inside the app shell iframe
4. "Mockup filenames" refers to design assets not present in the repository
5. The task expects a gap audit only (no code changes)

---

**Next Step:** Create or restore the missing brief files before making structural changes to either HTML file. The brief must answer: "Is dashboard standalone or iframe content?" — this determines all subsequent work.