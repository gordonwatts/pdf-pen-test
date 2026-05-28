# Agent Handoff

Read [ARCHITECTURE.md](./ARCHITECTURE.md) first. It explains the spike’s purpose, runtime layers, data flow, and what is intentionally out of scope.

For day-to-day work on this repo:
- keep changes narrow
- preserve the Electron main / preload / renderer split
- treat the PDF viewer as the whole spike, not the beginning of a larger app
- when debugging blank rendering, inspect the renderer page status and asset loading before assuming PDF content is broken

Useful entry points:
- `src/main/index.ts`
- `src/preload/index.ts`
- `src/renderer/src/App.tsx`
- `src/renderer/src/strokeState.ts`
- `scripts/build.mjs`
- `scripts/dev.mjs`

