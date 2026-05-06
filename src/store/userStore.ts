import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { AppUser } from '../types';

interface UserStore {
  data:      AppUser | null;
  loading:   boolean;
  subscribe: (uid: string) => () => void;
  clear:     () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  data:    null,
  loading: false,

  subscribe: (uid) => {
    set({ loading: true });
    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => set({ data: snap.exists() ? (snap.data() as AppUser) : null, loading: false }),
      ()     => set({ loading: false }),
    );
    return unsub;
  },

  clear: () => set({ data: null, loading: false }),
}));
