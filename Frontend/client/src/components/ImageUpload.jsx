// Multi-screenshot panel.
//
//   value:    [{ url }]  — current set of screenshots for the session
//   onChange: (newArray) => void  — called whenever the list changes
//
//   Shows a thumbnail strip with hover-revealed edit (pencil) and delete (X)
//   buttons per image, plus a "+ Add" tile at the end. The edit button opens
//   <AnnotationOverlay>; on save we replace that thumbnail's URL with the
//   newly uploaded annotated image.

import { useRef, useState } from 'react'
import { getToken } from '../lib/auth.js'
import AnnotationOverlay from './AnnotationOverlay.jsx'

const MAX_IMAGES = 8
const MAX_SIZE   = 5 * 1024 * 1024  // 5 MB per file

export default function ImageUpload({ value, onChange }) {
  const images = Array.isArray(value) ? value : []
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState(null)
  const [editIdx, setEditIdx]     = useState(null)  // index of image being annotated
  const fileRef = useRef()

  async function uploadFile(file) {
    if (file.size > MAX_SIZE) throw new Error('File too big (5 MB max)')
    const fd = new FormData()
    fd.append('image', file)
    const BASE = import.meta.env.VITE_API_URL || ''
    const r = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    })
    if (!r.ok) {
      let msg = r.statusText
      try { msg = (await r.json()).error || msg } catch {}
      throw new Error(msg)
    }
    return (await r.json()).url
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setErr(null); setUploading(true)
    try {
      const room = MAX_IMAGES - images.length
      const accepted = files.slice(0, room)
      if (files.length > accepted.length) {
        setErr(`Only ${room} more screenshot${room === 1 ? '' : 's'} allowed (max ${MAX_IMAGES})`)
      }
      const urls = []
      for (const f of accepted) urls.push({ url: await uploadFile(f) })
      onChange([...images, ...urls])
    } catch (e) {
      setErr(e.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function deleteImage(idx) {
    onChange(images.filter((_, i) => i !== idx))
  }

  function replaceImage(idx, newUrl) {
    onChange(images.map((img, i) => (i === idx ? { url: newUrl } : img)))
    setEditIdx(null)
  }

  const canAddMore = images.length < MAX_IMAGES

  return (
    <div className="flex flex-col border-t-2 border-black flex-shrink-0">
      <div className="flex items-center bg-gray-50 border-b-2 border-black h-9 px-3 gap-3">
        <span className="pixel-label">SCREENSHOTS{images.length ? ` (${images.length})` : ''}</span>
        {uploading && <span className="pixel-label opacity-60">UPLOADING…</span>}
        {err && <span className="pixel-label text-red-700">[ {err} ]</span>}
      </div>

      <div className="p-3 flex gap-2 overflow-x-auto">
        {images.map((img, i) => (
          <Thumbnail
            key={img.url + i}
            url={img.url}
            onEdit={() => setEditIdx(i)}
            onDelete={() => deleteImage(i)}
          />
        ))}

        {canAddMore && (
          <label
            className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-black flex items-center justify-center cursor-pointer hover:bg-gray-100 font-pixel text-[10px] uppercase"
            title="Add screenshot"
          >
            + ADD
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              className="sr-only"
            />
          </label>
        )}

        {!images.length && !canAddMore && null}
        {!images.length && (
          <span className="font-terminal text-base opacity-50 self-center pl-1">
            {/* tip */}
            no screenshots yet
          </span>
        )}
      </div>

      {editIdx !== null && images[editIdx] && (
        <AnnotationOverlay
          imageUrl={images[editIdx].url}
          onSave={(newUrl) => replaceImage(editIdx, newUrl)}
          onClose={() => setEditIdx(null)}
        />
      )}
    </div>
  )
}

// ---- Thumbnail -------------------------------------------------------
function Thumbnail({ url, onEdit, onDelete }) {
  return (
    <div className="relative flex-shrink-0 w-20 h-20 border-2 border-black bg-white group overflow-hidden">
      <img
        src={url}
        alt="screenshot"
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Hover toolbar */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="w-8 h-8 bg-white border-2 border-black flex items-center justify-center hover:bg-yellow-200"
          title="Annotate"
          aria-label="Edit / annotate"
        >
          {/* pencil */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 bg-white border-2 border-black flex items-center justify-center hover:bg-red-200"
          title="Delete"
          aria-label="Delete screenshot"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6"  x2="6"  y2="18" />
            <line x1="6"  y1="6"  x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
