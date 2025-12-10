```javascript
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const taskValidation = require('../middlewares/taskValidation');

router.post('/tasks', taskValidation.create, taskController.createTask);
router.get('/tasks', taskController.getTasks);
router.put('/tasks/:id', taskValidation.update, taskController.updateTask);
router.delete('/tasks/:id', taskController.deleteTask);

module.exports = router;
```