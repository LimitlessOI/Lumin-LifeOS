```javascript
const express = require('express');
const bodyParser = require('body-parser');
const { validateWearableData, validateEHRData, validateGenomicData } = require('./validators');

const app = express();
app.use(bodyParser.json());

app.post('/ingest/wearables', (req, res) => {
  try {
    const data = req.body;
    validateWearableData(data);
    // Process and store data
    res.status(200).send({ message: 'Wearable data ingested successfully.' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.post('/ingest/ehr', (req, res) => {
  try {
    const data = req.body;
    validateEHRData(data);
    // Process and store data
    res.status(200).send({ message: 'EHR data ingested successfully.' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.post('/ingest/genomics', (req, res) => {
  try {
    const data = req.body;
    validateGenomicData(data);
    // Process and store data
    res.status(200).send({ message: 'Genomic data ingested successfully.' });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.listen(3000, () => console.log('Ingestion service listening on port 3000'));
```