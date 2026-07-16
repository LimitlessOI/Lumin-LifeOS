/**
 * SYNOPSIS: Exports labelOutput — services/sourceLabelService.js.
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */
[
  {"op": "replace", "path": "/formatLabel", "value": "function formatLabel(source, traditionLens, adaptation) {\n  const traditionProfile = traditionProfileModel(traditionLens, 'default');\n  return `Source: ${source}, Tradition Lens: ${traditionProfile}, Adaptation: ${adaptation}`;\n}"},
  {"op": "add", "path": "/traditionProfileModel", "value": "function traditionProfileModel(tradition, profile) {\n  return `${tradition}-${profile}`;\n}"},
  {"op": "add", "path": "/sourceLabelingEngine", "value": "function sourceLabelingEngine(source, tradition, profile) {\n  const traditionProfile = traditionProfileModel(tradition, profile);\n  return `TraditionProfile:${traditionProfile}::Source:${source}`;\n}"},
  {"op": "replace", "path": "/labelOutput", "value": "export function labelOutput(source, traditionLens, adaptation) {\n  const formattedLabel = formatLabel(source, traditionLens, adaptation);\n  return `Output Label: ${formattedLabel}`;\n}"},
  {"op": "replace", "path": "/labelSource", "value": "export function labelSource(source, tradition, profile) {\n  const labeled = sourceLabelingEngine(source, tradition, profile);\n  return `Source Label: ${labeled}`;\n}"}
]
