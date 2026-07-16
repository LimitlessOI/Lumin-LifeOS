/**
 * SYNOPSIS: Service module — VapiAccountCreationService.
 * @ssot docs/products/ai-receptionist/PRODUCT_HOME.md
 */
import fetch from 'node-fetch';

async function createVapiAccount(userData) {
  try {
    const response = await fetch('https://api.vapi.com/createAccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error('Failed to create Vapi account');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Vapi account:', error);
    throw error;
  }
}

async function getApiKey(accountId) {
  try {
    const response = await fetch(`https://api.vapi.com/accounts/${accountId}/apiKey`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to retrieve API key');
    }

    const data = await response.json();
    return data.apiKey;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    throw error;
  }
}

export { createVapiAccount, getApiKey };
