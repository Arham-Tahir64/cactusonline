import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_PREFERENCES,
  clampVolume,
  migratePreferences,
  type StoredPreferences,
  type ResolutionSelection,
} from './preferenceModel';

interface PreferencesState extends StoredPreferences {
  setMuted(muted: boolean): void;
  setMasterVolume(volume: number): void;
  setEffectsVolume(volume: number): void;
  setReducedMotion(reducedMotion: boolean): void;
  setResolution(resolution: ResolutionSelection): void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      setMuted: (muted) => set({ muted }),
      setMasterVolume: (masterVolume) => set({ masterVolume: clampVolume(masterVolume) }),
      setEffectsVolume: (effectsVolume) => set({ effectsVolume: clampVolume(effectsVolume) }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setResolution: (resolution) => set({ resolution }),
    }),
    {
      name: 'cactus-preferences',
      version: 3,
      migrate: (persisted, version) => migratePreferences(persisted, version),
    },
  ),
);
