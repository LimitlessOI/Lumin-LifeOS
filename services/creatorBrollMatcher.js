/**
 * SYNOPSIS: Existing code: Please ensure all existing code and exports are preserved.
 */
// Existing code: Please ensure all existing code and exports are preserved.

export function matchBroll(script, brollLibrary) {
  const words = script.split(/\s+/);
  const matchedBroll = [];

  words.forEach(word => {
    if (brollLibrary[word]) {
      matchedBroll.push(brollLibrary[word]);
    }
  });

  return matchedBroll;
}
