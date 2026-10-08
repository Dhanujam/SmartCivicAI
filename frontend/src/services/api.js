import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartcivic_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const api = {
  // Health Check
  getHealth: async () => {
    const res = await apiClient.get('/health');
    return res.data;
  },

  // Authentication
  register: async (name, email, password, confirmPassword) => {
    const res = await apiClient.post('/api/auth/register', {
      name,
      email,
      password,
      confirm_password: confirmPassword,
    });
    return res.data;
  },

  login: async (email, password) => {
    const res = await apiClient.post('/api/auth/login', {
      email,
      password,
    });
    return res.data;
  },

  getMe: async () => {
    const res = await apiClient.get('/api/auth/me');
    return res.data;
  },

  // Citizen Complaint Endpoints
  submitComplaint: async (formData) => {
    const res = await apiClient.post('/api/complaints', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  getMyComplaints: async () => {
    const res = await apiClient.get('/api/complaints/my');
    return res.data;
  },

  getComplaintById: async (id) => {
    const res = await apiClient.get(`/api/complaints/${id}`);
    return res.data;
  },

  // Government Official Admin Endpoints
  getAdminComplaints: async (params = {}) => {
    const res = await apiClient.get('/api/admin/complaints', { params });
    return res.data;
  },

  getAdminComplaintById: async (id) => {
    const res = await apiClient.get(`/api/admin/complaints/${id}`);
    return res.data;
  },

  updateAdminComplaintStatus: async (id, status, adminNotes = '') => {
    const res = await apiClient.patch(`/api/admin/complaints/${id}/status`, {
      status,
      admin_notes: adminNotes,
    });
    return res.data;
  },

  mergeComplaints: async (masterComplaintId, duplicateComplaintIds) => {
    const res = await apiClient.post(`/api/admin/complaints/${masterComplaintId}/merge`, {
      duplicate_complaint_ids: duplicateComplaintIds,
    });
    return res.data;
  },

  getAdminSlaAlerts: async (limit = 10) => {
    const res = await apiClient.get('/api/admin/sla-alerts', { params: { limit } });
    return res.data;
  },

  // Analytics
  getAnalyticsSummary: async () => {
    const res = await apiClient.get('/api/analytics/summary');
    return res.data;
  },

  // Cybersecurity Module
  getSecurityStatus: async () => {
    const res = await apiClient.get('/api/security/status');
    return res.data;
  },

  getSecurityMetrics: async () => {
    const res = await apiClient.get('/api/admin/security/metrics');
    return res.data;
  },

  getSecurityLogs: async (params = {}) => {
    const res = await apiClient.get('/api/admin/security/logs', { params });
    return res.data;
  },

  testSecurityPayload: async (data) => {
    const res = await apiClient.post('/api/admin/security/test-payload', data);
    return res.data;
  },

  clearSecurityLogs: async () => {
    const res = await apiClient.delete('/api/admin/security/logs');
    return res.data;
  },
};

export default api;
