```javascript
const request = require('supertest');
const app = require('../app'); // Assuming the Express app is exported from app.js
const assert = require('assert');

describe('Mental Health API Integration Tests', () => {
  it('should process CBT session', async () => {
    const response = await request(app)
      .post('/api/process-session')
      .send({ type: 'CBT', sessionData: 'Sample session data for CBT' });
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.text, 'Session processed');
  });

  it('should detect crisis', async () => {
    const response = await request(app)
      .post('/api/detect-crisis')
      .send({ conversation: 'Sample conversation that may indicate crisis' });
    
    assert.strictEqual(response.status, 200);
    assert.ok(response.text.includes('crisis')); // Assuming the response contains the word 'crisis'
  });

  it('should sync wearable data', async () => {
    const response = await request(app)
      .post('/api/sync-wearable')
      .send();
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.text, 'Wearable data synchronized');
  });
});
```