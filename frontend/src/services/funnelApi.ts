```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const fetchFunnels = async () => {
  try {
    const response = await api.get('/funnels');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch funnels:', error);
    throw error;
  }
};

export const createFunnel = async (name: string) => {
  try {
    const response = await api.post('/funnels', { name });
    return response.data;
  } catch (error) {
    console.error('Failed to create funnel:', error);
    throw error;
  }
};