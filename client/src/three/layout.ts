/**
 * Pure layout math for the 3D table. No React, no three.js objects — just
 * numbers, so every card's target pose is a cheap pure function of the
 * current view. World space: table surface on the XZ plane at y=0, +Y up,
 * "you" seated on the +Z side (nearest the camera).
 */

export type Vec3 = [number, number, number];

export const CARD_W = 0.8;
export const CARD_H = CARD_W * 1.4; // 5:7 like the 2D cards
export const CARD_LIFT = 0.02; // resting height above the felt
const SLOT_GAP = 0.14;

export const SEAT_RADIUS = 4.1;
export const DECK_POS: Vec3 = [-0.75, CARD_LIFT, 0];
export const DISCARD_POS: Vec3 = [0.75, CARD_LIFT, 0];

export interface SeatTransform {
  position: Vec3;
  /** Rotation around Y so the seat's local +Z points outward (toward its player). */
  rotationY: number;
}

/**
 * Seats distributed clockwise starting from "you" at the bottom (+Z) —
 * the same seating convention as the 2D Table.
 */
export function seatTransform(seatIndex: number, seatCount: number): SeatTransform {
  const angle = Math.PI / 2 + (2 * Math.PI * seatIndex) / seatCount;
  const x = SEAT_RADIUS * Math.cos(angle);
  const z = SEAT_RADIUS * Math.sin(angle);
  return { position: [x, 0, z], rotationY: Math.atan2(x, z) };
}

/** Seat-local z of the row nearest the player — boards grow from here toward
    the table center, so a growing board never pushes cards out of frame. */
export const BOTTOM_ROW_Z = 0.62;

/**
 * Board slots in seat-local space: 2 columns, row-major — the same visual
 * order as the 2D board grid, with the "bottom two" (peek row) anchored
 * nearest the player and extra rows extending toward the table center.
 */
export function slotLocalPosition(slotIndex: number, slotCount: number): Vec3 {
  const rows = Math.max(1, Math.ceil(slotCount / 2));
  const col = slotIndex % 2;
  const row = Math.floor(slotIndex / 2);
  const x = (col - 0.5) * (CARD_W + SLOT_GAP);
  const z = BOTTOM_ROW_Z - (rows - 1 - row) * (CARD_H + SLOT_GAP);
  return [x, CARD_LIFT, z];
}

/** Convert a world-space point into a seat's local space (inverse transform),
    e.g. so a newly dealt card can enter from the deck's position. */
export function worldToSeatLocal(world: Vec3, seat: SeatTransform): Vec3 {
  const dx = world[0] - seat.position[0];
  const dz = world[2] - seat.position[2];
  const cos = Math.cos(seat.rotationY);
  const sin = Math.sin(seat.rotationY);
  // Transpose of three.js's Y-rotation matrix (world → local).
  return [dx * cos - dz * sin, world[1] - seat.position[1], dx * sin + dz * cos];
}
