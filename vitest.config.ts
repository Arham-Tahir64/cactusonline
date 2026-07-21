import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Colyseus (via @colyseus/tools) uses child-process IPC signals that clash
    // with vitest's default 'forks' pool; worker threads avoid the conflict.
    pool: 'threads',
    // Server tests open real ports; keep files sequential to avoid collisions.
    fileParallelism: false,
    // Electron shell checks use Node's built-in test runner after compiling the
    // CommonJS main process. Do not ask Vitest to collect those files as suites.
    exclude: [...configDefaults.exclude, 'desktop/test/**'],
  },
});
