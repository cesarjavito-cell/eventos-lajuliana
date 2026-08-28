import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

const STORAGE_KEY = 'antigravity_quinta_firebase_config';

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

  return null;
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
