/**
 * SYNOPSIS: HTTP route module — Site Builder Additional Templates Routes.
 */
import express from 'express';

const router = express.Router();

function registerAdditionalTemplateRoutes(app) {
    app.use('/additional-templates', router);
}

router.get('/', (req, res) => {
    res.send('List of additional templates');
});

router.get('/:templateId', (req, res) => {
    const { templateId } = req.params;
    res.send(`Details of template ${templateId}`);
});

export { registerAdditionalTemplateRoutes };
