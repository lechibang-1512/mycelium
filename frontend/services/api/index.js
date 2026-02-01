/**
 * Core API Configuration
 * 
 * This module provides the axios instance with interceptors for all API calls.
 * Other API modules import this instance and re-export it.
 */

import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    withCredentials: true, // Important for cookies/sessions
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for error handling
api.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Silently ignore cancelled/aborted requests (happens during navigation when component unmounts)
        if (axios.isCancel(error) ||
            error.code === 'ERR_CANCELED' ||
            error.code === 'ECONNABORTED' ||
            error.name === 'CanceledError' ||
            error.message === 'Request aborted') {
            return Promise.reject(error);
        }

        if (error.response) {
            // Handle specific status codes
            switch (error.response.status) {
                case 401:
                    // Unauthorized - don't redirect automatically, let components handle it
                    // This prevents infinite redirect loops
                    console.log('Unauthorized request - authentication required');
                    break;
                case 403:
                    // Forbidden - permission error
                    console.error('Access forbidden:', error.response.data);
                    break;
                case 429:
                    // Rate limited
                    console.error('Too many requests. Please try again later.');
                    break;
                default:
                    console.error('API Error:', error.response.data);
            }
        } else if (error.request) {
            // Request was made but no response received
            console.error('No response received from server');
        } else {
            // Something happened in setting up the request
            console.error('Request setup error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
