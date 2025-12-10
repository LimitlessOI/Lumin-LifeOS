```javascript
const axios = require('axios');

const privacyProxy = async (url, method, data = {}, headers = {}) => {
  try {
    const response = await axios({
      url,
      method,
      data,
      headers,
    });
    return response.data;
  } catch (error) {
    console.error('Error in privacy proxy: ', error);
    throw new Error('Error in external API call');
  }
};

module.exports = privacyProxy;
```