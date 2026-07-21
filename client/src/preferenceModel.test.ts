import { describe, expect, it } from 'vitest';
import { clampVolume, migratePreferences } from './preferenceModel';

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
    });
  });

  it('normalizes current persisted preferences', () => {
    expect(
      migratePreferences(
        { muted: false, masterVolume: 2, effectsVolume: -2, reducedMotion: false },
        2,
      ),
    ).toEqual({ muted: false, masterVolume: 1, effectsVolume: 0, reducedMotion: false });
  });
});
