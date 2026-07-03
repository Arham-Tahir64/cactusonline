import type { BoardTarget } from '@engine/types';
import type { ClickMode } from './store';

/** Click modes the server mandates as part of an in-progress action — never user-cancelable. */
export const FORCED_MODES: ReadonlySet<ClickMode> = new Set([
  'peek-own',
  'peek-opponent',
  'jack-1',
  'jack-2',
  'q-look',
  'q-swap',
  'give',
]);

interface ValidityContext {
  jackFirst: BoardTarget | null;
  qLookTarget: BoardTarget | null;
}

const sameTarget = (a: BoardTarget | null, b: BoardTarget) =>
  !!a && a.playerId === b.playerId && a.slotId === b.slotId;

/** Whether clicking this exact slot would currently do anything, given the active click mode. */
export function isValidTarget(
  mode: ClickMode,
  mine: boolean,
  target: BoardTarget,
  ctx: ValidityContext,
): boolean {
  switch (mode) {
    case 'swap':
    case 'take-discard':
    case 'give':
    case 'peek-own':
      return mine;
    case 'peek-opponent':
      return !mine;
    case 'stack':
    case 'jack-1':
    case 'q-look':
      return true;
    case 'jack-2':
      return !sameTarget(ctx.jackFirst, target);
    case 'q-swap':
      return !sameTarget(ctx.qLookTarget, target);
    case null:
      return false;
    default:
      return false;
  }
}
