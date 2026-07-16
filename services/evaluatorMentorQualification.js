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

function getEvaluatorMentorCriteria() {
  return {
    evaluator: {
      minExperienceYears: 3,
      requiredSkills: ['assessment', 'feedback'],
    },
    mentor: {
      minExperienceYears: 5,
      requiredSkills: ['guidance', 'mentoring'],
    }
  };
}

export { getQualifications, setQualification, getEvaluatorMentorCriteria };