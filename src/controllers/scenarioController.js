```javascript
const Scenario = require('../models/Scenario');
const { validationResult } = require('express-validator');

exports.createScenario = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { title, description } = req.body;
        const scenario = await Scenario.create({
            data: {
                title,
                description,
                user_id: req.user.id
            }
        });
        res.status(201).json(scenario);
    } catch (error) {
        console.error('Error creating scenario:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getScenario = async (req, res) => {
    try {
        const scenario = await Scenario.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!scenario) {
            return res.status(404).json({ message: 'Scenario not found' });
        }
        res.json(scenario);
    } catch (error) {
        console.error('Error retrieving scenario:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add update and delete logic as needed
```