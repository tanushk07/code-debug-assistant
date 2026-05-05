import { useEffect, useRef, useState } from 'react'
import { Image as KImage, Layer, Rect, Stage } from 'react-konva'
import { getToken } from '../lib/auth.js'

export default function ImageUpload({ value, onChange }) {
  const [img, setImg]            = useState(null)
  const [rects, setRects]        = useState([])
  const [uploading, setUploading]= useState(false)
  const [err, setErr]            = useState(null)
  const drawing = useRef(null)
  const fileRef = useRef()

  // Load the URL into an HTMLImageElement so Konva can render it.
  useEffect(() => {
    if (!value) { setImg(null); setRects([]); return }
    const i = new window.Image()
    i.crossOrigin = 'anonymous'
    i.src = value
    i.onload  = () => setImg(i)
    i.onerror = () => setErr('Could not load image')
  }, [value])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErr('File too big (5 MB max)'); return }
    setErr(null); setUploading(true); setRects([])
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })
      if (!res.ok) {
        let msg = res.statusText
        try { msg = (await res.json()).error || msg } catch {}
        throw new Error(msg)
      }
      const { url } = await res.json()
      onChange(url)
    } catch (e) {
      setErr(e.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Konva drawing handlers
  function onDown(e) {
    const pos = e.target.getStage().getPointerPosition()
    drawing.current = { x: pos.x, y: pos.y, w: 0, h: 0 }
    setRects((r) => [...r, drawing.current])
  }
  function onMove(e) {
    if (!drawing.current) return
    const pos = e.target.getStage().getPointerPosition()
    const next = {
      ...drawing.current,
      w: pos.x - drawing.current.x,
      h: pos.y - drawing.current.y,
    }
    drawing.current = next
    setRects((r) => [...r.slice(0, -1), next])
  }
  function onUp() { drawing.current = null }

  // Scale image so it fits the column
  const MAX_W = 360
  const scale = img ? Math.min(1, MAX_W / img.width) : 1
  const sw = img ? img.width  * scale : 0
  const sh = img ? img.height * scale : 0

  return (
    <div className="flex flex-col border-t-2 border-black">
      <div className="flex items-center bg-gray-50 border-b-2 border-black h-9 px-3 gap-3">
        <span className="pixel-label">SCREENSHOT</span>
        {value && rects.length > 0 && (
          <button onClick={() => setRects([])} className="pixel-label hover:underline">
            CLEAR ANNOTATIONS
          </button>
        )}
        {value && (
          <button onClick={() => onChange(null)} className="ml-auto pixel-label hover:underline">
            REMOVE
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        {!value && (
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="font-terminal text-base"
          />
        )}
        {uploading && <p className="font-terminal text-lg">UPLOADING…</p>}
        {err && <p className="font-terminal text-red-700 text-lg">[ {err} ]</p>}

        {img && (
          <>
            <div className="border-2 border-black inline-block leading-[0]">
              <Stage
                width={sw}
                height={sh}
                onMouseDown={onDown}
                onMouseMove={onMove}
                onMouseUp={onUp}
                onMouseLeave={onUp}
              >
                <Layer>
                  <KImage image={img} width={sw} height={sh} />
                  {rects.map((r, i) => (
                    <Rect
                      key={i}
                      x={r.x} y={r.y} width={r.w} height={r.h}
                      stroke="#dc2626" strokeWidth={2} dash={[4, 4]}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
            <p className="font-terminal text-sm opacity-60">[ click + drag to annotate ]</p>
          </>
        )}
      </div>
    </div>
  )
}
