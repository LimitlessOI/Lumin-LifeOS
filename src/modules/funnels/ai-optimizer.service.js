```javascript
const axios = require('axios');

exports.getAIInsights = async (funnelId) => {
    try {
        const response = await axios.post('https://robust-magic-production.up.railway.app/api/v1/system/insights', { funnelId });
        return response.data;
    } catch (error) {
        console.error('Error fetching AI insights:', error);
        throw new Error('AI service error');
    }
};
```