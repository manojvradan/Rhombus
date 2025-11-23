// src/api/client.ts
import axios from 'axios';

const baseURL = import.meta.env.PROD 
  ? ''  // Production: uses relative path (handled by vercel.json)
  : 'http://localhost:8000'; // Local: points to Django directly

const apiClient = axios.create({
  baseURL: baseURL, // TEMP! Change after deployment
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