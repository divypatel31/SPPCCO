import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage to every request
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('hms_user');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch {}
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 🔥 THE FIX: Only force a redirect if the error is 401 AND the request was NOT for the login route!
    const isLoginRequest = err.config && err.config.url && err.config.url.includes('/auth/login');
    
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('hms_user');
      window.location.href = '/login';
    }
    
    return Promise.reject(err);
  }
);

export default api;