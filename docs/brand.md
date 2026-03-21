# Lumin / LimitlessOS Brand Bible

> This file is read by the AI builder before every design and copy task.
> Keep it updated — it IS the design system.

---

## Mission
Build tools that give entrepreneurs and small businesses the leverage of an entire team.
The product feels powerful but never overwhelming. Like having a genius co-founder.

## Voice & Tone
- **Direct** — say it plainly, no filler
- **Confident** — we know what we're doing, don't hedge
- **Human** — no corporate speak, no jargon walls
- **Aspirational but grounded** — big vision, real results

### Copy rules
- Headlines: outcome-focused ("Get more clients", "Stop losing leads", "Close deals faster")
- CTAs: action verbs + value ("Start Free", "See How It Works", "Get My Report")
- Never: "leverage synergies", "best-in-class", "seamlessly integrates"
- Numbers win: "Save 12 hours/week" beats "Save time"

---

## Visual Identity

### Colors
```
Primary:    #6366F1  (indigo-500)   — main actions, links, highlights
Primary dark: #4F46E5 (indigo-600)  — hover states
Accent:     #10B981  (emerald-500)  — success, money, positive metrics
Warning:    #F59E0B  (amber-500)    — caution, pending
Danger:     #EF4444  (red-500)      — errors, destructive actions

Background dark:  #0F172A  (slate-900)  — main dark bg
Surface dark:     #1E293B  (slate-800)  — cards, panels on dark
Border dark:      #334155  (slate-700)  — dividers on dark

Background light: #F8FAFC  (slate-50)   — light mode bg
Surface light:    #FFFFFF               — cards on light
Border light:     #E2E8F0  (slate-200)  — dividers on light
```

### Typography
- **Font stack:** `Inter, system-ui, -apple-system, sans-serif`
- Load via: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">`
- **Headings:** 700-800 weight, tight tracking (`tracking-tight`)
- **Body:** 400-500 weight, comfortable line height (`leading-relaxed`)
- **Mono:** `font-mono` for code, IDs, technical values

### Spacing & Layout
- Container max-width: `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`
- Section padding: `py-16 lg:py-24`
- Card padding: `p-6` (mobile) / `p-8` (desktop)
- Border radius: `rounded-xl` for cards, `rounded-lg` for inputs/buttons, `rounded-full` for badges

---

## UI Patterns

### Default Theme
**Dark theme first.** Use slate-900 backgrounds. Light theme is opt-in.

### Buttons
```html
<!-- Primary -->
<button class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
  Action
</button>

<!-- Secondary -->
<button class="border border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 font-semibold px-6 py-3 rounded-lg transition-colors">
  Action
</button>

<!-- Danger -->
<button class="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
  Delete
</button>
```

### Cards
```html
<div class="bg-slate-800 border border-slate-700 rounded-xl p-6">
  <!-- content -->
</div>
```

### Form inputs
```html
<input class="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-400">
```

### Badges / Status
```html
<span class="bg-emerald-500/10 text-emerald-400 text-xs font-medium px-2.5 py-0.5 rounded-full">Active</span>
<span class="bg-amber-500/10 text-amber-400 text-xs font-medium px-2.5 py-0.5 rounded-full">Pending</span>
<span class="bg-red-500/10 text-red-400 text-xs font-medium px-2.5 py-0.5 rounded-full">Failed</span>
```

### Tables
- Use `divide-y divide-slate-700` for row separators
- Sticky header with `bg-slate-800/50`
- Hover rows: `hover:bg-slate-700/50`

### Icons
Use Heroicons via CDN or inline SVG. Prefer outline style at 20px or 24px.

---

## Landing Page Structure (Standard)
Every product landing page follows this order:
1. **Hero** — headline (outcome), subheadline (how), primary CTA, social proof number
2. **Problem** — 3 pain points the user feels right now
3. **Solution** — how the product solves each pain point
4. **How It Works** — 3 steps, numbered, concrete
5. **Pricing** — 2-3 tiers, middle tier highlighted
6. **FAQ** — 5-7 questions, accordion
7. **Final CTA** — repeat the primary CTA with urgency

---

## Anti-Patterns (Never Do This)
- No sliders/carousels for core content
- No popups on page load
- No infinite scroll in dashboards (use pagination)
- No more than 2 font sizes per section
- No gradients as primary backgrounds (use as accents only)
- No auto-playing media
- No placeholder text in buttons ("Click here", "Submit")
- Never center-align body text blocks

---

## Accessibility Baseline
- All interactive elements must have `focus:ring` states
- Color contrast: WCAG AA minimum (4.5:1 for normal text)
- All images need `alt` text
- Form inputs need `<label>` elements
- Buttons need descriptive text (not just icons)

---

## Tailwind CDN
Always use: `<script src="https://cdn.tailwindcss.com"></script>`
Do NOT use PostCSS/build steps for landing pages — CDN only.
