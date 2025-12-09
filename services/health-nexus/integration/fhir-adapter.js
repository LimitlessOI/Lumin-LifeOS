```javascript
const axios = require('axios');

async function convertToFHIR(data) {
  // Conversion logic to FHIR format
  return {
    resourceType: 'Patient',
    ...data // Modify according to FHIR structure
  };
}

async function sendToEHRSystem(fhirData) {
  try {
    const response = await axios.post('https://ehr.example.com/fhir', fhirData);
    return response.data;
  } catch (error) {
    throw new Error('Failed to send data to EHR system: ' + error.message);
  }
}

module.exports = { convertToFHIR, sendToEHRSystem };
```