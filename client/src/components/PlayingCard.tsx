import type { Card } from '@engine/types';
import { isRed } from '../cardLabel';

const SUIT_SYMBOLS: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

interface Props {
  card?: Card | null;
  /** Force a face-down back regardless of `card` (e.g. the draw pile). */
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PlayingCard({ card, faceDown, size = 'md', className = '' }: Props) {
  const showBack = faceDown || !card;
  const classes = [
    'playing-card',
    `size-${size}`,
    showBack ? 'face-down' : isRed(card) ? 'red' : 'black',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (showBack) {
    return (
      <div className={classes}>
        <div className="card-back-pattern">
          <span className="card-back-emblem" aria-hidden="true">🌵</span>
        </div>
      </div>
    );
  }

  const symbol = SUIT_SYMBOLS[card.suit] ?? card.suit;

  return (
    <div className={classes}>
      <span className="corner corner-tl">
        <span className="corner-rank">{card.rank}</span>
        <span className="corner-suit">{symbol}</span>
      </span>
      <span className="center-suit">{symbol}</span>
      <span className="corner corner-br">
        <span className="corner-rank">{card.rank}</span>
        <span className="corner-suit">{symbol}</span>
      </span>
    </div>
  );
}
