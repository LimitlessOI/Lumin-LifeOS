/**
 * SYNOPSIS: Existing code
 */
// Existing code
function formatLabel(source, traditionLens, adaptation) {
  return `Source: ${source}, Tradition Lens: ${traditionLens}, Adaptation: ${adaptation}`;
}

export function labelOutput(source, traditionLens, adaptation) {
  const formattedLabel = formatLabel(source, traditionLens, adaptation);
  return `Output Label: ${formattedLabel}`;
}

export { formatLabel };
