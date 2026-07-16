/**
 * SYNOPSIS: services/mentorQualification.js
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
// services/mentorQualification.js

// Existing code and imports if any
// (Please ensure to preserve them if present)

// Sample data representing qualification criteria
const mentorQualificationCriteria = {
  experience: 5, // years
  skills: ['JavaScript', 'Node.js', 'React'],
  certifications: ['Certified Mentor', 'Leadership Training'],
};

// Function to get the current mentor qualification criteria
export function getMentorQualificationCriteria() {
  return mentorQualificationCriteria;
}

// Function to update the mentor qualification criteria
export function updateMentorQualificationCriteria(newCriteria) {
  Object.assign(mentorQualificationCriteria, newCriteria);
}
