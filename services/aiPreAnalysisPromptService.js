/**
 * SYNOPSIS: services/aiPreAnalysisPromptService.js
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
// services/aiPreAnalysisPromptService.js

/**
 * Generates an AI pre-analysis prompt and processes the result.
 * @param {string} inputData - The data to be analyzed.
 * @returns {string} - The result of the analysis.
 */
export function generatePreAnalysis(inputData) {
    const prompt = writePreAnalysisPrompt(inputData);
    const result = callCouncilMember(prompt);
    return result;
}

/**
 * Creates a pre-analysis prompt string.
 * @param {string} inputData - The data to be included in the prompt.
 * @returns {string} - The formatted pre-analysis prompt.
 */
export function writePreAnalysisPrompt(inputData) {
    return `Please analyze the provided data thoroughly: ${inputData}`;
}

/**
 * Generates and processes a pre-analysis prompt.
 * @param {string} inputData - The data to be analyzed.
 * @returns {string} - The result of the analysis.
 */
export function generatePreAnalysisPrompt(inputData) {
    const prompt = writePreAnalysisPrompt(inputData);
    return callCouncilMember(prompt);
}
