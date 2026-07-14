/**
 * SYNOPSIS: Site Builder design-system library — runtime wrapper around the shared Design Studio.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 *
 * Site Builder design-system library.
 *
 * A curated set of distinct, research-backed visual directions the generator can
 * build a site in. The prospect's own website usually has POOR design taste, so
 * we do NOT let their site drive the look — these are OUR templates, each a
 * strong, modern aesthetic. The client can toggle between variants on the
 * preview until they find the one they love.
 *
 * Each entry is a design system from `config/design-studio.js` that is injected
 * into the generation prompt as a complete spec (tokens, typography, layout,
 * components, motifs, anti-patterns, and section blueprint). Content stays
 * truthful and identical across variants; the art direction changes.
 */

import {
  DESIGN_SYSTEMS,
  DEFAULT_DESIGN_SYSTEM_ID,
  buildDesignSystemPrompt,
  getDesignSystem as getDesignSystemFromStudio,
  pickDesignSystems as pickDesignSystemsFromStudio,
  getDesignSystemCss,
  getDesignSystemFontLinks,
} from '../config/design-studio.js';

export { DESIGN_SYSTEMS, DEFAULT_DESIGN_SYSTEM_ID, getDesignSystemCss, getDesignSystemFontLinks };
export const getDesignSystem = getDesignSystemFromStudio;
export const pickDesignSystems = pickDesignSystemsFromStudio;

/**
 * Render the design-system directive block injected into the generation prompt.
 * Emphasises that OUR template quality leads — the prospect's own (often poor)
 * taste must not drag the design down.
 */
export function renderDesignSystemDirectives(designSystem, brandInfo = {}) {
  const ds = typeof designSystem === 'string' ? getDesignSystem(designSystem) : designSystem;
  if (!ds) return '';
  const prompt = buildDesignSystemPrompt(ds, {
    businessName: brandInfo.businessName,
    industry: brandInfo.industry,
  });
  return [
    `CHOSEN DESIGN SYSTEM: "${ds.name}" — ${ds.blurb}`,
    'Commit FULLY to this design system. It is a cutting-edge, professionally-designed template; do NOT water it down toward a generic wellness look, and do NOT imitate the prospect\'s existing (likely weak) website design.',
    prompt,
    'Load the listed Google Fonts via <link> tags in <head> and include the mandatory CSS style block so the design tokens work. Keep it a single self-contained HTML file.',
  ].join('\n');
}
