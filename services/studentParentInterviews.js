/**
 * SYNOPSIS: TGT: services/studentParentInterviews.js
 */
// TGT: services/studentParentInterviews.js
// NOEXP
// NO:CJS

/**
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */

// ESM:EXPORTS
// REQX: interviewStudentsParents
// MUST:EXPORT
// CRIT:DUPEXPORT
// CRIT:PRESERVE
// PROTECTED:FULL
// NOEDIT

const interviewResults = []; // Store results for 5 interviews

/**
 * Conducts a student or parent interview and stores the results.
 * @param {string} participantType - 'student' or 'parent'
 * @param {string} participantId - A unique identifier for the participant
 * @param {object} interviewData - An object containing the interview questions and answers
 * @returns {object} The stored interview result object.
 */
export function interviewStudentsParents(participantType, participantId, interviewData) {
  if (interviewResults.length >= 5) {
    console.warn("Interview limit reached. No more interviews can be stored.");
    // Optionally, implement a strategy for handling overflow (e.g., replace oldest, log and discard)
    // For this task, we'll simply not store if the limit is met.
    return null;
  }

  const result = {
    timestamp: new Date().toISOString(),
    participantType,
    participantId,
    interviewData,
  };

  interviewResults.push(result);
  console.log(`Interview conducted for ${participantType} ${participantId}. Total interviews: ${interviewResults.length}`);
  return result;
}

// OUT:FILE
