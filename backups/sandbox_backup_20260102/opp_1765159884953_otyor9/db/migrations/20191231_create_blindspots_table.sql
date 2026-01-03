CREATE TABLE IF NOT EXISTS blindspots (
    id SERIAL PRIMARY KEY,
    date DATE CHECK(date >= CURRENT_DATE - INTERVAL '7 days') -- Only look back 7 days for relevancy
);
```
### API Endpoints (Express.js routes) ###
```javascript
===FILE:routes/api.js===
const express = require('express');
const router = new express.Router();
// ... complete file content including all necessary imports and endpoints...
export default router; // Exporting the Router for use in other files, e.g., server setup files or frontend code that consumes this API (if any).