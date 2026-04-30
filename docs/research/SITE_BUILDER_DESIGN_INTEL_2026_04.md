# Site Builder Design Intel — 2026-04

Purpose: current design and delivery guidance injected into the Site Builder so preview sites feel modern, trustworthy, fast, and conversion-oriented instead of generic.

Review cadence:
- Monthly: scan official guidance and current high-performing local-service patterns.
- Immediate refresh: after any visible design drift, low conversion feedback, or new ranking/performance guidance.
- Quarterly: refactor the prompt structure if outputs start looking repetitive.

Source anchors:
- Google Search Central, LocalBusiness structured data:
  https://developers.google.com/search/docs/appearance/structured-data/local-business
- Google Search Central, general structured data guidelines:
  https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- web.dev, Core Web Vitals business guidance:
  https://web.dev/articles/optimize-cwv-business
- W3C WAI mobile accessibility:
  https://www.w3.org/WAI/standards-guidelines/mobile/

What to optimize for:
- Mobile-first reading and booking flow.
- Clear trust transfer in the first screen: outcome, credibility, CTA.
- Fast load and low visual clutter.
- Distinctive but calm art direction matched to the business tone.
- Accessibility: visible focus states, high contrast, large tap targets, semantic structure.
- Truthful SEO: only mark up data we actually have.

Modern local-service patterns to favor:
- Strong editorial hero with one dominant promise and one primary CTA.
- Proof near the top: stats, credentials, process, or a clarity statement.
- Repeated booking CTA without looking aggressive.
- Cards with clear grouping, soft depth, and generous spacing.
- One or two distinctive section treatments per page so the site feels designed, not templated.
- Mobile sticky CTA for call/book/message actions.
- Offer/pricing clarity instead of vague "contact us to learn more" copy.
- FAQ and objection handling before the final booking section.

What to avoid:
- Default purple-on-white template look unless the brand actually uses it.
- Long walls of centered text.
- Empty video sections, fake reviews, fake ratings, or invented proof.
- Heavy animation, autoplay media, or anything likely to hurt Core Web Vitals.
- Tiny buttons, weak contrast, and dense nav menus.
- Cramming too many sections above the fold.

Visual direction rules:
- Use CSS variables for theme tokens.
- Vary the layout rhythm by industry and tone; do not output the same hero pattern every time.
- If the brand feels clinical, use crisp grids and restrained accents.
- If the brand feels holistic or personal, use warmer paper tones, softer gradients, and more editorial spacing.
- Make the CTA treatment strong and obvious.
- Use subtle texture, glow, borders, or background shapes for depth instead of generic stock imagery.

Conversion rules:
- First screen must answer: who it is for, what outcome they get, and what to do next.
- Every major section should either build trust or reduce friction.
- Price clarity, package clarity, and next-step clarity beat clever copy.
- If a section cannot help conversion or trust, remove it.

Performance rules:
- Prefer simple DOM and utility layout.
- Limit custom CSS to theme tokens and a few purposeful effects.
- No unnecessary dependencies, fonts, carousels, or scripts.
- Keep imagery decorative unless real assets are available.
