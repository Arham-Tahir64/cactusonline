import { describe, expect, it } from 'vitest';
import { cueForGameEvent, shouldAnimate } from './feedback';

describe('game feedback mapping', () => {
  it('maps authoritative public events to distinct cues', () => {
    expect(cueForGameEvent({ type: 'game-started' })).toBe('deal');
    expect(cueForGameEvent({ type: 'revealed' })).toBe('reveal');
    expect(cueForGameEvent({ type: 'cactus-called' })).toBe('cactus');
    expect(cueForGameEvent({ type: 'match-attempt', outcome: 'correct-own' })).toBe('stack-success');
    expect(cueForGameEvent({ type: 'match-attempt', outcome: 'incorrect' })).toBe('stack-failure');
    expect(cueForGameEvent({ type: 'match-window-closed' })).toBeNull();
  });

  it('suppresses gameplay animation when reduced motion is enabled', () => {
    expect(shouldAnimate('deal', false)).toBe(true);
    expect(shouldAnimate('deal', true)).toBe(false);
    expect(shouldAnimate('deal', false, true)).toBe(false);
    expect(shouldAnimate('button', false)).toBe(false);
  });
});
