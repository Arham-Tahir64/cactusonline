import { Client } from 'colyseus.js';

// In dev, Vite serves the client on :5173 while Colyseus runs on :2567.
// In production, the client is built into the server's public/ dir and
// served same-origin, so we can derive the endpoint from location.
const endpoint = import.meta.env.DEV
  ? 'ws://localhost:2567'
  : `${location.protocol.replace('http', 'ws')}//${location.host}`;

export const client = new Client(endpoint);
