import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const sessionId = sessionStorage.getItem('sessionId');
      const userType = sessionStorage.getItem('userType') || 'student';
      
      if (token && sessionId) {
        // Validate session with backend
        const validateEndpoint = userType === 'admin' ? '/admin/auth/validate-session' : '/auth/validate-session';
        const profileEndpoint = userType === 'admin' ? '/admin/auth/profile' : '/auth/profile';
        
        try {
          const response = await api.get(validateEndpoint);
          if (response.data.valid) {
            const profileResponse = await api.get(profileEndpoint);
            setUser(profileResponse.data.user || profileResponse.data.admin);
          } else {
            // Session invalid, clear storage
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('sessionId');
            sessionStorage.removeItem('userType');
          }
        } catch (error) {
          // If admin validation fails, try regular validation
          if (userType === 'admin') {
            try {
              const response = await api.get('/auth/validate-session');
              if (response.data.valid) {
                const profileResponse = await api.get('/auth/profile');
                setUser(profileResponse.data.user);
                sessionStorage.setItem('userType', 'student');
              }
            } catch (e) {
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('sessionId');
              sessionStorage.removeItem('userType');
            }
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('sessionId');
      sessionStorage.removeItem('userType');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user, sessionId } = response.data;
      
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('sessionId', sessionId);
      sessionStorage.setItem('userType', 'student');
      setUser(user);
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const adminLogin = async (credentials) => {
    try {
      const response = await api.post('/admin/auth/login', credentials);
      const { token, admin } = response.data;
      
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('sessionId', `admin_${Date.now()}`);
      sessionStorage.setItem('userType', 'admin');
      setUser({ ...admin, role: 'admin' });
      toast.success('Admin login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Admin login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user, sessionId } = response.data;
      
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('sessionId', sessionId);
      setUser(user);
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const loginWithMetaMask = async (walletData) => {
    try {
      const response = await api.post('/auth/metamask', walletData);
      const { token, user, sessionId } = response.data;
      
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('sessionId', sessionId);
      setUser(user);
      toast.success('MetaMask login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'MetaMask login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async (silent = false) => {
    try {
      const userType = sessionStorage.getItem('userType') || 'student';
      const logoutEndpoint = userType === 'admin' ? '/admin/auth/logout' : '/auth/logout';
      
      // Call backend logout to invalidate session
      await api.post(logoutEndpoint);
    } catch (error) {
      console.error('Backend logout failed:', error);
      // Continue with frontend logout even if backend fails
    }
    
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('userType');
    setUser(null);
    
    if (!silent) {
      toast.info('Logged out successfully');
    }
  };

  const logoutAll = async () => {
    try {
      const userType = sessionStorage.getItem('userType') || 'student';
      const logoutEndpoint = userType === 'admin' ? '/admin/auth/logout' : '/auth/logout-all';
      
      await api.post(logoutEndpoint);
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('sessionId');
      sessionStorage.removeItem('userType');
      setUser(null);
      toast.info('Logged out from all devices successfully');
    } catch (error) {
      console.error('Logout all failed:', error);
      // Fallback to local logout
      logout(true);
    }
  };

  const value = {
    user,
    loading,
    login,
    adminLogin,
    register,
    loginWithMetaMask,
    logout,
    logoutAll,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
