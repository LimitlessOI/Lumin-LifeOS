const express = require('express');
const router = express.Router();
const { collectLeads } = require('../controllers/outreachController');

router.post('/collect-leads', collectLeads);

module.exports = router;