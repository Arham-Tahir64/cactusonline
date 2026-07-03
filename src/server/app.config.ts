import config from '@colyseus/tools';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CactusRoom } from './CactusRoom.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public');

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define('cactus', CactusRoom);
  },
  initializeExpress: (app) => {
    app.use(express.static(publicDir));
  },
});
