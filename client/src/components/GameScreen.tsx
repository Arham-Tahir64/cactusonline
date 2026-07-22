import { useEffect } from 'react';
import { useCactusStore } from '../store';
import { nameOf } from '../names';
import Table from './Table';
import ActionBar from './ActionBar';
import Scoreboard from './Scoreboard';
import GameHeader from './GameHeader';
import TurnGuide from './TurnGuide';
import { useGameFeedback } from '../useGameFeedback';

export default function GameScreen() {
  useGameFeedback();
  const view = useCactusStore((s) => s.view);
  const room = useCactusStore((s) => s.room);
  const clickMode = useCactusStore((s) => s.clickMode);
  const setClickMode = useCactusStore((s) => s.setClickMode);
  const scores = useCactusStore((s) => s.scores);

  // Mandatory action-card / give sequences drive the click mode automatically —
  // the player never has to remember which follow-up step they're on.
  useEffect(() => {
    if (!view || !room) return;
    const action = view.pendingAction;
    if (action && action.actingPlayerId === room.sessionId) {
      if (action.type === '7-8' && clickMode !== 'peek-own') {
        setClickMode('peek-own', '7/8: click one of YOUR cards to peek');
      } else if (action.type === '9-10' && clickMode !== 'peek-opponent') {
        setClickMode('peek-opponent', '9/10: click an OPPONENT card to peek');
      } else if (action.type === 'J' && clickMode !== 'jack-1' && clickMode !== 'jack-2') {
        setClickMode('jack-1', 'J: pick the first card to blind-swap');
      } else if (action.type === 'Q' && action.stage === 'pick-target' && clickMode !== 'q-look') {
        setClickMode('q-look', 'Q: click any card to look at it');
      }
    }
    if (view.pendingGive?.fromPlayerId === room.sessionId && clickMode !== 'give') {
      setClickMode('give', 'Give one of YOUR cards (face-down) to the player you stacked');
    }
  }, [view, room, clickMode, setClickMode]);

  if (!view || !room) return null;
  const myTurn = view.currentPlayerId === room.sessionId;

  return (
    <section className="game-screen" data-phase={view.phase}>
      <GameHeader />

      <div className="turn-banner">
        <strong>{myTurn ? 'Your turn' : `${nameOf(view, view.currentPlayerId)}'s turn`}</strong>
        {view.cactusCallerId && <span>🌵 called by {nameOf(view, view.cactusCallerId)}</span>}
      </div>

      <div className="game-stage" data-player-count={view.players.length}>
        {view.phase === 'peek' && (
          <div className="peek-banner">👀 Peek phase — memorize your bottom two cards before they turn face-down.</div>
        )}

        <Table />
        <ActionBar myTurn={myTurn} />
        <TurnGuide />
        {scores && <Scoreboard />}
      </div>
    </section>
  );
}
