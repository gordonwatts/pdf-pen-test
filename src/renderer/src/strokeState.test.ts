import { describe, expect, it } from 'vitest'
import { initialStrokeState, Stroke, strokeReducer } from './strokeState'

function stroke(id: string): Stroke {
  return {
    id,
    pageNumber: 1,
    width: 4,
    points: [
      { x: 0.1, y: 0.1, pressure: 0.5, time: 1 },
      { x: 0.2, y: 0.2, pressure: 0.5, time: 2 }
    ]
  }
}

describe('strokeReducer', () => {
  it('adds strokes and supports undo/redo', () => {
    const first = stroke('a')
    const added = strokeReducer(initialStrokeState, { type: 'addStroke', stroke: first })
    const undone = strokeReducer(added, { type: 'undo' })
    const redone = strokeReducer(undone, { type: 'redo' })

    expect(added.strokes).toEqual([first])
    expect(undone.strokes).toEqual([])
    expect(redone.strokes).toEqual([first])
  })

  it('erases strokes as an undoable action', () => {
    const first = stroke('a')
    const second = stroke('b')
    const withStrokes = [first, second].reduce(
      (state, item) => strokeReducer(state, { type: 'addStroke', stroke: item }),
      initialStrokeState
    )
    const erased = strokeReducer(withStrokes, { type: 'eraseStrokes', strokeIds: ['a'] })
    const restored = strokeReducer(erased, { type: 'undo' })

    expect(erased.strokes).toEqual([second])
    expect(restored.strokes.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('clears redo history after a new stroke', () => {
    const first = stroke('a')
    const second = stroke('b')
    const added = strokeReducer(initialStrokeState, { type: 'addStroke', stroke: first })
    const undone = strokeReducer(added, { type: 'undo' })
    const branched = strokeReducer(undone, { type: 'addStroke', stroke: second })
    const redoAttempt = strokeReducer(branched, { type: 'redo' })

    expect(branched.redoStack).toEqual([])
    expect(redoAttempt.strokes).toEqual([second])
  })
})
