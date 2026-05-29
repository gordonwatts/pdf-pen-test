# Indico Pen Spike Architecture

## Purpose
This repository is a throwaway Electron spike to answer one narrow question:

Can Electron/Chromium on the target Windows pen device provide acceptable stylus behavior over a rendered PDF?

The spike is deliberately small. It is not the Indico app, and it does not include storage, sync, auth, export, or agenda features.

## High-level Flow
1. Electron starts the app and creates the main window.
2. The renderer shows a single toolbar plus a continuously scrolling PDF surface.
3. The user opens a local PDF through the native file picker.
4. The main process reads the file from disk and returns the bytes to the renderer.
5. The renderer passes those bytes to PDF.js and renders pages into canvas elements.
6. Each rendered page has a transparent SVG overlay for pen and eraser input.
7. Strokes live in React state and are undoable / redoable for the current session only.

## Runtime Layers

### Main process
File: `src/main/index.ts`

Responsibilities:
- create the Electron window
- expose IPC handlers for opening a PDF and reading a file
- load the built renderer in dev and production

It does not own document state or stroke state.

### Preload
File: `src/preload/index.ts`

Responsibilities:
- expose a minimal safe API on `window.electronApi`
- bridge renderer calls to main-process IPC

The renderer should only talk to Electron through this API.

### Renderer
Files:
- `src/renderer/src/App.tsx`
- `src/renderer/src/strokeState.ts`
- `src/renderer/src/styles.css`

Responsibilities:
- show the toolbar
- open PDFs
- render pages with PDF.js
- capture pen and mouse pointer input
- manage undo / redo state
- draw black strokes in an SVG overlay
- erase whole strokes by hit testing

The renderer is the only place that knows about the visible PDF view and ink overlay.

## PDF Rendering Model
- A PDF document is loaded into PDF.js from bytes.
- Pages are rendered continuously in a vertical stack.
- Each page gets its own canvas.
- Page geometry is derived from the PDF page viewport.
- The ink overlay is sized to match the page viewport so stroke coordinates can stay normalized.

Current implementation note:
- Page status is shown in the page frame while loading / rendering / erroring.
- Rendering is intentionally kept session-only and does not persist to disk.

## Ink Model
Stroke data is defined in `src/renderer/src/strokeState.ts`.

Stroke shape:
- `id`
- `pageNumber`
- `points[]`
- `width`

Point shape:
- normalized `x`
- normalized `y`
- `pressure`
- event `time`

Behavior:
- pen mode creates strokes from pointer events
- pen pressure adjusts stroke thickness as points are rendered
- the hardware pen eraser is auto-detected from pointer events and removes whole strokes
- the on-screen cursor reflects mouse, pen tip, or eraser mode directly
- undo / redo is implemented as a reducer history stack

## Build and Launch
Files:
- `scripts/build.mjs`
- `scripts/dev.mjs`

Build flow:
- compile main and preload TypeScript into `out/`
- build the renderer with Vite
- rewrite the built renderer HTML so Electron file loading works reliably

Dev flow:
- build first
- then launch Electron against the built app

This avoids the earlier flaky launcher path that produced the `Electron uninstall` failure.

## What Is Intentionally Not Here
Not included in this spike:
- Indico data model
- SQLite
- authentication
- agenda browsing
- markdown export
- cloud sync
- durable persistence

Those belong to the real app only after the pen-on-PDF experience feels acceptable on the target device.

## Current Debug Focus
The app has been tightened to make render state more visible because the current work is about diagnosing PDF rendering behavior on the actual device.

If the PDF area goes blank or gray again, the first things to inspect are:
- whether a page status chip appears
- whether the page canvas is sizing correctly
- whether PDF.js is completing the page render
- whether the built renderer HTML is still using the correct relative asset paths

