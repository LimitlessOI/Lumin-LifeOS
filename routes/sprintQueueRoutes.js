/**
 * SYNOPSIS: Mock data
 */
import express from 'express';

const router = express.Router();

// Mock data
let sprintQueue = [];

// Get all sprint queue items
function getSprintQueue(req, res) {
  res.json(sprintQueue);
}

// Add a new item to the sprint queue
function addSprintQueueItem(req, res) {
  const newItem = req.body;
  sprintQueue.push(newItem);
  res.status(201).json(newItem);
}

// Update an item in the sprint queue
function updateSprintQueueItem(req, res) {
  const { id } = req.params;
  const updatedItem = req.body;
  const index = sprintQueue.findIndex(item => item.id === id);

  if (index !== -1) {
    sprintQueue[index] = updatedItem;
    res.json(updatedItem);
  } else {
    res.status(404).json({ message: 'Item not found' });
  }
}

// Delete an item from the sprint queue
function deleteSprintQueueItem(req, res) {
  const { id } = req.params;
  const index = sprintQueue.findIndex(item => item.id === id);

  if (index !== -1) {
    sprintQueue.splice(index, 1);
    res.status(204).end();
  } else {
    res.status(404).json({ message: 'Item not found' });
  }
}

router.get('/sprint-queue', getSprintQueue);
router.post('/sprint-queue', addSprintQueueItem);
router.put('/sprint-queue/:id', updateSprintQueueItem);
router.delete('/sprint-queue/:id', deleteSprintQueueItem);

function registerSprintQueueRoutes(app) {
  app.use('/api', router);
}

export { registerSprintQueueRoutes };
