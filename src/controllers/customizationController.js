```javascript
const CustomizationService = require('../services/customizationService');

class CustomizationController {
    static async create(req, res) {
        try {
            const customization = await CustomizationService.create(req.body);
            res.status(201).json(customization);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async getAll(req, res) {
        try {
            const customizations = await CustomizationService.getAll();
            res.status(200).json(customizations);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const customization = await CustomizationService.update(req.params.id, req.body);
            res.status(200).json(customization);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            await CustomizationService.delete(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = CustomizationController;
```