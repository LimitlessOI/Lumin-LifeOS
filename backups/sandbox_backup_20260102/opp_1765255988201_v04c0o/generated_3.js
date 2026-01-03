// File: routes/workshops.js ===END FILE===
const express = require('express');
const router = new express.Router();
const crypto = require('crypto'); // UUID generation library
const User = require('../models/User'); // Assuming user model exists for ORM-like operations

router.post('/enroll', async (req, res) => {
    try {
        const workshopId = req.params.workshopId;
        
        if (!req.user || !(await User.exists({ _id: req.user._id }))) return res.status(403).json({ message: 'User not authenticated' }); 
        
        const userRegistration = await Registrations.create({ userId: req.user._id, workshopId: parseInt(workshopId) });
        if (!userRegistration) return res.status(500).json({ message: 'Could not enroll' }); 
        
        // Assuming payment process is handled by a service function after successful user registration and before creating the Registrations document in database (not shown here but should be implemented accordingly)

        res.json({ message: 'Enrolled successfully', workshopId: req.params.workshopId });
    } catch (error) {
        res.status(500).json({ message: error.toString() });
    }
});

router.delete('/cancel/:userId/:workshopId', async (req, res) => {
    try {
        const userRegistration = await Registrations.findOneAndDelete({ _id: req.params.user_id, workshopId: parseInt(req.params.workshopId) }); 
        
        if (!userRegistration || !userRegistration._id) return res.status(404).json({ message: 'User not found or already cancelled' });

        userRegistration.cancelled = true; // Assuming field exists in the Registrations model to mark a cancellation status 
        
        await userRegistration.save();

        res.json({ message: 'Cancelled successfully', workshopId: req.params.workshopId });
    } catch (error) {
        res.status(500).json({ message: error.toString() });
    }
});