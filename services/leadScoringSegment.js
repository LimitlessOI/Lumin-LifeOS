/**
 * SYNOPSIS: Attaches a scoring rubric to a lead segment description.
 * Attaches a scoring rubric to a lead segment description.
 * @param {string} segmentDescription - The description of the lead segment.
 * @param {object} rubric - The scoring rubric to attach.
 * @returns {object} An object containing the segment description and its attached rubric.
 */
export const applyScoringRubric = (segmentDescription, rubric) => {
  return {
    segmentDescription,
    rubric,
  };
};