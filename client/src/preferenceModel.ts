export interface StoredPreferences {
  muted: boolean;
  masterVolume: number;
  effectsVolume: number;
  reducedMotion: boolean;
  resolution: ResolutionSelection | null;
}

export type ResolutionPresetId = 'fhd' | 'qhd' | 'uhd' | 'uwfhd' | 'uwqhd' | 'custom';

export interface ResolutionSelection {
  preset: ResolutionPresetId;
  width: number;
  height: number;
}

export interface ResolutionPreset {
  id: Exclude<ResolutionPresetId, 'custom'>;
  label: string;
  width: number;
  height: number;
  description: string;
}

export const RESOLUTION_PRESETS: readonly ResolutionPreset[] = [
  { id: 'fhd', label: 'Full HD', width: 1920, height: 1080, description: 'Standard widescreen' },
  { id: 'qhd', label: 'QHD', width: 2560, height: 1440, description: 'High-detail widescreen' },
  { id: 'uhd', label: '4K UHD', width: 3840, height: 2160, description: 'Large high-density displays' },
  { id: 'uwfhd', label: 'Ultrawide', width: 2560, height: 1080, description: '21:9 compact ultrawide' },
  { id: 'uwqhd', label: 'Ultrawide QHD', width: 3440, height: 1440, description: '21:9 high-detail ultrawide' },
] as const;

export const DEFAULT_PREFERENCES: StoredPreferences = {
  muted: false,
  masterVolume: 0.8,
  effectsVolume: 0.9,
  reducedMotion: false,
  resolution: null,
};

export function normalizeResolution(value: unknown): ResolutionSelection | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const validPreset = [...RESOLUTION_PRESETS.map((preset) => preset.id), 'custom'].includes(
    candidate.preset as ResolutionPresetId,
  );
  if (!validPreset || typeof candidate.width !== 'number' || typeof candidate.height !== 'number') return null;
  const width = Math.round(candidate.width);
  const height = Math.round(candidate.height);
  if (width < 1100 || width > 7680 || height < 700 || height > 4320) return null;
  return { preset: candidate.preset as ResolutionPresetId, width, height };
}

export function resolutionLayout(selection: ResolutionSelection) {
  const aspectRatio = selection.width / selection.height;
  const density = Math.min(selection.width / 1920, selection.height / 1080);
  return {
    aspect: aspectRatio >= 2.15 ? 'ultrawide' : 'widescreen',
    tier: density >= 1.8 ? 'ultra' : density >= 1.25 ? 'large' : 'standard',
    uiScale: Math.max(0.92, Math.min(1.32, 0.92 + (density - 1) * 0.3)),
    perspectiveScale: Math.max(0.96, Math.min(1.22, 0.98 + (density - 1) * 0.18)),
  } as const;
}

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
    resolution: normalizeResolution(stored.resolution),
  };
}
