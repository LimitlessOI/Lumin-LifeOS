```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const clientController = require('../controllers/clientController');

// CRUD routes for clients
router.post('/', authMiddleware, clientController.createClient);
router.get('/', authMiddleware, clientController.getClients);
router.get('/:id', authMiddleware, clientController.getClientById);
router.put('/:id', authMiddleware, clientController.updateClient);
router.delete('/:id', authMiddleware, clientController.deleteClient);

module.exports = router;
```