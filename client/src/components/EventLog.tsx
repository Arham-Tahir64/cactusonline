import type { PlayerView } from '@engine/types';
import type { GameEvent } from '../store';
import { useCactusStore } from '../store';
import { nameOf } from '../names';
import { cardLabel } from '../cardLabel';

export default function EventLog() {
  const events = useCactusStore((s) => s.events);
  const view = useCactusStore((s) => s.view);

  return (
    <div className="event-log">
      {events
        .slice(-30)
        .reverse()
        .map((e, i) => (
          <div key={i} className="event-line">
            {describe(e, view)}
          </div>
        ))}
    </div>
  );
}

function describe(e: GameEvent, view: PlayerView | null): string {
  switch (e.type) {
    case 'match-attempt': {
      const card = e.card as Parameters<typeof cardLabel>[0];
      return (
        `⚡ match attempt by ${nameOf(view, e.playerId as string)}: ${e.outcome}` +
        (card ? ` (${cardLabel(card)})` : '')
      );
    }
    case 'cactus-called':
      return `🌵 ${nameOf(view, e.playerId as string)} called CACTUS!`;
    case 'game-started':
      return 'Game started — peek phase begins.';
    case 'peek-ended':
      return 'Peek phase ended — playing begins.';
    case 'match-window-closed':
      return 'Match window closed.';
    case 'action-played':
      return `${nameOf(view, e.playerId as string)} played a ${e.action} action.`;
    case 'rematch':
      return 'Rematch! New shuffle, same lobby.';
    case 'revealed':
      return `👁 you saw: ${cardLabel(e.card as Parameters<typeof cardLabel>[0])}`;
    case 'error':
      return `❌ ${e.code}: ${e.message}`;
    case 'disconnected':
      return 'Disconnected from the room.';
    default:
      return `event: ${e.type}`;
  }
}
