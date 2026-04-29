# LifeOS Dashboard Builder Smoke Receipt

**Reference Document**: `LIFEOS_DASHBOARD_BUILDER_BRIEF.md`

## Shell Architecture Understanding

### Desktop Layout
- **Persistent left sidebar** for primary navigation
- Sidebar contains category navigation and system controls
- Main content area displays active dashboard view

### Mobile Layout
- **Bottom tab bar** for primary navigation (intentionally different from desktop)
- Tab bar provides quick access to core categories
- Full-screen content area maximizes vertical space

### Category Dashboards
- **Swipe-ready horizontal navigation** between related category views
- Each category dashboard presents focused, domain-specific information
- Smooth gesture-based transitions between categories

### AI Integration
- **Persistent AI rail** accessible across all dashboard views
- AI assistant remains contextually aware as user navigates
- Rail adapts to viewport: side panel (desktop) or overlay (mobile)

## Theme Requirements
- **Light mode** and **dark mode** are both required
- Theme preference must persist across sessions
- All UI components must support both themes

## Layout Philosophy
Mobile and desktop layouts **differ intentionally** to optimize for their respective interaction patterns and screen constraints.