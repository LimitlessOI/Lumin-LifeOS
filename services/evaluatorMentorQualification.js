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

export { getQualifications, setQualification };
