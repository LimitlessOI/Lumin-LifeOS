/**
 * SYNOPSIS: Service module — StudentInterviewProcess.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
const students = [
  { name: "John Doe", age: 25 },
  { name: "Jane Smith", age: 28 },
  // ...other students
];

let interviewResults = [];

function conductStudentInterview() {
  // Conduct interviews with 10 prospective adult students
  interviewResults = students.slice(0, 10).map(student => {
    return {
      student,
      outcome: Math.random() > 0.5 ? "pass" : "fail"
    };
  });
}

function getInterviewResults() {
  return interviewResults;
}

function interviewProspectiveStudents() {
  conductStudentInterview();
  return getInterviewResults();
}

export {
  conductStudentInterview,
  getInterviewResults,
  interviewProspectiveStudents
};