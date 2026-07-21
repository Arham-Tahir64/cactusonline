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
    { left: 50, top: 86 },
    { left: 50, top: 14 },
  ],
  3: [
    { left: 50, top: 86 },
    { left: 13, top: 34 },
    { left: 87, top: 34 },
  ],
  4: [
    { left: 50, top: 86 },
    { left: 7, top: 34 },
    { left: 50, top: 14 },
    { left: 93, top: 34 },
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
    { left: 13, top: 72 },
    { left: 13, top: 28 },
    { left: 50, top: 14 },
    { left: 87, top: 28 },
    { left: 87, top: 72 },
  ],
  7: [
    { left: 50, top: 86 },
    { left: 17, top: 76 },
    { left: 8, top: 43 },
    { left: 29, top: 16 },
    { left: 71, top: 16 },
    { left: 92, top: 43 },
    { left: 83, top: 76 },
  ],
  8: [
    { left: 50, top: 86 },
    { left: 20, top: 76 },
    { left: 7, top: 50 },
    { left: 20, top: 24 },
    { left: 50, top: 14 },
    { left: 80, top: 24 },
    { left: 93, top: 50 },
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
