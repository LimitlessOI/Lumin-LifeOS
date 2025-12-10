```javascript
const express = require('express');
const bodyParser = require('body-parser');
const orchestrator = require('./orchestrator/core');
const mlEngine = require('./ml/local-engine');
const setupSyncService = require('./device/sync-service');

const app = express();
app.use(bodyParser.json());

app.use('/orchestrator', orchestrator);
app.use('/ml', mlEngine);

const server = app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

setupSyncService(server);
```