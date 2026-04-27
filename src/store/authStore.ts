import { create } from 'zustand';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { AuthUser } from '../types';

interface AuthStore {
  user:          AuthUser | null;
  loading:       boolean;
  error:         string | null;
  initialize:    () => () => void;
  login:         (email: string, password: string) => Promise<void>;
  signup:        (email: string, password: string, displayName: string) => Promise<void>;
  logout:        () => Promise<void>;
  forgotPassword:(email: string) => Promise<void>;
  clearError:    () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:    null,
  loading: true,
  error:   null,

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        set({ user: null, loading: false });
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        const data = snap.data();
        set({
          user: {
            uid:                firebaseUser.uid,
            email:              firebaseUser.email ?? '',
            displayName:        firebaseUser.displayName,
            onboardingComplete: data?.settings?.onboardingComplete ?? false,
          },
          loading: false,
          error: null,
        });
      } catch {
        // Doc missing — gracefully default to onboarding flow
        set({
          user: {
            uid:                firebaseUser.uid,
            email:              firebaseUser.email ?? '',
            displayName:        firebaseUser.displayName,
            onboardingComplete: false,
          },
          loading: false,
          error: null,
        });
      }
    });

    return unsubscribe;
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      set({ error: friendlyAuthError(e) });
      throw e;
    }
  },

  signup: async (email, password, displayName) => {
    set({ error: null });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });

      // Write the initial Firestore user document.
      // The Firebase Function (onUserCreate) also writes this — using merge: true
      // so both writes are idempotent regardless of which lands first.
      await setDoc(
        doc(db, 'users', cred.user.uid),
        {
          uid:         cred.user.uid,
          email:       cred.user.email ?? email,
          displayName,
          avatarUrl:   null,
          createdAt:   serverTimestamp(),
          profile:     null,
          stats: {
            currentWeight:   0,
            weightHistory:   [],
            currentStreak:   0,
            longestStreak:   0,
            totalWorkouts:   0,
            lastWorkoutDate: null,
          },
          settings: {
            onboardingComplete: false,
            notifications:      true,
            units:              'metric',
          },
        },
        { merge: true },
      );
    } catch (e: unknown) {
      set({ error: friendlyAuthError(e) });
      throw e;
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, error: null });
  },

  forgotPassword: async (email) => {
    set({ error: null });
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e: unknown) {
      set({ error: friendlyAuthError(e) });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));

function friendlyAuthError(e: unknown): string {
  const message = e instanceof Error ? e.message : '';
  if (message.includes('user-not-found') || message.includes('wrong-password') || message.includes('invalid-credential')) {
    return 'Incorrect email or password.';
  }
  if (message.includes('email-already-in-use')) {
    return 'An account with this email already exists.';
  }
  if (message.includes('weak-password')) {
    return 'Password must be at least 6 characters.';
  }
  if (message.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('too-many-requests')) {
    return 'Too many attempts. Please try again later.';
  }
  return 'Something went wrong. Please try again.';
}
