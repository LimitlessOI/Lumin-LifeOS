/**
 * SYNOPSIS: Site Builder design-system library.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 *
 * Site Builder design-system library.
 *
 * A curated set of distinct, cutting-edge visual directions the generator can
 * build a site in. The prospect's own website usually has POOR design taste, so
 * we do NOT let their site drive the look — these are OUR templates, each a
 * strong, modern aesthetic. The client can toggle between variants on the
 * preview until they find the one they love.
 *
 * Each entry is a set of directives injected into the generation prompt's design
 * section. They steer typography, palette strategy, layout motifs, component
 * styling and motion — not the content (content stays truthful and identical
 * across variants).
 */

export const DESIGN_SYSTEMS = [
  {
    id: 'editorial-luxe',
    name: 'Editorial Luxe',
    blurb: 'Magazine-grade serif display, generous whitespace, refined and premium.',
    directives: [
      'AESTHETIC: high-end editorial / magazine. Think Kinfolk, Cereal magazine, luxury spa brand.',
      'TYPOGRAPHY: large serif display headings (use a Google Font like "Fraunces", "Playfair Display" or "Cormorant" via <link>), paired with a clean grotesque sans for body ("Inter"/"Söhne"-like). Big type-scale contrast — huge headlines, small refined labels in uppercase letter-spacing.',
      'PALETTE: mostly warm neutrals (bone, cream, ink) with ONE restrained accent drawn from the brand color. Avoid loud gradients.',
      'LAYOUT: asymmetric editorial grid, thin hairline rules between sections, oversized section numbers/labels, generous negative space, wide margins.',
      'COMPONENTS: flat cards with hairline borders (no heavy shadows), understated buttons, tasteful pull-quotes.',
      'MOTION: minimal — subtle fade/slide on scroll only.',
    ].join('\n  '),
  },
  {
    id: 'organic-warm',
    name: 'Organic Warm',
    blurb: 'Earthy palette, soft blob shapes, natural and grounding.',
    directives: [
      'AESTHETIC: warm, natural, grounding — holistic/organic wellness. Think earth spa, botanical studio.',
      'TYPOGRAPHY: friendly humanist sans or a soft rounded serif ("DM Serif Display" + "Nunito Sans").',
      'PALETTE: earthy — sage/olive greens, terracotta, sand, warm cream. Derive an earthy version of the brand color; avoid neon.',
      'LAYOUT: organic blob/curved section dividers (SVG wave/blob shapes as inline backgrounds), rounded-3xl cards, overlapping soft shapes.',
      'COMPONENTS: pill buttons, big rounded corners, soft diffuse shadows, leaf/plant emoji or simple inline SVG botanical accents.',
      'MOTION: gentle, calm — slow fades, soft hover lifts.',
    ].join('\n  '),
  },
  {
    id: 'clinical-clean',
    name: 'Clinical Clean',
    blurb: 'Crisp, trustworthy, medical-grade clarity in blues and whites.',
    directives: [
      'AESTHETIC: precise, trustworthy, clinical — modern medical/health-tech. Think One Medical, Ro, Parsley Health.',
      'TYPOGRAPHY: clean neutral sans throughout ("Inter"/"Public Sans"), confident but not flashy, strong weight contrast.',
      'PALETTE: lots of white, cool blues/teals, a single confident accent; crisp and airy.',
      'LAYOUT: tidy 12-col grid, clear card groupings, iconography for services, trust badges, generous but disciplined spacing.',
      'COMPONENTS: solid rounded-xl cards with light borders, clear primary buttons, checkmark lists, subtle dividers.',
      'MOTION: restrained, functional — no decorative animation.',
    ].join('\n  '),
  },
  {
    id: 'bold-gradient',
    name: 'Bold Gradient',
    blurb: 'Vibrant mesh gradients, glassmorphism, high-energy and modern.',
    directives: [
      'AESTHETIC: bold, vibrant, contemporary SaaS-wellness. Think Linear, Stripe, modern fitness apps.',
      'TYPOGRAPHY: big, tight, bold geometric sans ("Space Grotesk"/"Sora"/"Satoshi"-like) with punchy headlines.',
      'PALETTE: rich multi-stop mesh gradients built from the brand primary + accent; dark and light zones for contrast.',
      'LAYOUT: full-bleed gradient hero, glassmorphic cards (backdrop-blur, translucent), floating UI, bento-grid feature blocks.',
      'COMPONENTS: glass cards with subtle inner glow, gradient-filled buttons, glowing focus rings, bento grids.',
      'MOTION: lively but tasteful — parallax-lite, hover glows, gradient shifts.',
    ].join('\n  '),
  },
  {
    id: 'luxe-minimal',
    name: 'Luxe Minimal',
    blurb: 'Near-monochrome, huge type, gallery-like negative space.',
    directives: [
      'AESTHETIC: ultra-minimal luxury — gallery / high-fashion. Think Aesop, COS, Aman resorts.',
      'TYPOGRAPHY: dramatic scale contrast — very large light-weight display headings, tiny uppercase tracked-out labels; one typeface family used across weights.',
      'PALETTE: near-monochrome (off-black, off-white, one grey) with the brand color used sparingly as a single deliberate accent.',
      'LAYOUT: enormous negative space, few elements per viewport, centered or single-column focus, precise alignment.',
      'COMPONENTS: borderless text buttons or thin-outline buttons, no shadows, generous line-height.',
      'MOTION: barely-there — slow reveals only.',
    ].join('\n  '),
  },
  {
    id: 'dark-aura',
    name: 'Dark Aura',
    blurb: 'Dark canvas with neon glow, glass cards, premium spa-tech feel.',
    directives: [
      'AESTHETIC: dark, premium, glowing — modern spa-tech / high-end studio at night.',
      'TYPOGRAPHY: crisp modern sans, light weights on dark, with a glowing accent on key words.',
      'PALETTE: deep near-black/charcoal background, soft neon accent glow derived from the brand accent, subtle gradients.',
      'LAYOUT: dark sections throughout, glowing gradient orbs behind content, glass cards with faint borders.',
      'COMPONENTS: translucent glass cards, glowing buttons, luminous dividers, tasteful spotlight gradients.',
      'MOTION: subtle glow pulses and smooth fades; nothing garish.',
      'ACCESSIBILITY: keep text contrast AA+ on the dark background.',
    ].join('\n  '),
  },
  {
    id: 'neo-retro',
    name: 'Neo-Retro',
    blurb: '70s wellness revival — terracotta, sage, chunky rounded type, playful.',
    directives: [
      'AESTHETIC: nostalgic 70s wellness revival, playful and warm. Think retro California health brand.',
      'TYPOGRAPHY: chunky rounded display ("Poppins"/"Fredoka"/"DM Sans" bold) with retro flair.',
      'PALETTE: 70s wellness — terracotta, mustard, sage, cream, rust; warm and saturated but not garish.',
      'LAYOUT: rounded everything, retro sunburst/arch motifs (inline SVG arches, half-circles), sticker-like badges.',
      'COMPONENTS: thick rounded buttons, arch-topped cards, playful emoji/sticker accents, groovy dividers.',
      'MOTION: bouncy, friendly hover states; keep it smooth.',
    ].join('\n  '),
  },
  {
    id: 'swiss-grid',
    name: 'Swiss Grid',
    blurb: 'Strict grid, confident type, black-and-white with one accent.',
    directives: [
      'AESTHETIC: Swiss/International typographic style — confident, functional, timeless.',
      'TYPOGRAPHY: neo-grotesque sans ("Inter"/"Helvetica Neue"-like), strong sizes, tight leading, uppercase labels.',
      'PALETTE: black + white + ONE strong accent (the brand color); no gradients, no decoration.',
      'LAYOUT: rigid, visible modular grid; large index numbers; left-aligned; generous but structured whitespace; strong baseline rhythm.',
      'COMPONENTS: square/sharp edges, thin rules, minimal buttons, no shadows.',
      'MOTION: none-to-minimal; precision over flourish.',
    ].join('\n  '),
  },
  {
    id: 'soft-pastel',
    name: 'Soft Pastel',
    blurb: 'Calming pastel gradients, soft cards, gentle and feminine.',
    directives: [
      'AESTHETIC: calming, gentle, feminine wellness — think modern yoga/self-care brand.',
      'TYPOGRAPHY: soft rounded sans + an elegant light serif for accents.',
      'PALETTE: soft pastels (blush, lavender, mint, sky) derived from the brand color; low-saturation, airy.',
      'LAYOUT: airy sections, big rounded cards, gentle pastel gradient backgrounds, soft floating shapes.',
      'COMPONENTS: soft neumorphic-lite cards (very subtle shadow), pill buttons, rounded imagery placeholders.',
      'MOTION: gentle floating and soft fades.',
    ].join('\n  '),
  },
  {
    id: 'refined-brutalist',
    name: 'Refined Brutalist',
    blurb: 'Raw borders, mono accents, high-contrast and distinctive.',
    directives: [
      'AESTHETIC: refined neo-brutalism — bold, raw, distinctive but still trustworthy.',
      'TYPOGRAPHY: strong sans headlines + a monospace accent ("Space Mono") for labels/metadata.',
      'PALETTE: high-contrast — off-white canvas, near-black ink, one loud brand accent used decisively.',
      'LAYOUT: visible thick borders, hard-edged cards, offset drop shadows (solid, not blurred), boxy sections.',
      'COMPONENTS: chunky bordered buttons with solid offset shadows, boxed cards, mono tags.',
      'MOTION: snappy hover shifts (translate on hover); keep it crisp.',
    ].join('\n  '),
  },
];

