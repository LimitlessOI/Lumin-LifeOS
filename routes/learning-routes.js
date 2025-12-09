```javascript
const express = require('express');
const router = express.Router();

router.use('/dna', require('../services/learning-dna-engine/index'));
router.use('/mentor', require('../services/ai-mentor-service/mentor'));
router.use('/projects', require('../services/micro-project-marketplace/handler'));
router.use('/credentials', require('../services/blockchain-credentials/issuer'));
router.use('/blind-spots', require('../services/blind-spot-detector/analyzer'));

module.exports = router;
```