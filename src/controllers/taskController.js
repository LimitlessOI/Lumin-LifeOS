```javascript
const Task = require('../models/Task');
const TaskActivity = require('../models/TaskActivity');

const createTask = async (req, res) => {
  try {
    const task = await Task.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll();
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Task.update(req.body, {
      where: { id: id }
    });
    if (updated) {
      const updatedTask = await Task.findOne({ where: { id: id } });
      res.status(200).json(updatedTask);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Task.destroy({ where: { id: id } });
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
};
```