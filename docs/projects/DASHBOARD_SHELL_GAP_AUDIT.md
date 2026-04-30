# LifeOS Dashboard Gap Audit

## Summary

**Critical Finding:** Both brief files (`LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`) **do not exist** in the repository. Both file reads returned `ENOENT` errors.

Without the authoritative brief, this audit compares the two production HTML files against each other and documents their architectural differences. The files represent two distinct patterns:

1. **lifeos-dashboard.html** (28,849 chars) — Standalone dashboard page with embedded content
2. **lifeos-app.html** (91,838 chars) — Full application shell with sidebar, navigation, and iframe content loader

---

## Gaps vs. Inferred Brief Intent

### Architecture & Navigation

| Feature | lifeos-dashboard.html | lifeos-app.html | Gap |
|---------|----------------------|-----------------|-----|
| **Sidebar** | ❌ None | ✅ Full sidebar with collapsible nav, 25+ sections | Dashboard has no navigation chrome |
| **Bottom tabs (mobile)** | ❌ None | ✅ 4 fixed tabs (Today, Inner, Health, Healing) + More sheet | Dashboard has no mobile bottom nav |
| **Topbar** | ❌ None (header with greeting) | ✅ Desktop topbar + mobile topbar with section title | Dashboard uses custom header |
| **User context** | ❌ None | ✅ User pill with avatar, dropdown (Settings, Sign Out) | Dashboard has no user UI |
| **Settings panel** | ❌ None | ✅ Right-side drawer with account, API key, admin sections | Dashboard has no settings |

### AI Rail Direction

| Feature | lifeos-dashboard.html | lifeos-app.html | Gap |
|---------|----------------------|-----------------|-----|
| **Chat UI pattern** | Embedded card in page flow | Persistent drawer (right/bottom overlay) | Different interaction models |
| **Entry points** | Single chat card | FAB + quick-bar + topbar button + Cmd/Ctrl+L | Dashboard has one entry point |
| **Chat persistence** | Thread created on page load | Thread persists across navigation | Dashboard thread is page-scoped |
| **Voice integration** | Push-to-talk (Space bar) + mic button | Always-on toggle + push-to-talk + drawer mic | App has richer voice options |
| **Ambient mode** | ✅ Proactive nudge system (`toggleAmbient()`) | ❌ No ambient mode in shell | Dashboard has feature app lacks |

### Light/Dark Theme

| Feature | lifeos-dashboard.html | lifeos-app.html | Gap |
|---------|----------------------|-----------------|-----|
| **Light mode CSS** | ❌ No light mode variables | ✅ Full `html[data-theme="light"]` ruleset | Dashboard is dark-only |
| **Theme toggle** | ☀︎ button in header | Multiple toggles (topbar, mobile, settings) | Dashboard has single toggle |
| **Theme sync** | Standalone (no sync needed) | Syncs to iframe via postMessage | App propagates theme to content |
| **Theme persistence** | Uses `lifeos-theme.js` | Uses `lifeos-theme.js` + `lifeos-theme-overrides.css` | Dashboard missing override stylesheet |

### Mobile vs. Desktop

| Feature | lifeos-dashboard.html | lifeos-app.html | Gap |
|---------|----------------------|-----------------|-----|
| **Responsive strategy** | Single breakpoint (640px) for 2-col grid | Three-tier: <600px mobile, 600-999px icon sidebar, 1000px+ full | Dashboard simpler responsive |
| **Mobile chrome** | None (standalone page) | Mobile topbar + bottom nav + drawer sidebar | Dashboard has no mobile shell |
| **Safe area insets** | Basic `env(safe-area-inset-bottom)` on body | Full safe area handling on all chrome elements | App has comprehensive notch support |
| **Touch targets** | Standard button sizes | Minimum 44px touch targets enforced | Dashboard doesn't enforce 44px minimum |
| **PWA support** | ❌ No manifest, no install prompt | ✅ Manifest, install banner, service worker | Dashboard not installable |

### Component Inventory

**Only in lifeos-dashboard.html:**
- Greeting header with time-based message ("Good morning/afternoon/evening")
- MITs card with quick-add input
- Calendar events card
- Goals progress card (finance goals with progress bars)
- Life scores grid (4 tiles: Integrity, Health, Focus, Growth)
- Embedded chat card with typing indicator
- Ambient voice toggle button
- Long-press tooltips on MIT items

**Only in lifeos-app.html:**
- Sidebar navigation (25+ sections across 5 groups)
- User pill with dropdown (Settings, Sign Out)
- Settings panel (API key, admin invites, gate-change presets, ambient sense toggle)
- Feature help popovers (hover on nav items)
- Mobile bottom nav (4 tabs + More sheet with 21 sections)
- Lumin FAB (floating action button)
- Lumin quick-bar (one-tap entry strip above content)
- Lumin persistent drawer (right-side on desktop, bottom sheet on mobile)
- Install banner (PWA prompt after 2 visits)
- Section color accent system (topbar bottom border changes per section)
- Page metadata routing table (`PAGE_META` with 27 pages)
- Theme sync to iframe content

---

