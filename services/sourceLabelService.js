/**
 * SYNOPSIS: Exports labelOutput, labelSource, formatLabel, traditionProfileModel, and sourceLabelingEngine for source/tradition labeling.
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */

export function traditionProfileModel(tradition, profile = 'default') {
  return `${tradition}-${profile}`;
}

export function formatLabel(source, traditionLens, adaptation) {
  const traditionProfile = traditionProfileModel(traditionLens, 'default');
  return `Source: ${source}, Tradition Lens: ${traditionProfile}, Adaptation: ${adaptation}`;
}

export function sourceLabelingEngine(source, tradition, profile) {
  const traditionProfile = traditionProfileModel(tradition, profile);
  return `TraditionProfile:${traditionProfile}::Source:${source}`;
}

export function labelOutput(source, traditionLens, adaptation) {
  const formattedLabel = formatLabel(source, traditionLens, adaptation);
  return `Output Label: ${formattedLabel}`;
}

export function labelSource(source, tradition, profile) {
  const labeled = sourceLabelingEngine(source, tradition, profile);
  return `Source Label: ${labeled}`;
}
