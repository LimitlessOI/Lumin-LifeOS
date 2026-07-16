/**
 * SYNOPSIS: Export consulted professionals for external use if needed.
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
const consultedProfessionals = [
  { name: 'Alice', role: 'Producer' },
  { name: 'Bob', role: 'Manager' }
];

/**
 * Checks if the number of consulted professionals is at least 2.
 * @returns {boolean}
 */
export function checkMusicIndustryConsultations() {
  return consultedProfessionals.length >= 2;
}

/**
 * Adds a new industry consultant to the list.
 * @param {string} name - The name of the consultant.
 * @param {string} role - The role of the consultant.
 */
export function addIndustryConsult(name, role) {
  consultedProfessionals.push({ name, role });
}

/**
 * Retrieves the list of consulted professionals.
 * @returns {Array} List of consulted professionals.
 */
export function getIndustryConsult() {
  return consultedProfessionals;
}

/**
 * Provides details of music industry consultations.
 * @returns {Array} List of consulted professionals with their details.
 */
export function getMusicIndustryConsultation() {
  return consultedProfessionals.map(professional => {
    return `Consulted: ${professional.name}, Role: ${professional.role}`;
  });
}

// Export consulted professionals for external use if needed.
export { consultedProfessionals };
