# Gap Audit: LifeOS Dashboard vs. Builder Brief

## Summary

**Critical finding:** The builder brief file (`LIFEOS_DASHBOARD_BUILDER_BRIEF.md`) does not exist in the repository. Without the specification document, I cannot perform a concrete gap analysis between the current implementation and the intended design.

The overnight queue file (`LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`) is also missing.

## Gaps

**Blocking issue:**
- `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` — **File not found** (ENOENT)
- `docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md` — **File not found** (ENOENT)

**Cannot assess:**
- Sidebar structure vs. spec (no spec available)
- Bottom tabs configuration vs. spec (no spec available)
- AI rail direction/placement vs. spec (no spec available)
- Light/dark theme intention vs. spec (no spec available)
- Mobile vs. desktop layout requirements vs. spec (no spec available)
- Mockup filename references (no brief to extract them from)

**Observable implementation details** (for context when brief becomes available):
- `lifeos-dashboard.html:1` — Standalone page with embedded chat, MITs, calendar, goals, scores
- `lifeos-app.html:1` — Full shell with sidebar navigation, topbar, mobile bottom nav, Lumin drawer
- `lifeos-app.html:152` — Sidebar contains collapsible nav with grouped sections
- `lifeos-app.html:682` — Mobile bottom nav has 5 tabs: Today, Inner, Health, Healing, More
- `lifeos-app.html:1156` — Lumin persistent drawer (right-side on desktop, bottom sheet on mobile)
- `lifeos-app.html:1` — Theme toggle present in both files
- `lifeos-dashboard.html:1` — Voice chat integration with push-to-talk and ambient mode

## Recommended Next Build Steps

1. **Locate or create** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` with:
   - Sidebar structure specification
   - Bottom tab configuration
   - AI rail placement and behavior
   - Light/dark theme requirements
   - Mobile vs. desktop layout rules
   - Mockup filenames and references

2. **Re-run this audit** once the brief exists

3. **If the brief was deleted or moved**, check:
   - `git log --all --full-history -- docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`
   - Alternative locations in `docs/` or `docs/design/`

4. **If the brief never existed**, author it first before attempting HTML changes

## ASSUMPTIONS

- The brief file was intended to exist but is missing from the current repository state
- The overnight queue file is a companion document (also missing)
- The current HTML files represent an earlier implementation that may predate the brief
- No gap analysis is possible without the specification document

---

**Next action:** Provide the builder brief content or confirm its location before proceeding with HTML modifications.