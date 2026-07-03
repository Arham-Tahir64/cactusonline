import type { PlayerView } from '@engine/types';

export function nameOf(view: PlayerView | null, id: string): string {
  if (!view) return id;
  return view.players.find((p) => p.id === id)?.name ?? id;
}
