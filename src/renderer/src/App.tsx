import { PointerEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from './pdfWorkerEntry?worker&url'
import {
  initialStrokeState,
  makeStrokeId,
  Stroke,
  strokeReducer,
  StrokePoint,
  Tool
} from './strokeState'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type PdfViewport = {
  width: number
  height: number
}

type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport; intent?: 'display' | 'print' }) => {
    promise: Promise<void>
    cancel: () => void
  }
}

type PdfDocument = {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfPage>
}

type PointerStats = {
  type: string
  pressure: number
  buttons: number
  isPrimary: boolean
}

const pageHorizontalPadding = 48
const maxPageWidth = 980
const penWidth = 4
const eraserRadiusPx = 18

export default function App(): JSX.Element {
  const [pdfDocument, setPdfDocument] = useState<PdfDocument | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [renderedPages, setRenderedPages] = useState<number[]>([])
  const [tool, setTool] = useState<Tool>('pen')
  const [containerWidth, setContainerWidth] = useState(900)
  const [pointerStats, setPointerStats] = useState<PointerStats | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [strokeState, dispatch] = useReducer(strokeReducer, initialStrokeState)

  const handlePageRendered = useCallback((renderedPage: number) => {
    setRenderedPages((current) => (current.includes(renderedPage) ? current : [...current, renderedPage]))
  }, [])

  const handleRenderError = useCallback((message: string) => {
    setLoadError(message)
  }, [])

  useEffect(() => {
    const element = scrollRef.current

    if (!element) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width

      if (width) {
        setContainerWidth(width)
      }
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  async function openPdf(): Promise<void> {
    setLoadError(null)
    const filePath = await window.electronApi.openPdf()

    if (!filePath) {
      return
    }

    try {
      setIsLoading(true)
      const data = await window.electronApi.readPdf(filePath)
      const loaded = await getDocument({ data: new Uint8Array(data) }).promise

      setPdfDocument(loaded as PdfDocument)
      setPdfName(filePath.split(/[\\/]/).at(-1) ?? filePath)
      setRenderedPages([])
      dispatch({ type: 'clear' })
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to open PDF.')
    } finally {
      setIsLoading(false)
    }
  }

  const pageNumbers = useMemo(() => {
    if (!pdfDocument) {
      return []
    }

    return Array.from({ length: pdfDocument.numPages }, (_item, index) => index + 1)
  }, [pdfDocument])

  const pageWidth = Math.min(Math.max(containerWidth - pageHorizontalPadding, 320), maxPageWidth)

  return (
    <main className="app-shell">
      <header className="toolbar">
        <div className="toolbar-group">
          <button className="primary-button" type="button" onClick={openPdf} disabled={isLoading}>
            Open PDF
          </button>
          <div className="segmented-control" aria-label="Drawing tool">
            <button
              type="button"
              className={tool === 'pen' ? 'active' : ''}
              aria-pressed={tool === 'pen'}
              onClick={() => setTool('pen')}
            >
              Pen
            </button>
            <button
              type="button"
              className={tool === 'eraser' ? 'active' : ''}
              aria-pressed={tool === 'eraser'}
              onClick={() => setTool('eraser')}
            >
              Eraser
            </button>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'undo' })}
            disabled={strokeState.undoStack.length === 0}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'redo' })}
            disabled={strokeState.redoStack.length === 0}
          >
            Redo
          </button>
        </div>
        <div className="diagnostics" aria-live="polite">
          {pointerStats
            ? `${pointerStats.type} pressure ${pointerStats.pressure.toFixed(2)} buttons ${pointerStats.buttons} primary ${pointerStats.isPrimary ? 'yes' : 'no'}`
            : 'No pointer input yet'}
        </div>
      </header>

      <section ref={scrollRef} className="document-scroll">
        {!pdfDocument ? (
          <div className="empty-state">
            <h1>PDF Pen Spike</h1>
            <p>Open a local PDF, then try pen input, erasing, undo, redo, palm rejection, and scrolling.</p>
            {loadError ? <p className="error-text">{loadError}</p> : null}
          </div>
        ) : (
          <>
            <div className="document-title">
              <strong>{pdfName}</strong>
              <span>
                {strokeState.strokes.length} stroke{strokeState.strokes.length === 1 ? '' : 's'}
              </span>
            </div>
            {loadError ? <div className="error-banner">{loadError}</div> : null}
            <div className="page-stack">
              {pageNumbers.map((pageNumber) => (
                <PdfPageView
                  key={pageNumber}
                  document={pdfDocument}
                  pageNumber={pageNumber}
                  width={pageWidth}
                  strokes={strokeState.strokes.filter((stroke) => stroke.pageNumber === pageNumber)}
                  tool={tool}
                  scrollContainerRef={scrollRef}
                  onStrokeComplete={(stroke) => dispatch({ type: 'addStroke', stroke })}
                  onEraseStrokes={(strokeIds) => dispatch({ type: 'eraseStrokes', strokeIds })}
                  onPointerStats={setPointerStats}
                  onRendered={handlePageRendered}
                  onRenderError={handleRenderError}
                />
              ))}
            </div>
            {renderedPages.length === 0 ? (
              <div className="rendering-banner" role="status" aria-live="polite">
                Rendering {pageNumbers.length} page{pageNumbers.length === 1 ? '' : 's'}...
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}

type PdfPageViewProps = {
  document: PdfDocument
  pageNumber: number
  width: number
  strokes: Stroke[]
  tool: Tool
  scrollContainerRef: RefObject<HTMLDivElement | null>
  onStrokeComplete: (stroke: Stroke) => void
  onEraseStrokes: (strokeIds: string[]) => void
  onPointerStats: (stats: PointerStats) => void
  onRendered: (pageNumber: number) => void
  onRenderError: (message: string) => void
}

function PdfPageView({
  document,
  pageNumber,
  width,
  strokes,
  tool,
  scrollContainerRef,
  onStrokeComplete,
  onEraseStrokes,
  onPointerStats,
  onRendered,
  onRenderError
}: PdfPageViewProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const activeStrokeRef = useRef<StrokePoint[]>([])
  const erasedStrokeIdsRef = useRef<Set<string>>(new Set())
  const activeTouchDragRef = useRef<{
    pointerId: number
    startClientX: number
    startClientY: number
    startScrollTop: number
    startScrollLeft: number
  } | null>(null)
  const [page, setPage] = useState<PdfPage | null>(null)
  const [draftStroke, setDraftStroke] = useState<StrokePoint[]>([])
  const [viewportSize, setViewportSize] = useState<PdfViewport | null>(null)
  const [pageStatus, setPageStatus] = useState<'idle' | 'loading' | 'rendering' | 'ready' | 'error'>('idle')
  const dimensions = viewportSize ?? { width, height: Math.round(width * 1.3) }

  useEffect(() => {
    let isCancelled = false

    setPage(null)
    setViewportSize(null)
    setPageStatus('loading')

    document
      .getPage(pageNumber)
      .then((loadedPage) => {
        if (!isCancelled) {
          setPage(loadedPage)
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setPageStatus('error')
          onRenderError(error instanceof Error ? error.message : `Failed to load page ${pageNumber}.`)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [document, pageNumber, onRenderError])

  useEffect(() => {
    if (!page) {
      return
    }

    const baseViewport = page.getViewport({ scale: 1 })
    const scale = width / baseViewport.width
    const viewport = page.getViewport({ scale })
    setViewportSize({ width: viewport.width, height: viewport.height })
  }, [page, width])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !page || !viewportSize) {
      return
    }

    const baseViewport = page.getViewport({ scale: 1 })
    const scale = width / baseViewport.width
    const viewport = page.getViewport({ scale })
    const pixelRatio = window.devicePixelRatio || 1
    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    canvas.width = Math.floor(viewport.width * pixelRatio)
    canvas.height = Math.floor(viewport.height * pixelRatio)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, viewport.width, viewport.height)

    setPageStatus('rendering')
    const renderTask = page.render({ canvasContext: context, viewport, intent: 'print' })

    renderTask.promise
      .then(() => {
        setPageStatus('ready')
        onRendered(pageNumber)
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'RenderingCancelledException') {
          setPageStatus('error')
          onRenderError(error.message)
        }
      })

    return () => renderTask.cancel()
  }, [page, width, viewportSize, pageNumber, onRendered, onRenderError])

  function pointFromEvent(event: PointerEvent<SVGSVGElement>): StrokePoint {
    const bounds = event.currentTarget.getBoundingClientRect()

    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
      pressure: event.pressure,
      time: event.timeStamp
    }
  }

  function updateDiagnostics(event: PointerEvent<SVGSVGElement>): void {
    onPointerStats({
      type: event.pointerType || 'unknown',
      pressure: event.pressure,
      buttons: event.buttons,
      isPrimary: event.isPrimary
    })
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>): void {
    if (event.pointerType === 'touch') {
      updateDiagnostics(event)
      event.currentTarget.setPointerCapture(event.pointerId)
      event.preventDefault()

      const scrollContainer = scrollContainerRef.current

      if (scrollContainer) {
        activeTouchDragRef.current = {
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startScrollTop: scrollContainer.scrollTop,
          startScrollLeft: scrollContainer.scrollLeft
        }
      }

      return
    }

    if (!isDrawablePointer(event)) {
      return
    }

    updateDiagnostics(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()

    const point = pointFromEvent(event)

    if (tool === 'pen') {
      activeStrokeRef.current = [point]
      setDraftStroke([point])
      return
    }

    erasedStrokeIdsRef.current = new Set()
    collectEraserHits(point)
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>): void {
    if (event.pointerType === 'touch') {
      updateDiagnostics(event)

      const dragState = activeTouchDragRef.current
      const scrollContainer = scrollContainerRef.current

      if (
        dragState &&
        scrollContainer &&
        dragState.pointerId === event.pointerId &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.preventDefault()
        scrollContainer.scrollTop = dragState.startScrollTop - (event.clientY - dragState.startClientY)
        scrollContainer.scrollLeft = dragState.startScrollLeft - (event.clientX - dragState.startClientX)
      }

      return
    }

    if (!isDrawablePointer(event) || event.buttons === 0) {
      return
    }

    updateDiagnostics(event)
    event.preventDefault()
    const point = pointFromEvent(event)

    if (tool === 'pen') {
      activeStrokeRef.current = [...activeStrokeRef.current, point]
      setDraftStroke(activeStrokeRef.current)
      return
    }

    collectEraserHits(point)
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>): void {
    updateDiagnostics(event)
    event.preventDefault()

    if (event.pointerType === 'touch') {
      activeTouchDragRef.current = null

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      return
    }

    if (tool === 'pen') {
      const points = activeStrokeRef.current
      activeStrokeRef.current = []
      setDraftStroke([])

      if (points.length >= 2) {
        onStrokeComplete({
          id: makeStrokeId(),
          pageNumber,
          points,
          width: penWidth
        })
      }
    } else {
      const strokeIds = Array.from(erasedStrokeIdsRef.current)
      erasedStrokeIdsRef.current = new Set()

      if (strokeIds.length > 0) {
        onEraseStrokes(strokeIds)
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function collectEraserHits(point: StrokePoint): void {
    for (const stroke of strokes) {
      if (erasedStrokeIdsRef.current.has(stroke.id)) {
        continue
      }

      if (strokeHitTest(stroke, point, dimensions, eraserRadiusPx)) {
        erasedStrokeIdsRef.current.add(stroke.id)
      }
    }
  }

  return (
    <article className="pdf-page" style={{ width: dimensions.width, height: dimensions.height }}>
      <canvas ref={canvasRef} className="pdf-canvas" />
      <svg
        className={`ink-layer ${tool}`}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {strokes.map((stroke) => (
          <polyline
            key={stroke.id}
            className="stroke"
            points={toPolylinePoints(stroke.points, dimensions)}
            strokeWidth={stroke.width}
          />
        ))}
        {draftStroke.length > 1 ? (
          <polyline className="stroke draft" points={toPolylinePoints(draftStroke, dimensions)} strokeWidth={penWidth} />
        ) : null}
      </svg>
      <div className="page-number">Page {pageNumber}</div>
      {pageStatus !== 'ready' ? <div className="page-status">{pageStatus}</div> : null}
    </article>
  )
}

function isDrawablePointer(event: PointerEvent<SVGSVGElement>): boolean {
  return event.pointerType === 'pen' || event.pointerType === 'mouse' || event.pointerType === ''
}

function toPolylinePoints(points: StrokePoint[], size: { width: number; height: number }): string {
  return points.map((point) => `${point.x * size.width},${point.y * size.height}`).join(' ')
}

function strokeHitTest(
  stroke: Stroke,
  eraserPoint: StrokePoint,
  size: { width: number; height: number },
  radius: number
): boolean {
  if (stroke.points.length === 0) {
    return false
  }

  const target = { x: eraserPoint.x * size.width, y: eraserPoint.y * size.height }

  for (let index = 1; index < stroke.points.length; index += 1) {
    const start = { x: stroke.points[index - 1].x * size.width, y: stroke.points[index - 1].y * size.height }
    const end = { x: stroke.points[index].x * size.width, y: stroke.points[index].y * size.height }

    if (distanceToSegment(target, start, end) <= radius) {
      return true
    }
  }

  return false
}

function distanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1)
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
