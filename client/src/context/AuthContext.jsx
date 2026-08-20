import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const login = async (userName, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.login({ userName, password });
      setToken(res.data);
      return true;
    } catch (err) {
      setError(err.response?.data || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userName, password, email) => {
    setLoading(true);
    setError(null);
    try {
      await authAPI.signUp({ userName, password, email, sentimentAnalysis: false });
      return true;
    } catch (err) {
      setError(err.response?.data || 'Sign up failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.googleCallback(code);
      setToken(res.data.token);
      return true;
    } catch (err) {
      setError(err.response?.data || 'Google login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  const isAdmin = () => {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.roles?.includes('ADMIN');
    } catch {
      return false;
    }
  };

  const getUserName = () => {
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || '';
    } catch {
      return '';
    }
  };

  return (
    <AuthContext.Provider
      value={{ token, loading, error, login, signUp, googleLogin, logout, isAdmin, getUserName, setError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
