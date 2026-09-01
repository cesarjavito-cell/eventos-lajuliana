import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

const DEFAULT_ADMIN = {
  id: 'admin-local',
  full_name: 'Javier Almada',
  email: 'admin@quintalajuliana.com',
  role: 'admin',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(DEFAULT_ADMIN);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(true);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const resolveActiveUser = async () => {
    // 1. Check URL query params for ?login_email=...
    const urlParams = new URLSearchParams(window.location.search);
    const urlEmail = urlParams.get('login_email') || urlParams.get('email');

    // 2. Check localStorage for active_logged_in_email or active_user_role_override
    const storedEmail = urlEmail || localStorage.getItem('active_logged_in_email');
    const storedRoleOverride = localStorage.getItem('active_user_role_override');

    if (urlEmail) {
      localStorage.setItem('active_logged_in_email', urlEmail.toLowerCase().trim());
    }

    if (storedRoleOverride) {
      return {
        id: 'simulated-user',
        full_name: `Vista de Prueba (${storedRoleOverride.toUpperCase()})`,
        email: storedEmail || 'usuario@quintalajuliana.com',
        role: storedRoleOverride,
      };
    }

    if (storedEmail && !storedEmail.toLowerCase().includes('admin')) {
      try {
        const userRecords = await base44.entities.User.list();
        const match = (userRecords || []).find(
          (u) => (u.email || '').toLowerCase().trim() === storedEmail.toLowerCase().trim()
        );
        if (match) {
          return {
            id: match.id,
            full_name: match.full_name || match.email,
            email: match.email,
            role: match.role || 'comercial',
          };
        }
      } catch (e) {
        console.warn('Could not fetch user records:', e);
      }
    }

    // Default to admin for main owner account
    return DEFAULT_ADMIN;
  };

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
      } catch (appError) {
        // Dev / local mode
      }

      await checkUserAuth();
      setIsLoadingPublicSettings(false);
    } catch (error) {
      const active = await resolveActiveUser();
      setUser(active);
      setIsAuthenticated(true);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const active = await resolveActiveUser();
      setUser(active);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      const active = await resolveActiveUser();
      setUser(active);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const switchActiveUserEmail = async (email) => {
    if (!email || email.toLowerCase().includes('admin') || email === 'admin') {
      localStorage.removeItem('active_logged_in_email');
      localStorage.removeItem('active_user_role_override');
      setUser(DEFAULT_ADMIN);
      return;
    }
    localStorage.setItem('active_logged_in_email', email.toLowerCase().trim());
    localStorage.removeItem('active_user_role_override');
    const active = await resolveActiveUser();
    setUser(active);
  };

  const setSimulatedRole = (role) => {
    if (!role || role === 'reset' || role === 'admin') {
      localStorage.removeItem('active_user_role_override');
      localStorage.removeItem('active_logged_in_email');
      setUser(DEFAULT_ADMIN);
      return;
    }
    localStorage.setItem('active_user_role_override', role);
    setUser((prev) => ({ ...prev, role }));
  };

  const logout = (shouldRedirect = false) => {
    localStorage.removeItem('active_user_role_override');
    localStorage.removeItem('active_logged_in_email');
    setUser(DEFAULT_ADMIN);
    setIsAuthenticated(true);
  };

  const navigateToLogin = () => {
    try {
      base44.auth.redirectToLogin(window.location.href);
    } catch (e) {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      setSimulatedRole,
      switchActiveUserEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
