/**
 * SYNOPSIS: Exports labelOutput — services/sourceLabelService.js.
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */
function formatLabel(source, traditionLens, adaptation) {
  return `Source: ${source}, Tradition Lens: ${traditionLens}, Adaptation: ${adaptation}`;
}

export function labelOutput(source, traditionLens, adaptation) {
  const formattedLabel = formatLabel(source, traditionLens, adaptation);
  return `Output Label: ${formattedLabel}`;
}

export { formatLabel };