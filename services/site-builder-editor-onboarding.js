/**
 * SYNOPSIS: Exports labelPalette — services/site-builder-editor-onboarding.js.
 */
export const CHAT_WELCOME =
  'Hi! Tell me what to change — like “make the header bigger”, “use calmer colors”, or “add a booking button” — and I’ll update your site.';

export const PALETTE_LABELS = Object.freeze({
  calm: 'Calm',
  bright: 'Bright',
  elegant: 'Elegant',
  clinical: 'Clinical',
  warm: 'Warm',
});

const FALLBACK_LABELS = new Map(
  Object.entries(PALETTE_LABELS).map(([key, label]) => [key.toLowerCase(), label]),
);

function toPlainText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function labelPalette(palette) {
  const raw = toPlainText(palette);
  if (!raw) return raw;

  const direct = FALLBACK_LABELS.get(raw.toLowerCase());
  if (direct) return direct;

  const normalized = raw
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized) {
    const mapped = FALLBACK_LABELS.get(normalized);
    if (mapped) return mapped;
  }

  return raw;
}

export const EDITOR_FIRST_STEPS = Object.freeze([
  'Pick a look up top',
  'Click any text to edit it',
  'Ask the assistant on the right for changes',
  'Hit Publish when you love it',
]);

const editorOnboardingCopy = Object.freeze({
  CHAT_WELCOME,
  PALETTE_LABELS,
  labelPalette,
  EDITOR_FIRST_STEPS,
});

export default editorOnboardingCopy;