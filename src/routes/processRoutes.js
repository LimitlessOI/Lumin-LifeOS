```javascript
const express = require('express');
const processController = require('../controllers/processController');

const router = express.Router();

router.post('/', processController.createProcess);
router.get('/:id', processController.getProcess);
router.put('/:id', processController.updateProcess);
router.delete('/:id', processController.deleteProcess);

module.exports = router;
```