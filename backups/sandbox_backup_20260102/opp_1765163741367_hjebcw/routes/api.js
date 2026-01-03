const express = require('express');
const router = new express.Router();
// Other necessary imports...

router.get('/campaigns', async function(req, res, next) {
    try {
        const campaignsData = await getCampaignsByStatusAndDemographic({ status: 'active', demographics: req.query.demographics }); // Example query parameter usage for filtering by age and location
        return res.json(campaignsData);
    } catch (error) {
        next(error);
    }
});

router.post('/users', async function(req, res) {
    try {
        const newUser = await User.create(req.body); // Assuming a user model exists with appropriate fields and validations
        return res.status(201).json(newUser);
    } catch (error) {
        next(error);
    }
});

router.put('/offers/:offer_id', async function(req, res) {
    try {
        await Offer.findByIdAndUpdate(req.params.offer_id, req.body, { new: true }); // Assuming an offer model exists with appropriate fields and validations
        return res.status(200).json({ message: 'Offer updated successfully.' });
    } catch (error) {
        next(error);
    }
});