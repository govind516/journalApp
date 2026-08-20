import { createContext, useContext, useState, useCallback } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState(null);

  const login = useCallback(async (userName, pwd) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.login({ userName, password: pwd });
      localStorage.setItem('token', res.data);
      setToken(res.data);
      setPassword(pwd);
      return true;
    } catch (err) {
      setError(err.response?.data || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (userName, pwd, email) => {
    setLoading(true);
    setError(null);
    try {
      await authAPI.signUp({ userName, password: pwd, email, sentimentAnalysis: false });
      return true;
    } catch (err) {
      setError(err.response?.data || 'Sign up failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const googleLogin = useCallback(async (code) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.googleCallback(code);
      const token = res.data.token || res.data;
      localStorage.setItem('token', token);
      setToken(token);
      return true;
    } catch (err) {
      setError(err.response?.data || 'Google login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setPassword(null);
    localStorage.removeItem('token');
  }, []);

  const isAdmin = useCallback(() => {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.roles?.includes('ADMIN');
    } catch {
      return false;
    }
  }, [token]);

  const getUserName = useCallback(() => {
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || '';
    } catch {
      return '';
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ token, password, loading, error, login, signUp, googleLogin, logout, isAdmin, getUserName, setError }}
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
