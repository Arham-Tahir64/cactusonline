import { describe, expect, it } from 'vitest';
import { rotatePlayersToLocal, seatsFor } from './seating';

const players = Array.from({ length: 8 }, (_, index) => ({ id: `p${index + 1}` }));

describe('table seating', () => {
  it.each([2, 4, 8])('anchors the local player at the bottom for %i players', (count) => {
    const room = players.slice(0, count);
    const local = room[Math.floor(count / 2)]!;
    const ordered = rotatePlayersToLocal(room, local.id);
    const seats = seatsFor(count);

    expect(ordered[0]).toBe(local);
    expect(seats).toHaveLength(count);
    expect(seats[0]).toEqual({ left: 50, top: 86 });
  });

  it('preserves clockwise room order while wrapping around the local player', () => {
    expect(rotatePlayersToLocal(players.slice(0, 4), 'p3').map(({ id }) => id)).toEqual([
      'p3',
      'p4',
      'p1',
      'p2',
    ]);
  });

  it('rejects unsupported table sizes', () => {
    expect(() => seatsFor(1)).toThrow(/2–8 players/);
    expect(() => seatsFor(9)).toThrow(/2–8 players/);
  });
});
