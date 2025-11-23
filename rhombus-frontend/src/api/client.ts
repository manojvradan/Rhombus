// src/api/client.ts
import axios from 'axios';

const baseURL = import.meta.env.PROD 
  ? ''  // In production, use the current domain (relative path)
  : 'http://localhost:8000'; // In local dev, use localhost

const apiClient = axios.create({
  baseURL: baseURL, // TEMP! Change after deployment
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