```javascript
const axios = require('axios');

async function fetchERPData(erpType) {
    let url = '';
    switch (erpType) {
        case 'SAP':
            url = 'https://sap.api.endpoint';
            break;
        case 'Oracle':
            url = 'https://oracle.api.endpoint';
            break;
        case 'MicrosoftDynamics':
            url = 'https://dynamics.api.endpoint';
            break;
        default:
            throw new Error('Unsupported ERP type');
    }

    const response = await axios.get(url);
    return response.data;
}

module.exports = { fetchERPData };
```