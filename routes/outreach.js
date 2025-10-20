const express = require('express');
const { collectLeads } = require('../controllers/outreachController');

const router = express.Router();

router.post('/collect-leads', collectLeads);

module.exports = router;
