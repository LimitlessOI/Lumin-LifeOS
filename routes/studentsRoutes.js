/**
 * SYNOPSIS: HTTP route module — StudentsRoutes.
 */
import express from 'express';

const router = express.Router();

export const registerStudentsRoutes = (app) => {
  app.use('/api/students', router);

  router.post('/', (req, res) => {
    // Logic to create a new student
    res.status(201).send('Create new student');
  });

  router.get('/', (req, res) => {
    // Logic to get all students
    res.status(200).send('Get all students');
  });

  router.get('/:id', (req, res) => {
    // Logic to get a student by ID
    res.status(200).send(`Get student with ID: ${req.params.id}`);
  });

  router.put('/:id', (req, res) => {
    // Logic to update a student by ID
    res.status(200).send(`Update student with ID: ${req.params.id}`);
  });

  router.delete('/:id', (req, res) => {
    // Logic to delete a student by ID
    res.status(200).send(`Delete student with ID: ${req.params.id}`);
  });
};