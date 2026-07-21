const { spawnSync } = require('node:child_process');
const path = require('node:path');

const endpoint = process.env.VITE_COLYSEUS_URL?.trim();
if (!endpoint || !/^wss:\/\//i.test(endpoint)) {
  console.error('Desktop packaging requires VITE_COLYSEUS_URL with a secure wss:// endpoint.');
  process.exit(1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(
  npm,
  ['run', 'build', '--prefix', '../client', '--', '--outDir', '../desktop/renderer'],
  {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, VITE_COLYSEUS_URL: endpoint },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
