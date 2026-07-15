/**
 * SYNOPSIS: services/studentsInterview.js
 */
// services/studentsInterview.js

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

// Conduct interviews for 5 students or parents
interviewStudentOrParent("Student 1");
interviewStudentOrParent("Student 2");
interviewStudentOrParent("Student 3");
interviewStudentOrParent("Parent 1");
interviewStudentOrParent("Parent 2");
