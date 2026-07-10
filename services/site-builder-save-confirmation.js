/**
 * SYNOPSIS: Exports buildSaveConfirmation — services/site-builder-save-confirmation.js.
 */
export function buildSaveConfirmation() {
  return {
    savedAt: new Date().toISOString(),
    label: 'Saved',
    icon: 'checkmark',
  };
}

export function formatSaveConfirmationHTML(obj) {
  const savedAt = typeof obj?.savedAt === 'string' ? obj.savedAt : '';
  const date = new Date(savedAt);
  const hhmmss = Number.isNaN(date.getTime())
    ? '00:00:00'
    : date.toISOString().slice(11, 19);

  return `<span class="sb-save-confirm">✓ Saved at ${hhmmss}</span>`;
}