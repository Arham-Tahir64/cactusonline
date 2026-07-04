import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { useCursor } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { Card } from '@engine/types';
import { CARD_W, CARD_H, type Vec3 } from './layout';
import { cardFaceTexture, cardBackTexture } from './textures';

interface Props {
  /** Face to show when face-up; null renders as a permanent card back. */
  card: Card | null;
  faceDown: boolean;
  position: Vec3;
  rotationY?: number;
  /** Clicking this card would currently do something (drives glow + cursor). */
  selectable?: boolean;
  /** First card of a pending two-card action (jack swap). */
  chosen?: boolean;
  onClick?: () => void;
}

// Shared geometries for every card in the scene.
const cardGeometry = new THREE.PlaneGeometry(CARD_W, CARD_H);
const hitGeometry = new THREE.PlaneGeometry(CARD_W * 1.35, CARD_H * 1.25);
const glowGeometry = new THREE.PlaneGeometry(CARD_W * 1.16, CARD_H * 1.12);

/**
 * A card lying on the table. Two single-sided planes back-to-back inside a
 * "flipper" group; rotating the flipper π around X turns the card over.
 * Picking uses an oversized invisible plane so touch targets stay generous.
 */
export default function Card3D({
  card,
  faceDown,
  position,
  rotationY = 0,
  selectable = false,
  chosen = false,
  onClick,
}: Props) {
  const faceTexture = useMemo(() => (card ? cardFaceTexture(card) : null), [card]);
  const backTexture = useMemo(() => cardBackTexture(), []);
  const [hovered, setHovered] = useState(false);
  useCursor(selectable && hovered);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (selectable) onClick?.();
  };

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {(selectable || chosen) && (
        <mesh geometry={glowGeometry} position={[0, -0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            color={chosen ? '#e09a2a' : hovered ? '#6ea8ff' : '#2a6ff0'}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
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
      {onClick && (
        <mesh
          geometry={hitGeometry}
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        />
      )}
    </group>
  );
}
