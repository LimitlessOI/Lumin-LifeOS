/**
 * SYNOPSIS: services/modelAgnosticDesign.js
 */
// services/modelAgnosticDesign.js

export function ensureModelAgnostic(currentModel, modelRegistry) {
    if (!modelRegistry || typeof modelRegistry !== 'object') {
        throw new Error('A valid model registry must be provided');
    }

    const fallbackModel = modelRegistry.default;
    const model = modelRegistry[currentModel] || fallbackModel;

    if (!model) {
        throw new Error(`Model not found: ${currentModel}`);
    }

    return model;
}
