import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacaStore {
  enabled: boolean;
  loaded:  boolean;
  setEnabled: (v: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useCacaStore = create<CacaStore>((set) => ({
  enabled: false,
  loaded:  false,

  async setEnabled(v) {
    set({ enabled: v });
    await AsyncStorage.setItem('caca_mode_enabled', v ? '1' : '0');
  },

  async loadSettings() {
    const val = await AsyncStorage.getItem('caca_mode_enabled');
    set({ enabled: val === '1', loaded: true });
  },
}));
