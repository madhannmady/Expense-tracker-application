import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
});

// Attach JWT to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const loginUser = (username, password) =>
  api.post('/auth/login', { username, password });

export const registerUser = (username, password) =>
  api.post('/auth/register', { username, password });

export const getMe = () => api.get('/auth/me');

export const getDashboardStats = () => api.get('/records/dashboard');
export const getRecords = () => api.get('/records');
export const getRecordById = (id) => api.get(`/records/${id}`);
export const createRecord = (data) => api.post('/records', data);
export const updateRecord = (id, data) => api.put(`/records/${id}`, data);
export const deleteRecord = (id) => api.delete(`/records/${id}`);

// Budget API
export const getBudgetSummary = () => api.get('/budgets/summary');
export const getBudgetByMonth = (month, year) => api.get(`/budgets/${month}/${year}`);
export const saveBudget = (data) => api.post('/budgets', data);
export const deleteBudgetItem = (id) => api.delete(`/budgets/${id}`);
export const deleteBudgetByMonth = (month, year) => api.delete(`/budgets/month/${month}/${year}`);

// Notes API
export const getNotes = () => api.get('/notes');
export const getNotesById = (id) => api.get(`/notes/${id}`);
export const getNotesByMonth = (month, year) => api.get(`/notes/month/${month}/${year}`);
export const createNotes = (data) => api.post('/notes', data);
export const updateNotes = (id, data) => api.put(`/notes/${id}`, data);
export const deleteNotes = (id) => api.delete(`/notes/${id}`);

