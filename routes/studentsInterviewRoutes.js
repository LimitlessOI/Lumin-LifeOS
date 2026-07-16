/**
 * SYNOPSIS: HTTP route module — StudentsInterviewRoutes.
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function getInterviews(req, res) {
  res.send('Get list of student interviews');
}

function createInterview(req, res) {
  res.send('Create a new student interview');
}

function getInterviewById(req, res) {
  res.send(`Get student interview with ID ${req.params.id}`);
}

function updateInterview(req, res) {
  res.send(`Update student interview with ID ${req.params.id}`);
}

function deleteInterview(req, res) {
  res.send(`Delete student interview with ID ${req.params.id}`);
}

function registerStudentsInterviewRoutes(app) {
  app.use('/api/interviews', router);
}

router.get('/', getInterviews);
router.post('/', createInterview);
router.get('/:id', getInterviewById);
router.put('/:id', updateInterview);
router.delete('/:id', deleteInterview);

export { registerStudentsInterviewRoutes };