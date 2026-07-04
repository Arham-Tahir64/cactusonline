import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCactusStore } from '../store';
import { DECK_POS, DISCARD_POS, CARD_H, CARD_LIFT, type Vec3 } from './layout';
import Card3D from './Card3D';

export default function CenterPiles3D() {
  const view = useCactusStore((s) => s.view);
  const matchWindowMs = useCactusStore((s) => s.lobby?.settings?.matchWindowMs ?? 5_000);
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
      {view.matchWindowOpen && (
        <CountdownRing key={view.discardPile.length} durationMs={matchWindowMs} />
      )}
    </group>
  );
}

/**
 * Shrinking arc around the discard pile while the stack window is open —
 * the 3D counterpart of the 2D countdown bar, sized by the same lobby rule.
 */
function CountdownRing({ durationMs }: { durationMs: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startedAt = useMemo(() => performance.now(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const frac = Math.max(0.001, 1 - (performance.now() - startedAt) / durationMs);
    mesh.geometry.dispose();
    mesh.geometry = new THREE.RingGeometry(0.78, 0.92, 48, 1, Math.PI / 2, frac * Math.PI * 2);
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[DISCARD_POS[0], 0.012, DISCARD_POS[2]]}
    >
      <ringGeometry args={[0.78, 0.92, 48]} />
      <meshBasicMaterial color="#e0952a" transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}
