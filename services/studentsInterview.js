/**
 * SYNOPSIS: Conduct interviews for 5 students or parents
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
export const interviewFeedback = [];

export function interviewStudentOrParent(studentOrParent) {
  // Simulate an interview process and store feedback
  const feedback = `Feedback for ${studentOrParent}`;
  interviewFeedback.push(feedback);
  return feedback;
}

export function getStudentFeedback() {
  return interviewFeedback;
}

export function addStudentInterview(student, feedback) {
  const interviewRecord = { student, feedback };
  interviewFeedback.push(interviewRecord);
}

export function getStudentInterview(student) {
  return interviewFeedback.find(record => record.student === student);
}

// Conduct interviews for 5 students or parents
interviewStudentOrParent("Student 1");
interviewStudentOrParent("Student 2");
interviewStudentOrParent("Student 3");
interviewStudentOrParent("Parent 1");
interviewStudentOrParent("Parent 2");