# Browser Port Notes

## Quick Assessment

This spike is not browser-runnable as-is, but most of the renderer logic is
portable.

### Would Be Supported In A Browser

- PDF.js rendering from PDF bytes
- The scrolling, multi-page document layout
- Pen, mouse, and touch pointer handling
- Stroke creation, erasing, undo, and redo
- The canvas plus SVG ink overlay approach
- Pointer diagnostics such as pressure and pointer type

### Would Not Be Supported As-Is

- Electron main-process file opening and filesystem reads
- The preload bridge exposed on `window.electronApi`
- Native file picker behavior driven by Electron IPC
- Loading a local file path directly from the browser sandbox

## Browser-Friendly Path

If PDFs are loaded from a URL, the app becomes much more browser-friendly.
The main requirement is that the PDF URL be reachable by the browser, which
usually means same-origin access or CORS headers that allow the fetch.

## Parallel Development Path

A good next step would be to keep the Electron spike as the desktop/device
validation track while building a parallel browser path that reuses the same
renderer logic.

Suggested split:

1. Keep shared code for PDF rendering and ink handling.
2. Replace Electron-specific loading with URL-based loading in the browser.
3. Keep the desktop path for pen hardware testing on the target Windows device.
4. Decide later whether annotations stay session-only or become persisted.

That gives two useful signals at once:

- whether the pen experience is good on the actual device
- whether the same core interaction can work cleanly in a normal browser
