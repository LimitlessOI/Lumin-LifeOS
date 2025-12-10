```javascript
const express = require('express');
const router = express.Router();
const aiModelFunnelController = require('../controllers/aiModelFunnelController');

router.post('/', aiModelFunnelController.createAssociation);
router.get('/', aiModelFunnelController.getAssociations);
router.put('/:id', aiModelFunnelController.updateAssociation);
router.delete('/:id', aiModelFunnelController.deleteAssociation);

module.exports = router;
```