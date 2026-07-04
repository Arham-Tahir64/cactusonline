import { Html } from '@react-three/drei';
import { useCactusStore } from '../store';
import { DECK_POS, DISCARD_POS, CARD_H, CARD_LIFT, type Vec3 } from './layout';
import Card3D from './Card3D';

export default function CenterPiles3D() {
  const view = useCactusStore((s) => s.view);
  if (!view) return null;

  const top = view.discardPile.at(-1) ?? null;
  const under = view.discardPile.at(-2) ?? null;
  // A short visual stack hinting at how much deck is left.
  const deckDepth = Math.max(1, Math.min(6, Math.round(view.drawPileCount / 8)));
  const labelZ = CARD_H * 0.85;

  return (
    <group>
      {Array.from({ length: deckDepth }, (_, i) => (
        <Card3D
          key={i}
          card={null}
          faceDown
          position={[DECK_POS[0], CARD_LIFT + i * 0.008, DECK_POS[2]] as Vec3}
        />
      ))}
      <Html
        position={[DECK_POS[0], 0.02, DECK_POS[2] + labelZ]}
        center
        distanceFactor={7}
        zIndexRange={[10, 0]}
      >
        <div className="pile-tag">deck ({view.drawPileCount})</div>
      </Html>

      {under && (
        <Card3D card={under} faceDown={false} position={[DISCARD_POS[0], CARD_LIFT, DISCARD_POS[2]]} />
      )}
      {top && (
        <Card3D
          key={top.id} // remount per card: each new discard flips in from above
          card={top}
          faceDown={false}
          position={[DISCARD_POS[0], CARD_LIFT + 0.01, DISCARD_POS[2]]}
          enterFrom={[DISCARD_POS[0], CARD_LIFT + 1.1, DISCARD_POS[2] + 0.3]}
        />
      )}
      <Html
        position={[DISCARD_POS[0], 0.02, DISCARD_POS[2] + labelZ]}
        center
        distanceFactor={7}
        zIndexRange={[10, 0]}
      >
        <div className="pile-tag">discard</div>
      </Html>
    </group>
  );
}