export const DEFAULT_DESIGN_SYSTEM_ID = 'editorial-luxe';

export function getDesignSystem(id) {
  return DESIGN_SYSTEMS.find((d) => d.id === id) || null;
}

/**
 * Pick N distinct design systems. If preferredIds are given they come first (in
 * order), then the rest of the library fills up to `count`. Never returns
 * duplicates; caps at the library size.
 */
export function pickDesignSystems(count = 3, preferredIds = []) {
  const n = Math.max(1, Math.min(count, DESIGN_SYSTEMS.length));
  const chosen = [];
  const seen = new Set();
  for (const id of preferredIds) {
    const ds = getDesignSystem(id);
    if (ds && !seen.has(ds.id)) {
      chosen.push(ds);
      seen.add(ds.id);
    }
  }
  for (const ds of DESIGN_SYSTEMS) {
    if (chosen.length >= n) break;
    if (!seen.has(ds.id)) {
      chosen.push(ds);
      seen.add(ds.id);
    }
  }
  return chosen.slice(0, n);
}

/**
 * Render the directive block injected into the generation prompt for a given
 * design system. Emphasises that OUR template quality leads — the prospect's own
 * (often poor) taste must not drag the design down.
 */
export function renderDesignSystemDirectives(designSystem) {
  const ds = typeof designSystem === 'string' ? getDesignSystem(designSystem) : designSystem;
  if (!ds) return '';
  return [
    `CHOSEN DESIGN SYSTEM: "${ds.name}" — ${ds.blurb}`,
    'Commit FULLY to this design system. It is a cutting-edge, professionally-designed template; do NOT water it down toward a generic wellness look, and do NOT imitate the prospect\'s existing (likely weak) website design.',
    `  ${ds.directives}`,
    'Load any required Google Fonts via a <link> in <head>. Keep it a single self-contained HTML file.',
  ].join('\n');
}
