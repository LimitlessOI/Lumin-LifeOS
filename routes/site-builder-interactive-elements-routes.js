/**
 * SYNOPSIS: Mock database for storing element labels
 */
import express from 'express';

const router = express.Router();

// Mock database for storing element labels
const elementLabels = {};

// Handler to get labels for an element
function getElementLabels(req, res) {
    const { elementId } = req.params;
    const labels = elementLabels[elementId] || [];
    res.json({ labels });
}

// Handler to add a label to an element
function addElementLabel(req, res) {
    const { elementId } = req.params;
    const { label } = req.body;

    if (!elementLabels[elementId]) {
        elementLabels[elementId] = [];
    }

    elementLabels[elementId].push(label);
    res.status(201).json({ message: 'Label added', labels: elementLabels[elementId] });
}

// Handler to remove a label from an element
function removeElementLabel(req, res) {
    const { elementId } = req.params;
    const { label } = req.body;

    if (!elementLabels[elementId]) {
        return res.status(404).json({ message: 'Element not found' });
    }

    elementLabels[elementId] = elementLabels[elementId].filter(l => l !== label);
    res.json({ message: 'Label removed', labels: elementLabels[elementId] });
}

// Register routes for managing element labels
function registerInteractiveElementsRoutes(app) {
    router.get('/elements/:elementId/labels', getElementLabels);
    router.post('/elements/:elementId/labels', addElementLabel);
    router.delete('/elements/:elementId/labels', removeElementLabel);

    app.use('/api', router);
}

export { registerInteractiveElementsRoutes };