## Recommended Next Queued Builds

### 1. **Create Missing Brief Files** (BLOCKING)

**Priority:** P0 — Cannot proceed without authoritative spec

**File:** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`

**Must specify:**
- Is `lifeos-dashboard.html` intended as standalone or iframe content?
- Canonical sidebar structure (nav groups, order, icons)
- Mobile bottom nav tabs (which 4 sections are primary?)
- AI rail direction (embedded card vs. persistent drawer — which is target?)
- Light/dark theme requirements (dashboard currently dark-only)
- Mockup references (if any exist — task mentions "Reference mockup filenames from the brief")

**File:** `docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`

**Must specify:**
- Pending dashboard tasks (e.g., score tile data sources, goal sync)
- Integration tasks (e.g., wire dashboard into app shell iframe)
- Missing features (e.g., light mode for dashboard, mobile nav)

### 2. **Align Dashboard with App Shell** (if brief confirms integration)

**Option A:** Dashboard as iframe content (likely intent based on app.html structure)

**Changes:**
- Remove standalone chrome from `lifeos-dashboard.html` (header, theme toggle, ambient button)
- Rely on `lifeos-app.html` shell for navigation and theme
- Add to `PAGE_META` in app.html: `'lifeos-dashboard.html': { title: 'Dashboard', icon: '📊', color: '--c-dashboard' }`
- Test dashboard loads correctly in iframe with theme sync

**Option B:** Dashboard as standalone page (if brief specifies this)

**Changes:**
- Add light mode CSS to `lifeos-dashboard.html` (copy from app.html)
- Add link to full app from dashboard ("Open full LifeOS →")
- Document use case (e.g., embeddable widget, direct link for quick view)

### 3. **Add Light Mode to Dashboard** (if standalone)

**File:** `public/overlay/lifeos-dashboard.html`

**Changes:**
- Add `html[data-theme="light"]` CSS variables (copy from app.html lines 126-137)
- Update `toggleTheme()` to set `data-theme` attribute on `<html>`
- Test all cards, scores, and chat in light mode
- Verify theme toggle icon updates correctly

### 4. **Standardize Voice Integration**

**Current state:**
- Dashboard has ambient proactive mode (app lacks)
- App has always-on toggle (dashboard lacks)
- Both have push-to-talk

**Recommendation:**
- Move ambient mode to app shell (make it global, not page-specific)
- Add always-on toggle to dashboard (if standalone)
- Document voice feature matrix in brief

### 5. **Mobile Bottom Nav Tab Order Validation**

**Current:** Today, Inner, Health, Healing, More

**Questions for brief:**
- Is this priority order based on usage data or design intent?
- Should Dashboard be in bottom nav instead of More sheet?
- Should Chat/Lumin be a bottom tab (currently FAB + quick-bar)?

### 6. **Document Section Color System**

**File:** `docs/design/section-colors.md` (new)

**Content:**
- Canonical color mapping (Today: `--c-today`, Health: `--c-health`, etc.)
- Usage in topbar accent line (app.html has this, dashboard doesn't)
- Usage in nav item active state
- Usage in card accent borders (dashboard has this: `accent-border-today`, etc.)

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

- Dashboard: `toggleAmbient()` with proactive nudge polling every 2 minutes
- App: Ambient sense (device hints) but no proactive voice
- Should ambient voice be global (in shell) or page-specific?

### 4. **Should dashboard scores be real-time or cached?**

- Current: Fetches from `/api/v1/lifeos/dashboard/scoreboard`
- No loading states or error boundaries beyond skeleton
- Should scores update on interval? On visibility change?

### 5. **What is the target breakpoint strategy?**

- Dashboard: Single breakpoint (640px) for 2-col grid
- App: Three-tier (600px, 1000px) with icon-only sidebar at mid-range
- Should dashboard adopt app's breakpoints for consistency?

### 6. **Is the "overnight queue" a task backlog or a scheduled build queue?**

- If backlog: Should it live in `docs/projects/` or `docs/tasks/`?
- If scheduled: Should it integrate with `startup/register-schedulers.js`?

### 7. **Should the Lumin drawer replace the embedded chat card?**

- Dashboard has embedded chat card (simpler, always visible)
- App has persistent drawer (overlay, multiple entry points)
- If dashboard loads in iframe, does it keep its chat or use shell's drawer?

---

## ASSUMPTIONS

1. The brief files were intended to exist but were never committed (or were deleted)
2. `lifeos-app.html` represents the current authoritative shell architecture
3. `lifeos-dashboard.html` is either:
   - Content intended to be loaded inside the app shell iframe, OR
   - A standalone page for direct access (e.g., embeddable widget, quick-view URL)
4. "Mockup filenames" refers to design assets not present in the repository
5. The task expects a gap audit only (no code changes)
6. The ambient voice feature in dashboard is intentional (not a mistake)
7. The lack of light mode in dashboard is a gap (not intentional dark-only design)

---

**Next Step:** Create or restore the missing brief files before making structural changes to either HTML file. The brief must answer: **"Is dashboard standalone or iframe content?"** — this determines all subsequent work.