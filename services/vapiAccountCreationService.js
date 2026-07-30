/**
 * SYNOPSIS: Exports createVapiAccount — services/vapiAccountCreationService.js.
 */
import axios from 'axios';

const VAPI_BASE_URL = 'https://api.vapi.ai';

export async function createVapiAccount({ email, name }) {
  const response = await axios.post(`${VAPI_BASE_URL}/account`, {
    email,
    name,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}