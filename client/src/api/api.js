import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  signUp: (data) => API.post('/public/signUp', data),
  login: (data) => API.post('/public/login', data),
  googleCallback: (code) => API.get(`/auth/google/callback?code=${code}`),
};

export const userAPI = {
  getGreeting: () => API.get('/user'),
  updateUser: (data) => API.put('/user', data),
  deleteUser: () => API.delete('/user'),
};

export const journalAPI = {
  getAll: () => API.get('/journal'),
  getById: (id) => API.get(`/journal/id/${id}`),
  create: (data) => API.post('/journal', data),
  update: (id, data) => API.put(`/journal/id/${id}`, data),
  delete: (id) => API.delete(`/journal/id/${id}`),
};

export const adminAPI = {
  getAllUsers: () => API.get('/admin/all-users'),
  createAdmin: (data) => API.post('/admin/create-admin', data),
  clearCache: () => API.get('/admin/clear-app-cache'),
};

export default API;
