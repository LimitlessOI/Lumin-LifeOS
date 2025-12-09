```javascript
const { processSensorData } = require('../services/agriculture/ai-processor');

async function runPipeline() {
    try {
        await processSensorData();
        console.log('Data pipeline executed successfully');
    } catch (error) {
        console.error('Error in data pipeline:', error);
    }
}

runPipeline();
```