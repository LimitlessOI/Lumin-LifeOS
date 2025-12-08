```javascript
const express = require('express');
const { translateText } = require('../../services/translation/engine/translationService');

const router = express.Router();

router.post('/translate', async (req, res) => {
    const { text, sourceLang, targetLang } = req.body;
    try {
        const translation = await translateText(text, sourceLang, targetLang);
        res.json({ translation });
    } catch (error) {
        res.status(500).json({ error: 'Translation failed' });
    }
});

module.exports = router;
```