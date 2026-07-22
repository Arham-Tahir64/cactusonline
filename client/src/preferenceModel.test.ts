import { describe, expect, it } from 'vitest';
import { clampVolume, migratePreferences, normalizeResolution, resolutionLayout } from './preferenceModel';

describe('visual and audio preferences', () => {
  it('clamps persisted volume values', () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(0.45)).toBe(0.45);
    expect(clampVolume(8)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(0);
  });

  it('migrates the version-one volume into master volume', () => {
    expect(migratePreferences({ muted: true, volume: 0.35, reducedMotion: true }, 1)).toEqual({
      muted: true,
      masterVolume: 0.35,
      effectsVolume: 0.9,
      reducedMotion: true,
      resolution: null,
    });
  });

  it('normalizes current persisted preferences', () => {
    expect(
      migratePreferences(
        { muted: false, masterVolume: 2, effectsVolume: -2, reducedMotion: false },
        2,
      ),
    ).toEqual({ muted: false, masterVolume: 1, effectsVolume: 0, reducedMotion: false, resolution: null });
  });

  it('normalizes saved custom resolutions and rejects unsafe canvas sizes', () => {
    expect(normalizeResolution({ preset: 'custom', width: 2300.4, height: 1200.6 })).toEqual({
      preset: 'custom', width: 2300, height: 1201,
    });
    expect(normalizeResolution({ preset: 'fhd', width: 800, height: 600 })).toBeNull();
  });

  it('derives distinct responsive design profiles', () => {
    expect(resolutionLayout({ preset: 'fhd', width: 1920, height: 1080 })).toMatchObject({ tier: 'standard', aspect: 'widescreen' });
    expect(resolutionLayout({ preset: 'qhd', width: 2560, height: 1440 })).toMatchObject({ tier: 'large', aspect: 'widescreen' });
    expect(resolutionLayout({ preset: 'uwqhd', width: 3440, height: 1440 })).toMatchObject({ tier: 'large', aspect: 'ultrawide' });
    expect(resolutionLayout({ preset: 'uhd', width: 3840, height: 2160 }).uiScale).toBeGreaterThan(1.2);
  });
});
