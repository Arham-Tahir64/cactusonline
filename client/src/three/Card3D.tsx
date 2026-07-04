import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { useCursor } from '@react-three/drei';
import { animated, to, useSpring } from '@react-spring/three';
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
  /** Where the card enters from on mount (e.g. the deck) — a deal animation. */
  enterFrom?: Vec3;
  /** Hold the card raised (private reveal); tilts toward the camera too. */
  lifted?: boolean;
  /** Delay pose updates (drives the staggered final-reveal sweep). */
  delayMs?: number;
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

const FLIP_ARC = 0.42; // how high a card rises mid-flip so it never clips the felt
const LIFT_Y = 0.55; // raised height while privately revealed
const LIFT_TILT = -0.55; // tilt toward the viewer while lifted

/**
 * A card lying on the table, fully spring-animated: position changes glide
 * (board reflow, swaps), flips rotate over the card's horizontal edge and
 * automatically arc upward mid-turn, and `enterFrom` makes the card fly in
 * from the deck when it first appears. Picking uses an oversized invisible
 * plane so touch targets stay generous.
 */
export default function Card3D({
  card,
  faceDown,
  position,
  rotationY = 0,
  enterFrom,
  lifted = false,
  delayMs = 0,
  selectable = false,
  chosen = false,
  onClick,
}: Props) {
  const faceTexture = useMemo(() => (card ? cardFaceTexture(card) : null), [card]);
  const backTexture = useMemo(() => cardBackTexture(), []);
  const [hovered, setHovered] = useState(false);
  useCursor(selectable && hovered);

  const showBack = faceDown || !faceTexture;
  const springs = useSpring({
    px: position[0],
    py: position[1],
    pz: position[2],
    flip: showBack ? Math.PI : 0,
    lift: lifted ? LIFT_Y : 0,
    tilt: lifted ? LIFT_TILT : 0,
    from: enterFrom
      ? { px: enterFrom[0], py: enterFrom[1] + 0.25, pz: enterFrom[2], flip: Math.PI, lift: 0, tilt: 0 }
      : undefined,
    delay: delayMs,
    config: { tension: 150, friction: 22 },
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (selectable) onClick?.();
  };

  return (
    <animated.group
      position-x={springs.px}
      position-y={to([springs.py, springs.flip, springs.lift], (y, f, l) => {
        // sin() of the flip angle peaks mid-turn: the card rises as it flips.
        const arc = Math.sin(Math.min(Math.PI, Math.max(0, f))) * FLIP_ARC;
        return y + arc + l;
      })}
      position-z={springs.pz}
      rotation-y={rotationY}
    >
      {(selectable || chosen) && (
        <mesh geometry={glowGeometry} position={[0, -0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            color={chosen ? '#e09a2a' : hovered ? '#6ea8ff' : '#2a6ff0'}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
      <animated.group rotation-x={to([springs.flip, springs.tilt], (f, t) => f + t)}>
        {faceTexture && (
          <mesh geometry={cardGeometry} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial map={faceTexture} transparent roughness={0.85} />
          </mesh>
        )}
        <mesh geometry={cardGeometry} position={[0, -0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial map={backTexture} transparent roughness={0.85} />
        </mesh>
      </animated.group>
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
    </animated.group>
  );
}
