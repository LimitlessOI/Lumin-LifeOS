```javascript
const nlpProcessor = require('../services/nlp-processor');

test('NLP Processor should return sentiment', async () => {
    const message = 'I love this product!';
    const sentiment = await nlpProcessor.processMessage(message);
    expect(sentiment).toBe('positive');
});
```