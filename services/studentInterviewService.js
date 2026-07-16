/**
 * SYNOPSIS: services/studentInterviewService.js
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
// services/studentInterviewService.js

// Function to conduct interviews with 10 students
export function conductStudentInterviews() {
  const students = Array(10).fill().map((_, index) => ({
    id: index + 1,
    name: `Student ${index + 1}`,
    interviewConducted: false,
    interviewData: null,
  }));

  students.forEach(student => {
    // Simulate conducting an interview
    student.interviewConducted = true;
    student.interviewData = `Interview data for ${student.name}`;
  });

  return students;
}

// Function to get a summary of the interviews
export function getStudentInterviewSummary(students) {
  return students.map(({ id, name, interviewConducted }) => ({
    id,
    name,
    interviewConducted,
  }));
}
