// routes.js
const express = require('express');
const vapiWebhookHandler = require('./vapiWebhookHandler');
const crmUI = require('./crmUI');

const router = express.Router();

router.use(vapiWebhookHandler);
router.use(crmUI);

module.exports = router;