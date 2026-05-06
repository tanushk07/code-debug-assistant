// Full-screen annotation modal.
//
//   - Loads the image into a Konva stage scaled to fit the viewport
//   - Free-draw pencil tool (smoothed Konva.Line per stroke)
//   - Undo / Redo with two stacks
//   - On SAVE: rasterise stage to PNG at native resolution, re-upload, hand
//     the new URL back to the parent (which swaps it in `session.images`)
//
// Pencil colour + stroke width are fixed for now; easy to extend later.

import { useEffect, useRef, useState } from 'react'
import { Image as KImage, Layer, Line, Stage } from 'react-konva'
import { getToken } from '../lib/auth.js'

const STROKE_COLOR = '#dc2626'
const STROKE_WIDTH = 4

export default function AnnotationOverlay({ imageUrl, onSave, onClose }) {
  const [img, setImg]             = useState(null)
  const [scale, setScale]         = useState(1)
  const [strokes, setStrokes]     = useState([])    // [{ points: [x1,y1,x2,y2,...] }]
  const [redoStack, setRedoStack] = useState([])
  const [drawing, setDrawing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState(null)
  const stageRef = useRef()

  // Load the image into an HTMLImageElement.
  useEffect(() => {
    const i = new window.Image()
    i.crossOrigin = 'anonymous'
    i.src = imageUrl
    i.onload  = () => setImg(i)
    i.onerror = () => setErr('Could not load image (maybe a CORS issue)')
  }, [imageUrl])

  // Scale image to fit the viewport whenever the image OR window resizes.
  useEffect(() => {
    if (!img) return
    const fit = () => {
      const maxW = window.innerWidth  - 80
      const maxH = window.innerHeight - 200
      setScale(Math.min(1, maxW / img.width, maxH / img.height))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [img])

  // Esc closes
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ---- Drawing handlers (mouse + touch via pointer events) -----------
  function imgCoords(e) {
    const stage = e.target.getStage()
    const p = stage.getPointerPosition()
    return { x: p.x / scale, y: p.y / scale }
  }
  function onPointerDown(e) {
    e.evt.preventDefault?.()
    const { x, y } = imgCoords(e)
    setStrokes((s) => [...s, { points: [x, y] }])
    setRedoStack([])
    setDrawing(true)
  }
  function onPointerMove(e) {
    if (!drawing) return
    e.evt.preventDefault?.()
    const { x, y } = imgCoords(e)
    setStrokes((s) => {
      const last = s[s.length - 1]
      return [...s.slice(0, -1), { ...last, points: [...last.points, x, y] }]
    })
  }
  function onPointerUp() { setDrawing(false) }

  // ---- History --------------------------------------------------------
  function undo() {
    if (!strokes.length) return
    setRedoStack((r) => [...r, strokes[strokes.length - 1]])
    setStrokes((s) => s.slice(0, -1))
  }
  function redo() {
    if (!redoStack.length) return
    setStrokes((s) => [...s, redoStack[redoStack.length - 1]])
    setRedoStack((r) => r.slice(0, -1))
  }
  function clearAll() {
    if (!strokes.length) return
    if (!confirm('Clear all annotations?')) return
    setRedoStack([])
    setStrokes([])
  }

  // ---- Save: rasterise to PNG → upload → hand URL to parent ----------
  async function save() {
    if (!stageRef.current || !img) return
    setSaving(true); setErr(null)
    try {
      // pixelRatio = 1/scale gives native-resolution output even though the
      // stage is rendered scaled-down on screen.
      const dataURL = stageRef.current.toDataURL({
        pixelRatio: 1 / scale,
        mimeType: 'image/png',
      })
      const blob = await (await fetch(dataURL)).blob()

      const fd = new FormData()
      fd.append('image', blob, 'annotated.png')
      const r = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })
      if (!r.ok) {
        let msg = r.statusText
        try { msg = (await r.json()).error || msg } catch {}
        throw new Error(msg)
      }
      const { url } = await r.json()
      onSave(url)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex flex-col select-none"
      role="dialog"
      aria-label="Annotate screenshot"
    >
      {/* Header */}
      <header className="h-10 flex items-center px-4 border-b-2 border-white/40 text-white">
        <span className="font-pixel text-[10px] uppercase tracking-wider">ANNOTATE</span>
        <span className="ml-3 font-terminal text-base opacity-60">
          [ click + drag to draw — esc to close ]
        </span>
        <button
          onClick={onClose}
          className="ml-auto font-pixel text-[10px] px-3 py-1 border-2 border-white text-white hover:bg-white hover:text-black"
          aria-label="Close"
        >
          CLOSE
        </button>
      </header>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        {!img && !err && (
          <div className="font-pixel text-[10px] uppercase text-white">LOADING…</div>
        )}
        {err && (
          <div className="font-terminal text-red-400 text-xl">[ {err} ]</div>
        )}
        {img && (
          <div
            className="border-2 border-white shadow-pixel bg-white"
            style={{ width: img.width * scale, height: img.height * scale, cursor: 'crosshair' }}
          >
            <Stage
              ref={stageRef}
              width={img.width * scale}
              height={img.height * scale}
              scaleX={scale}
              scaleY={scale}
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
            >
              <Layer>
                <KImage image={img} width={img.width} height={img.height} />
                {strokes.map((s, i) => (
                  <Line
                    key={i}
                    points={s.points}
                    stroke={STROKE_COLOR}
                    strokeWidth={STROKE_WIDTH}
                    tension={0.4}
                    lineCap="round"
                    lineJoin="round"
                  />
                ))}
              </Layer>
            </Stage>
          </div>
        )}
      </div>

      {/* Footer toolbar */}
      <footer className="border-t-2 border-white/40 p-3 flex items-center gap-2 justify-center bg-black">
        <button
          onClick={undo}
          disabled={!strokes.length || saving}
          className="font-pixel text-[10px] px-3 py-2 bg-white text-black border-2 border-white hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          ↶ UNDO
        </button>
        <button
          onClick={redo}
          disabled={!redoStack.length || saving}
          className="font-pixel text-[10px] px-3 py-2 bg-white text-black border-2 border-white hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷ REDO
        </button>
        <button
          onClick={clearAll}
          disabled={!strokes.length || saving}
          className="font-pixel text-[10px] px-3 py-2 bg-white text-black border-2 border-white hover:bg-black hover:text-white disabled:opacity-40"
        >
          CLEAR
        </button>
        <span className="font-pixel text-[10px] text-white/60 mx-3">
          {strokes.length} stroke{strokes.length === 1 ? '' : 's'}
        </span>
        <button
          onClick={save}
          disabled={saving || !img}
          className="font-pixel text-[10px] px-4 py-2 bg-red-600 text-white border-2 border-red-600 hover:bg-white hover:text-red-600 disabled:opacity-50 ml-auto"
        >
          {saving ? 'SAVING…' : 'SAVE'}
        </button>
      </footer>
    </div>
  )
}
