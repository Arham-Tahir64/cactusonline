import type { GameEvent } from './store';

export type SoundCue =
  | 'button'
  | 'turn'
  | 'deal'
  | 'draw'
  | 'discard'
  | 'reveal'
  | 'stack-success'
  | 'stack-failure'
  | 'cactus';

export function cueForGameEvent(event: GameEvent): SoundCue | null {
  switch (event.type) {
    case 'game-started':
    case 'rematch':
      return 'deal';
    case 'peek-ended':
    case 'revealed':
      return 'reveal';
    case 'cactus-called':
      return 'cactus';
    case 'match-attempt':
      return event.outcome === 'correct-own' || event.outcome === 'correct-opponent'
        ? 'stack-success'
        : 'stack-failure';
    default:
      return null;
  }
}

export function shouldAnimate(
  cue: SoundCue,
  reducedMotion: boolean,
  systemReducedMotion = false,
): boolean {
  return !reducedMotion && !systemReducedMotion && cue !== 'button';
}
