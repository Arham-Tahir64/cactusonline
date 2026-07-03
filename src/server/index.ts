import { listen } from '@colyseus/tools';
import appConfig from './app.config.js';

// Serves the Colyseus WebSocket endpoint and the static client on the same port.
listen(appConfig, Number(process.env.PORT ?? 2567));
