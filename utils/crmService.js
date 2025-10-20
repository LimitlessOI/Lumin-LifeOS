const axios = require('axios');
const config = require('../config/config');

exports.updateCRM = async (actions) => {
  try {
    await axios.post(`${config.crmApiUrl}/update`, { actions });
  } catch (error) {
    throw new Error('CRM update failed');
  }
};