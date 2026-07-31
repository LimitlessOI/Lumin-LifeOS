/**
 * SYNOPSIS: HTTP route module — SalesPageRoute.
 */
import express from 'express';

const router = express.Router();

export const registerSalesPageRoutes = (app) => {
    router.get('/sales', (req, res) => {
        // Placeholder for rendering the sales page
        res.send('Sales Page - All Offers');
    });

    app.use('/', router);
};