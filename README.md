# Indico Pen Spike

Throwaway Electron spike for testing whether Chromium pointer events feel good enough for pen annotations over a rendered PDF on the target Windows device.

## Run

```bash
npm install
npm run dev
```

`npm install` primes Electron for this spike. If you skip install and go straight to `npm run dev`, it will fail fast and tell you to install first.

## Verify

```bash
npm run test
npm run typecheck
npm run build
```

## Hardware Verdict Checklist

Open a representative PDF, write on several pages, erase strokes, undo and redo, then record:

- Stylus event smoothness:
- Writing latency:
- Palm rejection:
- Scroll versus draw conflicts:
- Pressure values useful or noisy:
- Pen eraser end detected separately:
- Conference device result:
- Verdict: acceptable / questionable / rejected

Pressure and hardware eraser detection are diagnostics only. The spike intentionally keeps erasing as a toolbar mode.
