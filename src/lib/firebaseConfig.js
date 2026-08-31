import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const STORAGE_KEY = 'antigravity_quinta_firebase_config';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAJO58beB_dKVUfjH7HkphJHgWRAe6tLI",
  authDomain: "eventos-la-juliana.firebaseapp.com",
  projectId: "eventos-la-juliana",
  storageBucket: "eventos-la-juliana.appspot.com",
  messagingSenderId: "671375425287",
  appId: "1:671375425287:web:17e251483a41a8e60ccfa2"
};

export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {}

  if (import.meta.env?.VITE_FIREBASE_API_KEY && import.meta.env?.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
    };
  }

  // Default to Javier Almada's official Quinta La Juliana Google Cloud Project
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(configObj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configObj));
    return true;
  } catch (e) {
    console.error('Failed to save firebase config:', e);
    return false;
  }
}

export function getFirebaseInstance() {
  const config = getStoredFirebaseConfig();
  if (!config) return { app: null, db: null };

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    const db = getFirestore(app);
    return { app, db };
  } catch (e) {
    console.warn('Firebase init error:', e);
    return { app: null, db: null };
  }
}
