/**
 * API Endpoint Functions
 * ----------------------
 * A clean wrapper around each backend endpoint.
 * Import from this file in components instead of using axios directly.
 */

import client from './client';

// ─── Auth ─────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    client.post('/auth/login', { email, password }),
  register: (data) => client.post('/auth/register', data),
  me: () => client.get('/auth/me'),
};

// ─── Categories ───────────────────────────────────────
export const categoryAPI = {
  list: (params) => client.get('/categories/', { params }),
  get: (id) => client.get(`/categories/${id}`),
  create: (data) => client.post('/categories/', data),
  update: (id, data) => client.put(`/categories/${id}`, data),
  delete: (id) => client.delete(`/categories/${id}`),
};

// ─── Warehouses ───────────────────────────────────────
export const warehouseAPI = {
  list: (params) => client.get('/warehouses/', { params }),
  get: (id) => client.get(`/warehouses/${id}`),
  create: (data) => client.post('/warehouses/', data),
  update: (id, data) => client.put(`/warehouses/${id}`, data),
  delete: (id) => client.delete(`/warehouses/${id}`),
};

// ─── Suppliers ────────────────────────────────────────
export const supplierAPI = {
  list: (params) => client.get('/suppliers/', { params }),
  get: (id) => client.get(`/suppliers/${id}`),
  create: (data) => client.post('/suppliers/', data),
  update: (id, data) => client.put(`/suppliers/${id}`, data),
  delete: (id) => client.delete(`/suppliers/${id}`),
};

// ─── Products ─────────────────────────────────────────
export const productAPI = {
  list: (params) => client.get('/products/', { params }),
  get: (id) => client.get(`/products/${id}`),
  create: (data) => client.post('/products/', data),
  update: (id, data) => client.patch(`/products/${id}`, data),
  delete: (id) => client.delete(`/products/${id}`),
};

// ─── Inventory ────────────────────────────────────────
export const inventoryAPI = {
  list: (params) => client.get('/inventory/', { params }),
  adjust: (productId, warehouseId, data) =>
    client.post(`/inventory/adjust?product_id=${productId}&warehouse_id=${warehouseId}`, data),
};

// ─── Purchase Orders ──────────────────────────────────
export const poAPI = {
  list: (params) => client.get('/purchase-orders/', { params }),
  get: (id) => client.get(`/purchase-orders/${id}`),
  create: (data) => client.post('/purchase-orders/', data),
  updateStatus: (id, newStatus) =>
    client.patch(`/purchase-orders/${id}/status`, { status: newStatus }),
  receive: (id, warehouseId, data) =>
    client.post(`/purchase-orders/${id}/receive?warehouse_id=${warehouseId}`, data),
  delete: (id) => client.delete(`/purchase-orders/${id}`),
};

// ─── Dashboard & Reports ─────────────────────────────
export const dashboardAPI = {
  stats: () => client.get('/dashboard/stats'),
  reports: () => client.get('/dashboard/reports'),
};

// ─── Audit Logs (backend enforces admin/manager) ────
export const auditAPI = {
  list: (params) => client.get('/audit-logs/', { params }),
};
