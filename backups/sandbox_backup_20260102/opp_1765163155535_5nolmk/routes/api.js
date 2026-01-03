const express = require('express');
const router = new express.Router();

router.post('/user', async (req, res) => {
    const userExists = await User.findOne({ username: req.body.username });
    if (!userExists) {
        const result = await User.create(req.body);
        res.status(201).send(result);
    } else {
        return res.status(409).send('User already exists');
    }
});

router.get('/game/:id/overlay', async (req, res) => {
    const userId = await User.findById(req.user._id); // Assuming req.user is set by a middleware that authenticates and populates the request object with current user data from session or tokens
    if (!userId) return res.status(401).send('Unauthorized');
    
    const overlayData = await OverlayModel.find({ game_id: req.params.id, user_id: userId.user_id }); // Assuming an instance of the Overlay model has been created and exported from another file using Mongoose or similar ODM for MongoDB interaction
    if (!overlayData) return res.status(404).send('Overlays not found');
    
    res.json(overlayData); // Respond with relevant overlay data
});