import { Client } from 'colyseus.js';
import { resolveEndpoint } from './endpoint';
import { readServerEndpoint } from './serverEndpoint';

export const packagedServerEndpoint = import.meta.env.VITE_COLYSEUS_URL;

export function createColyseusClient(endpointOverride?: string): Client {
  const endpoint = resolveEndpoint(
    location,
    endpointOverride || readServerEndpoint() || packagedServerEndpoint,
    import.meta.env.DEV,
  );
  return new Client(endpoint);
}
