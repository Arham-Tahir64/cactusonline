import * as THREE from 'three';
import type { Card } from '@engine/types';
import { isRed } from '../cardLabel';

/**
 * Procedural card textures: each face is drawn once to an offscreen canvas
 * (same design language as the 2D PlayingCard — white face, corner indices,
 * big center suit, red lattice back) and cached for the whole session.
 */

const SUIT_SYMBOLS: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

const W = 256;
const H = Math.round(W * 1.4); // 5:7
const RADIUS = Math.round(W * 0.08);

const faceCache = new Map<string, THREE.CanvasTexture>();
let backTexture: THREE.CanvasTexture | null = null;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function cardFaceTexture(card: Card): THREE.CanvasTexture {
  const cached = faceCache.get(card.id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // White face with a subtle border.
  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, 0, 0, W, H, RADIUS);
  ctx.fill();
  ctx.strokeStyle = '#c7c7c7';
  ctx.lineWidth = 3;
  roundedRect(ctx, 1.5, 1.5, W - 3, H - 3, RADIUS);
  ctx.stroke();

  const color = isRed(card) ? '#c0203a' : '#161616';
  const symbol = SUIT_SYMBOLS[card.suit] ?? card.suit;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';

  // Corner indices (top-left, and bottom-right rotated 180°).
  const drawCorner = () => {
    ctx.font = `700 ${W * 0.155}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(card.rank, W * 0.14, H * 0.045);
    ctx.font = `700 ${W * 0.13}px system-ui, sans-serif`;
    ctx.fillText(symbol, W * 0.14, H * 0.045 + W * 0.16);
  };
  drawCorner();
  ctx.save();
  ctx.translate(W, H);
  ctx.rotate(Math.PI);
  drawCorner();
  ctx.restore();

  // Big center suit.
  ctx.font = `700 ${W * 0.42}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.9;
  ctx.fillText(symbol, W / 2, H / 2);
  ctx.globalAlpha = 1;

  const texture = makeTexture(canvas);
  faceCache.set(card.id, texture);
  return texture;
}

export function cardBackTexture(): THREE.CanvasTexture {
  if (backTexture) return backTexture;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // White frame around a red lattice panel — same as the 2D card back.
  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, 0, 0, W, H, RADIUS);
  ctx.fill();

  const inset = Math.round(W * 0.05);
  ctx.save();
  roundedRect(ctx, inset, inset, W - inset * 2, H - inset * 2, RADIUS * 0.7);
  ctx.clip();
  ctx.fillStyle = '#b21f2d';
  ctx.fillRect(inset, inset, W - inset * 2, H - inset * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 4;
  const step = 14;
  for (let d = -H; d < W + H; d += step) {
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d + H, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(d + H, 0);
    ctx.lineTo(d, H);
    ctx.stroke();
  }
  ctx.restore();

  backTexture = makeTexture(canvas);
  return backTexture;
}
