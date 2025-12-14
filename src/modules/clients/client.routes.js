```javascript
const express = require('express');
const clientController = require('./client.controller');
const clientValidators = require('./client.validators');
const clientAuth = require('./middleware/client.auth');

const router = express.Router();

router.post(
  '/',
  clientAuth,
  clientValidators.validateCreateClient,
  clientController.createClient
);
router.get('/:id', clientAuth, clientController.getClient);
router.put(
  '/:id',
  clientAuth,
  clientValidators.validateUpdateClient,
  clientController.updateClient
);
router.delete('/:id', clientAuth, clientController.deleteClient);

module.exports = router;
```