```javascript
const { adaptContent } = require('../services/content-service/adaptation_logic');
const { expect } = require('chai');

describe('Content Adaptation Logic', () => {
    it('should adapt content based on user preferences', async () => {
        const userId = 1;
        const adaptedContent = await adaptContent(userId);
        expect(adaptedContent).to.be.an('array');
    });
});
```