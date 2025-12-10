const express = require('express');
const router = express.Router();

router.post('/result', async (req, res) => {
    try {
        const { reviewId, result } = req.body;
        // Process the result (e.g., update database, notify users)
        console.log(`Received result for review ${reviewId}: ${result}`);
        res.send({ success: true });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
});

module.exports = router;