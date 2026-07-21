const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const endpoint = process.env.VITE_COLYSEUS_URL?.trim();
let parsedEndpoint;
try {
  parsedEndpoint = new URL(endpoint);
} catch {
  console.error('Desktop packaging requires VITE_COLYSEUS_URL with a valid secure wss:// endpoint.');
  process.exit(1);
}
if (
  parsedEndpoint.protocol !== 'wss:' ||
  parsedEndpoint.username ||
  parsedEndpoint.password ||
  parsedEndpoint.hash
) {
  console.error(
    'Desktop packaging requires VITE_COLYSEUS_URL to use wss:// without embedded credentials or a fragment.',
  );
  process.exit(1);
}

const normalizedEndpoint = parsedEndpoint.href.replace(/\/+$/, '');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(
  npm,
  ['run', 'build', '--prefix', '../client', '--', '--outDir', '../desktop/renderer'],
  {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, VITE_COLYSEUS_URL: normalizedEndpoint },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);

if (result.error) console.error(result.error.message);
if (result.status !== 0) process.exit(result.status ?? 1);

const rendererDirectory = path.join(__dirname, '..', 'renderer');
fs.writeFileSync(
  path.join(rendererDirectory, 'desktop-config.json'),
  `${JSON.stringify({ version: 1, colyseusUrl: normalizedEndpoint }, null, 2)}\n`,
  'utf8',
);
