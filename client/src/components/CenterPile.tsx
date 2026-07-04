import { AnimatePresence, motion } from 'framer-motion';
import { useCactusStore } from '../store';
import PlayingCard from './PlayingCard';

export default function CenterPile() {
  const view = useCactusStore((s) => s.view);
  const matchWindowMs = useCactusStore((s) => s.lobby?.settings?.matchWindowMs ?? 5_000);
  if (!view) return null;
  const top = view.discardPile.at(-1) ?? null;
  const under = view.discardPile.at(-2) ?? null;

  return (
    <div className="center-pile">
      <div className="pile draw-pile">
        <PlayingCard faceDown size="md" />
        <div className="pile-label">deck ({view.drawPileCount})</div>
      </div>
      <div className="pile discard-pile">
        <div className="discard-stack">
          {/* The previous top stays visible under the incoming card so the
              pile never blinks empty mid-animation. */}
          {under && (
            <div className="discard-under">
              <PlayingCard card={under} size="md" />
            </div>
          )}
          <AnimatePresence initial={false}>
            <motion.div
              key={top?.id ?? 'empty'}
              className="discard-top"
              initial={{ y: -22, scale: 1.18, rotate: -8, opacity: 0 }}
              animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              <PlayingCard card={top} size="md" />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="pile-label">discard</div>
        {view.matchWindowOpen && (
          <div className="match-window-badge">
            ⏳ MATCH WINDOW
            <motion.div
              className="match-countdown"
              key={view.discardPile.length}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: matchWindowMs / 1000, ease: 'linear' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
