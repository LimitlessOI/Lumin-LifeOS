/**
 * SYNOPSIS: Exports getTemplateChoices — services/site-builder-more-template-choices.js.
 */
const templateChoices = [
  { id: 1, name: 'Modern' },
  { id: 2, name: 'Classic' },
  { id: 3, name: 'Minimalist' },
];

export function getTemplateChoices() {
  return templateChoices;
}

export function addTemplateChoice(newChoice) {
  if (newChoice && newChoice.id && newChoice.name) {
    const exists = templateChoices.some(choice => choice.id === newChoice.id);
    if (!exists) {
      templateChoices.push(newChoice);
    }
  }
}
