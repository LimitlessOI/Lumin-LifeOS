/**
 * SYNOPSIS: Handler to get all students
 */
import express from 'express';

const router = express.Router();

// Handler to get all students
function getAllStudents(req, res) {
  // Logic to retrieve all students
  res.send('Retrieve all students');
}

// Handler to get a student by ID
function getStudentById(req, res) {
  const { id } = req.params;
  // Logic to retrieve a student by id
  res.send(`Retrieve student with ID: ${id}`);
}

// Handler to create a new student
function createStudent(req, res) {
  const { name, age } = req.body;
  // Logic to create a new student
  res.send(`Create a new student with name: ${name}, age: ${age}`);
}

// Handler to update a student by ID
function updateStudent(req, res) {
  const { id } = req.params;
  const { name, age } = req.body;
  // Logic to update a student by id
  res.send(`Update student with ID: ${id}, name: ${name}, age: ${age}`);
}

// Handler to delete a student by ID
function deleteStudent(req, res) {
  const { id } = req.params;
  // Logic to delete a student by id
  res.send(`Delete student with ID: ${id}`);
}

// Register student routes
function registerStudentsRoutes(app) {
  router.get('/students', getAllStudents);
  router.get('/students/:id', getStudentById);
  router.post('/students', createStudent);
  router.put('/students/:id', updateStudent);
  router.delete('/students/:id', deleteStudent);

  app.use('/api', router);
}

export { registerStudentsRoutes };