# Cactus for Windows

The desktop client is a secure Electron shell around the same React renderer used by the browser game. It always connects to the separately hosted authoritative Colyseus server, so web and desktop players share rooms.

## Development

From the repository root:

```powershell
npm run desktop:install
npm run desktop:dev
```

Development loads `http://localhost:5173` and connects to `ws://localhost:2567`. The window keeps Node integration off, enables context isolation and renderer sandboxing, denies permission requests, popups, webviews, cross-origin navigation, and redirects.

## Windows beta artifacts

Production builds require the public secure Colyseus endpoint. In PowerShell:

```powershell
$env:VITE_COLYSEUS_URL = 'wss://cactus.example.com'
npm run desktop:make
```

The command fails before packaging if the endpoint is absent, malformed, insecure, contains credentials, or contains a fragment. It writes the normalized endpoint into the renderer configuration, which the packaged app validates again at startup. The Electron session also applies a response-header CSP whose `connect-src` allows only that WSS origin.

Forge produces two unsigned Windows 10/11 x64 beta artifacts under `desktop/out/make/`:

- `squirrel.windows/x64/Cactus-Windows-x64-Setup.exe` — per-user installer with normal Windows uninstall support.
- `zip/win32/x64/*.zip` — portable build; extract it and run `Cactus.exe` without installing.

Windows SmartScreen may show an unknown-publisher warning because beta artifacts are intentionally unsigned. To uninstall the Squirrel build, use **Settings > Apps > Installed apps > Cactus > Uninstall**. The portable ZIP can be removed by closing Cactus and deleting its extracted folder.

## Verification

```powershell
npm run desktop:test
npm run desktop:smoke
npm run desktop:smoke:packaged # after desktop:make
```

The unit suite covers endpoint validation, CSP construction, exact-origin navigation, and application-protocol path containment. The smoke suite builds a local protocol renderer, launches Electron, and verifies local `cactus://` loading, unavailable Node globals, denied popups, blocked external navigation, configured WSS metadata, and clean shutdown. The packaged variant repeats those checks against the actual unpacked Windows executable emitted by Forge.

Before publishing a beta, also install both artifacts on a clean Windows 10 or 11 x64 machine, confirm the expected unsigned-publisher warning, join a room through the configured WSS endpoint, and verify installer uninstall plus portable-folder removal.
