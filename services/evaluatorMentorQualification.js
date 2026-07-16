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

export { getQualifications, setQualification, getEvaluatorMentorQualifications, updateEvaluatorMentorQualifications };
