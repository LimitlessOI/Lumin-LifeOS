<!-- SYNOPSIS: LifeOS Dashboard — machine-readable UI map -->

# LifeOS Dashboard — machine-readable UI map

**Status:** Authoritative text map for builder injection when PNG boards cannot be embedded as UTF-8.  
**Paired with:** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, PNG boards under `docs/mockups/`, runtime `docs/LIFEOS_PROGRAM_MAP_SSOT.md`.  
**Rule:** Council output must **not** invent a different shell IA than this document + the brief. If something is missing here, say so in `---METADATA---` and point to SSOT gaps — do not improvise “prettier” layouts.

## LifeOS interaction model (2026+) — Lumin-first

**Summary:** **Lumin = primary interface layer** (Presence). **Dashboard = visual cognition support** (glance, orient, reflect) — not a widget casino. **Home is contextual** by mode/time/energy. **Deep dashboards = intentional** (Level 4). Full vocabulary, layers, emotional ergonomics, governance, and v1 phasing: **`docs/projects/LIFEOS_UX_ARCHITECTURE.md`**.

**Compatibility:** This does **not** relax the checklist below (sidebar, bottom tabs, rail, breakpoints) unless those documents are explicitly amended.

## Checklist (builder must satisfy unless task explicitly exempt)

- [ ] Desktop (**≥600px** default chrome): **left sidebar** persists; main = scrollable widget region; **AI rail** docked top or bottom per brief.
- [ ] Mobile (**≤599px** default chrome): **bottom tab bar** persists; **no** permanent left sidebar as primary nav (drawer ok if brief already allows).
- [ ] **Light + dark** theme tokens respected (`public/shared/lifeos-dashboard-tokens.css` when present).
- [ ] **AI rail**: global, collapsible, one-line collapsed + expandable transcript state (see brief § AI rail).
- [ ] **Density**: compact / balanced / expanded card modes per brief; do not replace with a single fixed card size “because simpler.”
- [ ] **Category dashboards**: vertical scroll inside category; horizontal swipe **between** categories on mobile allowed.
- [ ] **URLs:** shell `/lifeos` or `/overlay/lifeos-app.html`; dashboard iframe default; `?layout=auto|mobile|desktop` per program map.

## Region → responsibility matrix

| Region | Desktop | Mobile | Must not |
|--------|---------|--------|----------|
| Primary nav | Left sidebar list | Bottom tabs | Replace with top-only hamburger as sole nav |
| Content | Main column widget grid | Per-category vertical scroll | One monolithic non-scrollable wall |
| AI | Persistent rail (dock top/bottom) | Collapsible strip + expand | Omit rail “for minimalism” |
| Header / brand | Top bar in shell | Mobile top bar in shell | Random third header bar duplicating IA |

## Breakpoints (align shipped CSS to these names)

- **mobile-first upper bound:** `599px` — below = mobile chrome; at/above `600px` = desktop chrome when `layout=auto`.
- Forced modes: `?layout=mobile` / `?layout=desktop` override viewport width for QA (see program map).

## Visual boards (PNG) — same IA as this file

| File | Defines |
|------|---------|
| `lifeos-system-map-board-2x.png` | Whole-program domains / layers |
| `lifeos-shell-dashboard-architecture-board-2x.png` | Shell + dashboard architecture |
| `lifeos-expansion-stack-board-2x.png` | Expansion without one giant screen |
| `lifeos-dashboard-density-study-light-dark-mobile-desktop.png` | Density + themes + mobile/desktop |

**Runtime URLs (after deploy):** `{PUBLIC_BASE_URL}/overlay/ui-mockups/<filename>` for each PNG above.

## Density study (textual stand-in until board is replaced)

Until the density PNG is artist-complete, treat density as:

- **Light / dark:** both shipped; toggle must not destroy layout (contrast + spacing).
- **Desktop:** sidebar + main + rail share height; widgets reflow in grid, no overlapping rails.
- **Mobile:** bottom tabs always visible; content clears tab bar; rail does not permanently cover tabs.

## METADATA contract

Dashboard-affecting builder tasks should end `---METADATA---` with JSON including:

```json
{
  "ui_map_conformance": "docs/mockups/DASHBOARD_UI_MAP.md",
  "mockup_urls_verified": "optional_note"
}
```

When `PUBLIC_BASE_URL` is unknown at generation time, set `mockup_urls_verified` to `"operator_must_open_runtime_urls"` rather than fabricating hosts.
