import { useMemo } from 'react';
import * as THREE from 'three';
import type { Card } from '@engine/types';
import { CARD_W, CARD_H, type Vec3 } from './layout';
import { cardFaceTexture, cardBackTexture } from './textures';

interface Props {
  /** Face to show when face-up; null renders as a permanent card back. */
  card: Card | null;
  faceDown: boolean;
  position: Vec3;
  rotationY?: number;
}

// One shared geometry for every card in the scene.
const cardGeometry = new THREE.PlaneGeometry(CARD_W, CARD_H);

/**
 * A card lying on the table. Two single-sided planes back-to-back inside a
 * "flipper" group: rotating the flipper π around X turns the card over its
 * horizontal edge (the flip is animated in a later step; static for now).
 * The face texture's top edge points away from the seat's player, so each
 * player reads their own cards upright.
 */
export default function Card3D({ card, faceDown, position, rotationY = 0 }: Props) {
  const faceTexture = useMemo(() => (card ? cardFaceTexture(card) : null), [card]);
  const backTexture = useMemo(() => cardBackTexture(), []);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group rotation={[faceDown || !faceTexture ? Math.PI : 0, 0, 0]}>
        {faceTexture && (
          <mesh geometry={cardGeometry} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial map={faceTexture} transparent roughness={0.85} />
          </mesh>
        )}
        <mesh geometry={cardGeometry} position={[0, -0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial map={backTexture} transparent roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}
