export type StrokePoint = {
  x: number
  y: number
  pressure: number
  time: number
}

export type Stroke = {
  id: string
  pageNumber: number
  points: StrokePoint[]
  width: number
}

type AddStrokeHistory = {
  kind: 'add'
  stroke: Stroke
}

type EraseStrokeHistory = {
  kind: 'erase'
  strokes: Stroke[]
}

type HistoryEntry = AddStrokeHistory | EraseStrokeHistory

export type StrokeState = {
  strokes: Stroke[]
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
}

export type StrokeAction =
  | { type: 'addStroke'; stroke: Stroke }
  | { type: 'eraseStrokes'; strokeIds: string[] }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }

export const initialStrokeState: StrokeState = {
  strokes: [],
  undoStack: [],
  redoStack: []
}

function applyHistory(strokes: Stroke[], entry: HistoryEntry): Stroke[] {
  if (entry.kind === 'add') {
    return [...strokes, entry.stroke]
  }

  const erasedIds = new Set(entry.strokes.map((stroke) => stroke.id))
  return strokes.filter((stroke) => !erasedIds.has(stroke.id))
}

function revertHistory(strokes: Stroke[], entry: HistoryEntry): Stroke[] {
  if (entry.kind === 'add') {
    return strokes.filter((stroke) => stroke.id !== entry.stroke.id)
  }

  return [...strokes, ...entry.strokes].sort((a, b) => a.id.localeCompare(b.id))
}

export function strokeReducer(state: StrokeState, action: StrokeAction): StrokeState {
  switch (action.type) {
    case 'addStroke':
      if (action.stroke.points.length < 2) {
        return state
      }

      return {
        strokes: [...state.strokes, action.stroke],
        undoStack: [...state.undoStack, { kind: 'add', stroke: action.stroke }],
        redoStack: []
      }

    case 'eraseStrokes': {
      const ids = new Set(action.strokeIds)
      const erased = state.strokes.filter((stroke) => ids.has(stroke.id))

      if (erased.length === 0) {
        return state
      }

      return {
        strokes: state.strokes.filter((stroke) => !ids.has(stroke.id)),
        undoStack: [...state.undoStack, { kind: 'erase', strokes: erased }],
        redoStack: []
      }
    }

    case 'undo': {
      const entry = state.undoStack.at(-1)

      if (!entry) {
        return state
      }

      return {
        strokes: revertHistory(state.strokes, entry),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, entry]
      }
    }

    case 'redo': {
      const entry = state.redoStack.at(-1)

      if (!entry) {
        return state
      }

      return {
        strokes: applyHistory(state.strokes, entry),
        undoStack: [...state.undoStack, entry],
        redoStack: state.redoStack.slice(0, -1)
      }
    }

    case 'clear':
      return initialStrokeState

    default:
      return state
  }
}

export function makeStrokeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
