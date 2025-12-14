```javascript
const express = require('express');
const CustomizationController = require('../controllers/customizationController');
const validateCustomization = require('../middleware/validateCustomization');

const router = express.Router();

router.post('/', validateCustomization, CustomizationController.create);
router.get('/', CustomizationController.getAll);
router.put('/:id', validateCustomization, CustomizationController.update);
router.delete('/:id', CustomizationController.delete);

module.exports = router;
```