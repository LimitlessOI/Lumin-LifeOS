const express = require('express');
const projectController = require('../controllers/projectController');
const developerController = require('../controllers/developerController');
const router = new express.Router();

router.get('/developers', developerController.listDevelopers);
router.post('/projects', projectController.createProject); // This might be a POST to add or update projects, not just create since it's an API gateway route initially for simplicity in this example; adjust as needed based on actual logic required
router.get('/developers/project/:id/statuses', developerController.developerProjectsStatuses);
router.post('/api/v1/system/self-program', Phi3MiniLocal.selfProgramHandler); // Self-programming endpoint for AI to program itself; placeholder function, implement accordingly
router.get('/projects/queued/:title', projectController.listQueuedProjectsByTitle); // Lists queued projects with a specific title parameter 
router.post('/api/v1/system/self-program:statuses', Phi3MiniLocal.updateProjectStatusHandler); // Handles status update for the given API endpoint; implement accordingly in `Phi3MiniLocal` class within local file(s)