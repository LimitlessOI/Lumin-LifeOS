/**
 * SYNOPSIS: services/evaluatorMentorQualification.js
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
// services/evaluatorMentorQualification.js

const qualifications = new Map();

function getQualifications() {
  return Array.from(qualifications.entries());
}

function setQualification(name, qualification) {
  qualifications.set(name, qualification);
}

function getEvaluatorMentorQualifications() {
  return Array.from(qualifications.entries()).filter(([name, qualification]) => qualification.type === 'evaluator' || qualification.type === 'mentor');
}

function updateEvaluatorMentorQualifications(name, newQualification) {
  if (qualifications.has(name)) {
    qualifications.set(name, { ...qualifications.get(name), ...newQualification });
  }
}

function getMentorQualificationCriteria() {
  return {
    education: 'Master\'s degree or higher in a relevant field',
    experience: '5+ years of professional experience in the domain',
    mentorshipExperience: '2+ years of experience mentoring or coaching',
    certifications: ['Certified Professional Mentor (CPM)', 'Relevant industry certifications'],
    softSkills: ['Excellent communication', 'Empathy', 'Active listening', 'Problem-solving'],
    availability: 'Minimum 5 hours/week'
  };
}

export { getQualifications, setQualification, getEvaluatorMentorQualifications, updateEvaluatorMentorQualifications, getMentorQualificationCriteria };
