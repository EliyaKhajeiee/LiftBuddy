import { getApps, getApp, initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, type Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase v12: getReactNativePersistence lives in the RN build of @firebase/auth.
// Metro resolves '@firebase/auth' to dist/rn/index.js via the package.json
// react-native field, so this works at runtime; the declaration bridges TS types.
declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
}
import { getReactNativePersistence } from '@firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// initializeAuth must only be called once — getAuth() reuses the existing instance on reload
const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export { auth };
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
