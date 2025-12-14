```javascript
const express = require('express');
const lessonController = require('../controllers/lessonController');
const lessonAccess = require('../middleware/lessonAccess');

const router = express.Router();

router.post('/lessons', lessonAccess, lessonController.createLesson);
router.get('/lessons', lessonController.getLessons);
router.get('/lessons/:id', lessonController.getLesson);
router.put('/lessons/:id', lessonAccess, lessonController.updateLesson);
router.delete('/lessons/:id', lessonAccess, lessonController.deleteLesson);

module.exports = router;
```