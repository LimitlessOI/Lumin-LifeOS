const express = require('express');
const router = express.Router();
// Code for user-game interactions API endpoints (POST /user_session) ... 

module.exports = { createUserInteraction: async function(req, res) { /* logic to record a new interaction */ }, getAllUserSessionDataForAnalytics: async function() { /* fetch all the sessions and return them as response with HTTP GET request */ } };