/**
 * SYNOPSIS: Exports addStudent — services/students.js.
 */
const students = [];

export function addStudent(student) {
  students.push(student);
}

export function getStudents() {
  return students;
}
