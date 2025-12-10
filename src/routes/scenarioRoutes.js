```javascript
const express = require('express');
const { createScenario, getScenario } = require('../controllers/scenarioController');
const validateScenario = require('../validators/scenarioValidator');

const router = express.Router();

router.post('/scenarios', validateScenario, createScenario);
router.get('/scenarios/:id', getScenario);

// Add more routes for update and delete

module.exports = router;
```