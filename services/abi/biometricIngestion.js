const axios = require('axios');
const UserBiometricProfile = require('../../models/userBiometricProfiles');

async function fetchBiometricData(userId, provider) {
  // Mock API request to a wearable device service
  let data;
  try {
    if (provider === 'oura') {
      const response = await axios.get(`https://api.ouraring.com/v1/userinfo?user_id=${userId}`);
      data = response.data;
    }
    // Add more providers as needed
    // Process and save data into the database
    await UserBiometricProfile.update({ heartRate: data.heartRate }, { where: { userId } });
  } catch (error) {
    console.error(`Error fetching biometric data: ${error.message}`);
  }
}

module.exports = { fetchBiometricData };