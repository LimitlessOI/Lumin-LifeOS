const express = require('express');
const router = express.Router();
const capsuleService = require('../services/capsule-storage');

// Create a new capsule
router.post('/', async (req, res) => {
    const { title, content, category } = req.body;
    const newCapsule = await capsuleService.createCapsule(title, content, category);
    res.status(201).json(newCapsule);
});

// Read all capsules
router.get('/', async (req, res) => {
    const capsules = await capsuleService.getAllCapsules();
    res.status(200).json(capsules);
});

// Update a capsule
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content, category } = req.body;
    const updatedCapsule = await capsuleService.updateCapsule(id, title, content, category);
    res.status(200).json(updatedCapsule);
});

// Delete a capsule
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    await capsuleService.deleteCapsule(id);
    res.status(204).send();
});

// Search capsules
router.get('/search', async (req, res) => {
    const { query } = req.query;
    const results = await capsuleService.searchCapsules(query);
    res.status(200).json(results);
});

module.exports = router;