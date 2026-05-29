import type { StrokePoint } from './strokeState'

export type CursorMode = 'mouse' | 'pen' | 'eraser'

export type PenPointerEventLike = {
  pointerType: string
  button: number
  buttons: number
}

const pressureBoost = 0.5

export function resolveCursorMode(event: PenPointerEventLike): CursorMode {
  if (isPenEraserEvent(event)) {
    return 'eraser'
  }

  if (event.pointerType === 'pen') {
    return 'pen'
  }

  return 'mouse'
}

export function resolveInkMode(event: PenPointerEventLike): Exclude<CursorMode, 'mouse'> {
  return isPenEraserEvent(event) ? 'eraser' : 'pen'
}

export function pressureAdjustedWidth(baseWidth: number, pressure: number): number {
  return baseWidth * (1 + pressureBoost * clamp(pressure, 0, 1))
}

export function segmentWidthForPoints(
  start: StrokePoint,
  end: StrokePoint,
  baseWidth: number
): number {
  return pressureAdjustedWidth(baseWidth, (start.pressure + end.pressure) / 2)
}

export function segmentHitPadding(
  start: StrokePoint,
  end: StrokePoint,
  baseWidth: number,
  eraserRadiusPx: number
): number {
  return eraserRadiusPx + segmentWidthForPoints(start, end, baseWidth) / 2
}

function isPenEraserEvent(event: PenPointerEventLike): boolean {
  return event.pointerType === 'pen' && (event.button === 5 || (event.buttons & 32) !== 0)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
