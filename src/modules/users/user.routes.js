const express = require('express');
const { createUser, getUser } = require('./user.controller');
const { userValidationRules } = require('./user.model');

const router = express.Router();

router.post('/users', userValidationRules(), createUser);
router.get('/users/:id', getUser);

module.exports = router;