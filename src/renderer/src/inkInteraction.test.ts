import { describe, expect, it } from 'vitest'
import { pressureAdjustedWidth, resolveCursorMode, resolveInkMode } from './inkInteraction'

describe('inkInteraction', () => {
  it('keeps the base width at zero pressure and grows by 50 percent at full pressure', () => {
    expect(pressureAdjustedWidth(4, 0)).toBe(4)
    expect(pressureAdjustedWidth(4, 1)).toBe(6)
  })

  it('detects the pen eraser from pointer button state', () => {
    expect(resolveCursorMode({ pointerType: 'pen', button: 5, buttons: 32 })).toBe('eraser')
    expect(resolveInkMode({ pointerType: 'pen', button: 5, buttons: 32 })).toBe('eraser')
  })

  it('treats a normal pen contact as pen mode and mouse as mouse mode', () => {
    expect(resolveCursorMode({ pointerType: 'pen', button: 0, buttons: 1 })).toBe('pen')
    expect(resolveCursorMode({ pointerType: 'mouse', button: 0, buttons: 1 })).toBe('mouse')
  })
})
