/**
 * Axios API Client
 * ----------------
 * Central place for making HTTP requests to the FastAPI backend.
 *
 * Key features:
 * - Base URL configured from environment variables
 * - Request interceptor automatically attaches the JWT token
 * - Response interceptor handles 401 errors (auto logout)
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: attach JWT token ─────────────
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: handle auth errors ──────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;

// ─── Helper to extract error messages from API responses ──
export function getErrorMessage(error) {
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg || d.message).join(', ');
    return JSON.stringify(detail);
  }
  if (error.request) return 'Network error — is the backend running?';
  return error.message || 'An unexpected error occurred';
}
