# Future Notes

## Keep Electron on a Supported Major

The spike currently uses Electron 39. Electron moves quickly because it tracks
Chromium, and Electron only officially supports the latest three stable major
versions. As of May 28, 2026, Electron 39 is already past its May 5, 2026
end-of-life date.

For future work, prefer upgrading to a currently supported Electron major before
doing deeper PDF or pen-input debugging. At the time this note was written,
Electron 42 was the newest stable major. After upgrading, verify the narrow app
surface:

- `npm run build`
- open `2026-04-29 - Vibe Plotting.pdf`
- confirm pages render visibly
- confirm pen/mouse drawing still works
- confirm eraser, undo, and redo still work

The PDF rendering issue fixed in this spike was partly caused by `pdfjs-dist`
expecting newer JavaScript runtime APIs than Electron 39 provided. Staying on a
supported Electron major should reduce that kind of compatibility friction, but
dependency bumps still need testing because PDF.js and Electron/Chromium can move
at different speeds.
