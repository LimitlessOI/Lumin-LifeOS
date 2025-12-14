const express = require('express');
const funnelController = require('./funnelController');
const funnelAuth = require('./middleware/funnelAuth');

const router = express.Router();

router.post('/funnels', funnelAuth, funnelController.createFunnel);
router.put('/funnels/:id', funnelAuth, funnelController.updateFunnel);
router.get('/funnels/:id', funnelAuth, funnelController.getFunnel);
router.post('/funnels/steps', funnelAuth, funnelController.addFunnelStep);
router.post('/funnels/interactions', funnelController.logInteraction);

module.exports = router;
//