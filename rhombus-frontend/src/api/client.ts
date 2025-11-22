// src/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api', // TEMP! Change after deployment
  headers: {
    'Content-Type': 'application/json',
  },
});

// TODO: Add interceptors for debugging or token handling later
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;