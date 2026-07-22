/**
 * SYNOPSIS: Existing code in services/site-builder-new-template-choices.js
 */
// Existing code in services/site-builder-new-template-choices.js

// Initialize template choices
let templateChoices = [];

// Function to get available template choices
export function getTemplateChoices() {
    return templateChoices;
}

// Function to add a new template choice
export function addTemplateChoice(newChoice) {
    if (!templateChoices.includes(newChoice)) {
        templateChoices.push(newChoice);
    }
}
