const express = require('express');
const router = new express.Router();
const TQMController = require('../controllers/TaskQueueManagementController');
router.use(express.json());

/** GET queued tasks */
router.get('/queues/:userId', async (req, res) => {
  try {
    const userTasks = await TQMController.findQueuedTasks({ userId: req.params.userId });
    res.send(userTasks);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  end;
});

/** PUSH task */
router.post('/queues/:userId/tasks', async (req, res) => {
  try {
    const newTask = await TQMController.addToQueue({ userId: req.params.userId }, { ...req.body });
    res.status(201).send(newTask);
  } catch (err) {
    console.error(err);
    res.status(400).send('Bad Request');
  end;
});

/** REMOVE task */
router.delete('/queues/:userId/tasks/:taskId', async (req, res) => {
  try {
    await TQMController.removeTask({ userId: req.params.userId, taskId: req.params.taskId });
    res.status(204).send(); // No content to send back as standard for delete requests in REST APIs
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  end;
});