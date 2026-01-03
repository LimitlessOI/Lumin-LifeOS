const express = require('express');
const router = express.Router();
router.get('/', async (req, res) => {
    try {
        const salesData = await SalesService.listAllSalesWithDetails(req); // Placeholder for actual implementation
        return res.json(salesData);
    } catch (error) {
        console0:res.status(500).send('Internal Server Error');
    }
});
module.exports = router;