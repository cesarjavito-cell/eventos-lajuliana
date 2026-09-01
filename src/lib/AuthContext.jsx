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

  const fetchAssignedUserRole = async (baseUser) => {
    if (!baseUser || !baseUser.email) return baseUser;
    // Always keep admin account as admin
    if (baseUser.email?.toLowerCase().includes('admin')) {
      return { ...baseUser, role: 'admin' };
    }
    try {
      const userRecords = await base44.entities.User.list();
      const match = (userRecords || []).find(
        (u) => (u.email || '').toLowerCase().trim() === (baseUser.email || '').toLowerCase().trim()
      );
      if (match && match.role) {
        return {
          ...baseUser,
          role: match.role,
          full_name: match.full_name || baseUser.full_name || baseUser.email,
        };
      }
    } catch (e) {
      console.warn('Could not match assigned role from User collection:', e);
    }
    return baseUser;
  };

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const storedSimulatedRole = localStorage.getItem('active_user_role_override');

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

        if (appParams.token) {
          await checkUserAuth();
        } else {
          let active = DEFAULT_ADMIN;
          if (storedSimulatedRole) {
            active = { ...active, role: storedSimulatedRole };
          }
          setUser(active);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        let active = DEFAULT_ADMIN;
        if (storedSimulatedRole) {
          active = { ...active, role: storedSimulatedRole };
        }
        setUser(active);
        setIsAuthenticated(true);
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    } catch (error) {
      setUser(DEFAULT_ADMIN);
      setIsAuthenticated(true);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      const storedSimulatedRole = localStorage.getItem('active_user_role_override');

      if (currentUser) {
        let matchedUser = await fetchAssignedUserRole(currentUser);
        if (storedSimulatedRole) {
          matchedUser = { ...matchedUser, role: storedSimulatedRole };
        }
        setUser(matchedUser);
        setIsAuthenticated(true);
      } else {
        let active = DEFAULT_ADMIN;
        if (storedSimulatedRole) {
          active = { ...active, role: storedSimulatedRole };
        }
        setUser(active);
        setIsAuthenticated(true);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      const storedSimulatedRole = localStorage.getItem('active_user_role_override');
      let active = DEFAULT_ADMIN;
      if (storedSimulatedRole) {
        active = { ...active, role: storedSimulatedRole };
      }
      setUser(active);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const setSimulatedRole = (role) => {
    if (!role || role === 'reset' || role === 'admin') {
      localStorage.removeItem('active_user_role_override');
      setUser(DEFAULT_ADMIN);
      return;
    }
    localStorage.setItem('active_user_role_override', role);
    setUser((prev) => ({ ...prev, role }));
  };

  const logout = (shouldRedirect = false) => {
    localStorage.removeItem('active_user_role_override');
    setUser(null);
    setIsAuthenticated(false);
    try {
      base44.auth.logout();
    } catch (e) {
      // ignore
    }
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
