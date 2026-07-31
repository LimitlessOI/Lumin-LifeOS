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

/**
 * SYNOPSIS: Retrieves a predefined scoring rubric for a given segment.
 * This method could be extended to fetch rubrics from a database or a configuration service.
 * For now, it provides a hardcoded example.
 * @param {string} segmentName - The name of the lead segment to retrieve the rubric for.
 * @returns {object|null} The scoring rubric object, or null if not found.
 */
export const getScoringRubric = (segmentName) => {
  const rubrics = {
    'High-Value Customer': {
      demographics: {
        age: { '25-45': 10 },
        income: { '>75k': 15 },
      },
      behavior: {
        websiteVisits: { '>10': 8 },
        purchaseHistory: { 'active': 12 },
      },
    },
    'New Prospect': {
      demographics: {
        age: { '18-24': 5 },
      },
      behavior: {
        websiteVisits: { '1-3': 3 },
      },
    },
  };
  return rubrics[segmentName] || null;
};

/**
 * SYNOPSIS: Defines a scoring rubric for lead segments.
 * This function encapsulates the structure of a scoring rubric.
 * @param {string} name - The name of the rubric.
 * @param {object} criteria - An object defining the scoring criteria (e.g., demographics, behavior).
 * @returns {object} A structured scoring rubric object.
 */
export const defineScoringRubric = (name, criteria) => {
  return {
    name,
    criteria,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};