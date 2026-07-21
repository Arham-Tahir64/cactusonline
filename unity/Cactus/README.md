# Cactus Unity client

Windows-first Unity client for the authoritative TypeScript/Colyseus Cactus server.

Open this directory in Unity `6000.5.4f1`. The project uses URP, the 2D feature set,
the Input System, uGUI, and the Unity Test Framework. Source directories are intentionally
empty until their respective implementation commits.

## Structure

- `Assets/Art` — original game art and reference-only visual studies.
- `Assets/Prefabs` — reusable world and UI prefabs.
- `Assets/Scenes` — boot, lobby, table, and results scenes.
- `Assets/Scripts` — runtime code, grouped by feature as it is introduced.
- `Assets/Tests` — EditMode and PlayMode coverage.
