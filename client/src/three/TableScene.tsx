import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useCactusStore } from '../store';
import Seat3D from './Seat3D';
import CenterPiles3D from './CenterPiles3D';

/**
 * The 3D table. Fixed per-seat camera: the scene is laid out with "you" on
 * the +Z side (nearest the camera), so no camera math is needed per client —
 * layout.ts rotates the seating instead, exactly like the 2D Table does.
 *
 * All UI chrome (action bar, prompts, scoreboard…) stays DOM, overlaid by
 * GameScreen; this canvas renders only the table, cards, and seat tags.
 */
export default function TableScene() {
  return (
    <div className="table-3d-wrap">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 9.4, 8.2], fov: 44, near: 0.1, far: 60 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0.9)}
      >
        <color attach="background" args={['#141b16']} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 10, 5]} intensity={1.1} />
        <directionalLight position={[-6, 8, -4]} intensity={0.25} />
        <Suspense fallback={null}>
          <TableSurface />
          <Seats />
          <CenterPiles3D />
        </Suspense>
      </Canvas>
    </div>
  );
}

/** Players rotated so "you" take seat 0 (+Z) — same convention as the 2D Table. */
function Seats() {
  const view = useCactusStore((s) => s.view);
  const room = useCactusStore((s) => s.room);
  if (!view || !room) return null;

  const me = room.sessionId;
  const myIndex = view.players.findIndex((p) => p.id === me);
  const seated =
    myIndex === -1 ? view.players : [...view.players.slice(myIndex), ...view.players.slice(0, myIndex)];

  return (
    <>
      {seated.map((player, i) => (
        <Seat3D
          key={player.id}
          player={player}
          seatIndex={i}
          seatCount={seated.length}
          isMe={player.id === me}
        />
      ))}
    </>
  );
}

/** Felt disc with a wooden rim. */
function TableSurface() {
  return (
    <group>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[6.4, 6.4, 0.12, 64]} />
        <meshStandardMaterial color="#1e6b45" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.09, 0]}>
        <torusGeometry args={[6.4, 0.22, 16, 96]} />
        <meshStandardMaterial color="#5d3a1e" roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  );
}
