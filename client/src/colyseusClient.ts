import { Client } from 'colyseus.js';
import { resolveEndpoint } from './endpoint';

const endpoint = resolveEndpoint(location, import.meta.env.VITE_COLYSEUS_URL, import.meta.env.DEV);

export const client = new Client(endpoint);
