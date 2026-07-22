const { spawn } = require('node:child_process');
const { cloudflaredCommand } = require('./tunnel-utils.cjs');

const command = cloudflaredCommand();
const child = spawn(command, ['tunnel', '--url', 'http://localhost:2567'], {
  stdio: 'inherit',
  windowsHide: false,
});

child.on('error', (error) => {
  console.error(`Unable to start cloudflared (${command}): ${error.message}`);
  console.error('Install it with: winget install --id Cloudflare.cloudflared --exact');
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) process.exitCode = 0;
  else process.exitCode = code ?? 1;
});

for (const event of ['SIGINT', 'SIGTERM']) {
  process.on(event, () => child.kill(event));
}
