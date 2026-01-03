// File: api/routes/index.js
const express = require('express');
const router = new express.Router();
require('dotenv').config();

router.post('/users/login', loginController); // Assuming JWT token generation logic is in the controller `loginController`
router.post('/reviews/new-request', reviewRequestController, upload: ['code']]); 
// More routes as needed for other functionalities like submitting code snippets or diffs...
module.exports = router;