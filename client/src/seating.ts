export interface SeatPosition {
  left: number;
  top: number;
}

/**
 * Deliberate clockwise seat layouts. Seat zero is always the local player at
 * the bottom; subsequent players wrap around the table toward the left.
 */
export const SEAT_LAYOUTS: Record<number, readonly SeatPosition[]> = {
  2: [
    { left: 50, top: 76 },
    { left: 50, top: 10 },
  ],
  3: [
    { left: 50, top: 86 },
    { left: 17, top: 37 },
    { left: 83, top: 37 },
  ],
  4: [
    { left: 50, top: 86 },
    { left: 14, top: 39 },
    { left: 50, top: 14 },
    { left: 86, top: 39 },
  ],
  5: [
    { left: 50, top: 86 },
    { left: 15, top: 72 },
    { left: 22, top: 23 },
    { left: 78, top: 23 },
    { left: 85, top: 72 },
  ],
  6: [
    { left: 50, top: 86 },
    { left: 16, top: 70 },
    { left: 16, top: 31 },
    { left: 50, top: 14 },
    { left: 84, top: 31 },
    { left: 84, top: 70 },
  ],
  7: [
    { left: 50, top: 86 },
    { left: 19, top: 74 },
    { left: 12, top: 43 },
    { left: 29, top: 16 },
    { left: 71, top: 16 },
    { left: 88, top: 43 },
    { left: 81, top: 74 },
  ],
  8: [
    { left: 50, top: 86 },
    { left: 20, top: 76 },
    { left: 12, top: 50 },
    { left: 20, top: 24 },
    { left: 50, top: 14 },
    { left: 80, top: 24 },
    { left: 88, top: 50 },
    { left: 80, top: 76 },
  ],
};

export function rotatePlayersToLocal<T extends { id: string }>(players: readonly T[], localId: string): T[] {
  const localIndex = players.findIndex((player) => player.id === localId);
  if (localIndex < 0) return [...players];
  return [...players.slice(localIndex), ...players.slice(0, localIndex)];
}

export function seatsFor(playerCount: number): readonly SeatPosition[] {
  const layout = SEAT_LAYOUTS[playerCount];
  if (!layout) throw new RangeError(`Cactus supports 2–8 players, received ${playerCount}`);
  return layout;
}
