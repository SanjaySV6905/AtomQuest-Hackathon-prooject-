import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data.user);
      fetchAllUsers();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllUsers() {
    try {
      const res = await api.get('/api/auth/users');
      setAllUsers(res.data);
    } catch {}
  }

  async function login(email, password) {
    const res = await api.post('/api/auth/login', { email, password });
    setUser(res.data.user);
    // store token in localStorage as fallback
    if (res.data.token) localStorage.setItem('token', res.data.token);
    fetchAllUsers();
    return res.data.user;
  }

  async function logout() {
    await api.post('/api/auth/logout');
    localStorage.removeItem('token');
    setUser(null);
  }

  // Role switcher for demo
  async function switchToUser(userId) {
    const target = allUsers.find(u => u._id === userId);
    if (target) {
      // Login as that user
      const rolePasswords = { 'neha@goalportal.com': 'password123', 'ankit@goalportal.com': 'password123', 'priya@goalportal.com': 'password123', 'rahul@goalportal.com': 'password123' };
      try {
        const res = await api.post('/api/auth/login', { email: target.email, password: 'password123' });
        setUser(res.data.user);
        if (res.data.token) localStorage.setItem('token', res.data.token);
        window.location.href = `/${res.data.user.role}/dashboard`;
      } catch {}
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, allUsers, switchToUser, refetch: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
