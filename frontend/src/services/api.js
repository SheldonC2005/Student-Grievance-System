import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear session storage
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('sessionId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Block Management API
export const blockManagementAPI = {
  // Get block creation preview
  getPreview: async () => {
    const response = await api.get('/admin/blocks/preview');
    return response.data;
  },

  // Create a new block
  createBlock: async () => {
    const response = await api.post('/admin/blocks/create');
    return response.data;
  },

  // Get all blocks with pagination
  getBlocks: async (page = 1, limit = 10) => {
    const response = await api.get(`/admin/blocks?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get detailed information about a specific block
  getBlockDetails: async (blockNumber) => {
    const response = await api.get(`/admin/blocks/${blockNumber}`);
    return response.data;
  },

  // Get block statistics
  getStatistics: async () => {
    const response = await api.get('/admin/blocks/stats/overview');
    return response.data;
  },

  // Search blocks by criteria
  searchBlocks: async (filters) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const response = await api.get(`/admin/blocks/search?${queryParams.toString()}`);
    return response.data;
  },

  // Export block data
  exportBlock: async (blockNumber) => {
    const response = await api.get(`/admin/blocks/${blockNumber}/export`);
    return response.data;
  }
};

export default api;
