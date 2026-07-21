export interface StoredPreferences {
  muted: boolean;
  masterVolume: number;
  effectsVolume: number;
  reducedMotion: boolean;
}

export const DEFAULT_PREFERENCES: StoredPreferences = {
  muted: false,
  masterVolume: 0.8,
  effectsVolume: 0.9,
  reducedMotion: false,
};

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function migratePreferences(value: unknown, version: number): StoredPreferences {
  const stored = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const legacyVolume = typeof stored.volume === 'number' ? stored.volume : DEFAULT_PREFERENCES.masterVolume;
  const masterVolume =
    version < 2
      ? legacyVolume
      : typeof stored.masterVolume === 'number'
        ? stored.masterVolume
        : DEFAULT_PREFERENCES.masterVolume;

  return {
    muted: typeof stored.muted === 'boolean' ? stored.muted : DEFAULT_PREFERENCES.muted,
    masterVolume: clampVolume(masterVolume),
    effectsVolume: clampVolume(
      typeof stored.effectsVolume === 'number' ? stored.effectsVolume : DEFAULT_PREFERENCES.effectsVolume,
    ),
    reducedMotion:
      typeof stored.reducedMotion === 'boolean' ? stored.reducedMotion : DEFAULT_PREFERENCES.reducedMotion,
  };
}
