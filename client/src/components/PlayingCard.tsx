import { motion } from 'framer-motion';
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

/**
 * Two-faced card with a 3D flip: transitions between face-up and face-down
 * animate a rotateY turn instead of swapping content instantly.
 */
export default function PlayingCard({ card, faceDown, size = 'md', className = '' }: Props) {
  const showBack = faceDown || !card;
  const symbol = card ? (SUIT_SYMBOLS[card.suit] ?? card.suit) : '';

  return (
    <div className={['card-flip', `size-${size}`, className].filter(Boolean).join(' ')}>
      <motion.div
        className="card-flip-inner"
        initial={false}
        animate={{ rotateY: showBack ? 180 : 0 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      >
        <div
          className={[
            'playing-card',
            'card-face',
            'front',
            `size-${size}`,
            card ? (isRed(card) ? 'red' : 'black') : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {card && (
            <>
              <span className="corner corner-tl">
                <span className="corner-rank">{card.rank}</span>
                <span className="corner-suit">{symbol}</span>
              </span>
              <span className="center-suit">{symbol}</span>
              <span className="corner corner-br">
                <span className="corner-rank">{card.rank}</span>
                <span className="corner-suit">{symbol}</span>
              </span>
            </>
          )}
        </div>
        <div className={`playing-card card-face back face-down size-${size}`}>
          <div className="card-back-pattern" />
        </div>
      </motion.div>
    </div>
  );
}
