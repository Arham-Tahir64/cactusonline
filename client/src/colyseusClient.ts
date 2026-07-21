import { Client } from 'colyseus.js';

export function resolveEndpoint(
  currentLocation: Pick<Location, 'protocol' | 'host'>,
  configured = import.meta.env.VITE_COLYSEUS_URL,
  isDev = import.meta.env.DEV,
): string {
  const override = configured?.trim();
  if (override) {
    if (!/^wss?:\/\//i.test(override)) {
      throw new Error('VITE_COLYSEUS_URL must begin with ws:// or wss://');
    }
    return override.replace(/\/$/, '');
  }

  if (isDev) return 'ws://localhost:2567';
  if (currentLocation.protocol === 'https:') return `wss://${currentLocation.host}`;
  if (currentLocation.protocol === 'http:') return `ws://${currentLocation.host}`;

  throw new Error('A secure VITE_COLYSEUS_URL is required for the desktop build.');
}

const endpoint = resolveEndpoint(location);

export const client = new Client(endpoint);
