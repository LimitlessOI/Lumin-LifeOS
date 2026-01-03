```javascript
const express = require('express');
const router = new express.Router();

router.post('/login', async (req, res) => {
    // Authentication logic here...
});

router.post('/register', async (req, res) => {
    // Registration logic here...
});

module.exports = router;
```