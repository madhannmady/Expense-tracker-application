import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

// Attach JWT to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Retry interceptor for cold-start / network timeouts
const MAX_RETRIES = 3;
const RETRY_DELAY = [2000, 4000, 8000]; // exponential backoff

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isTimeout = error.code === 'ECONNABORTED';
    const isNetworkError = !error.response && error.message === 'Network Error';
    const isServerDown = error.response?.status >= 500;

    if ((isTimeout || isNetworkError || isServerDown) && config && !config.__retryCount) {
      config.__retryCount = 0;
    }

    if (
      (isTimeout || isNetworkError || isServerDown) &&
      config &&
      config.__retryCount < MAX_RETRIES
    ) {
      config.__retryCount += 1;

      // Notify any listener about the retry (used by Login/Register for UI)
      if (config.onRetry) config.onRetry(config.__retryCount);

      const delay = RETRY_DELAY[config.__retryCount - 1] || 8000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return api(config);
    }

    return Promise.reject(error);
  }
);

export const loginUser = (username, password, { onRetry } = {}) =>
  api.post('/auth/login', { username, password }, { onRetry });

export const registerUser = (username, password, { onRetry } = {}) =>
  api.post('/auth/register', { username, password }, { onRetry });

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

// Chat AI API
export const getChats = () => api.get('/chats');
export const getChatById = (id) => api.get(`/chats/${id}`);
export const createChat = (title) => api.post('/chats', { title });
export const sendChatMessage = (id, message) => api.post(`/chats/${id}/messages`, { message }, { timeout: 60000 });
export const deleteChat = (id) => api.delete(`/chats/${id}`);

