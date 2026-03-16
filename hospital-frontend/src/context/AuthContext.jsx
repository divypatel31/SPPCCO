import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('hms_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('hms_user');
      }
    }
    setLoading(false);
  }, []);

  // 🔥 CHANGED: Now it just accepts the data we already fetched in LoginPage!
  const login = (userData) => {
    const { token, user: userDetails } = userData;

    const formattedUser = {
      ...userDetails,
      token
    };

    setUser(formattedUser);
    localStorage.setItem('hms_user', JSON.stringify(formattedUser));
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    return res.data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hms_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};