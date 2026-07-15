/**
 * SYNOPSIS: Handler to get all curriculum
 */
import express from 'express';

const router = express.Router();

// Handler to get all curriculum
function getAllCurriculum(req, res) {
  res.send('Get all curriculum');
}

// Handler to get a specific curriculum by ID
function getCurriculumById(req, res) {
  const { id } = req.params;
  res.send(`Get curriculum with ID: ${id}`);
}

// Handler to create a new curriculum
function createCurriculum(req, res) {
  res.send('Create a new curriculum');
}

// Handler to update a curriculum by ID
function updateCurriculum(req, res) {
  const { id } = req.params;
  res.send(`Update curriculum with ID: ${id}`);
}

// Handler to delete a curriculum by ID
function deleteCurriculum(req, res) {
  const { id } = req.params;
  res.send(`Delete curriculum with ID: ${id}`);
}

// Register all curriculum routes
function registerCurriculumRoutes(app) {
  router.get('/curriculum', getAllCurriculum);
  router.get('/curriculum/:id', getCurriculumById);
  router.post('/curriculum', createCurriculum);
  router.put('/curriculum/:id', updateCurriculum);
  router.delete('/curriculum/:id', deleteCurriculum);

  app.use('/api', router);
}

export { registerCurriculumRoutes };
