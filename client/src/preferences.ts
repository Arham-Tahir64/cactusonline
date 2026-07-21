import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  muted: boolean;
  volume: number;
  reducedMotion: boolean;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  setReducedMotion(reducedMotion: boolean): void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      muted: false,
      volume: 0.72,
      reducedMotion: false,
      setMuted: (muted) => set({ muted }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    { name: 'cactus-preferences', version: 1 },
  ),
);
