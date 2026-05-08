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
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const ALLOWED_EXT  = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])

function shortName(name, max = 22) {
  if (name.length <= max) return name
  return name.slice(0, max - 3) + '…'
}

function validateImage(f) {
  const ext = (f.name.split('.').pop() || '').toLowerCase()
  // Trust MIME first; some OSes can send blank type for unusual files.
  const mimeOk = ALLOWED_MIME.has(f.type)
  const extOk  = ALLOWED_EXT.has(ext)
  if (!mimeOk && !extOk) {
    return `${shortName(f.name)}: not a supported image (PNG/JPEG/WEBP/GIF only)`
  }
  if (f.size > MAX_SIZE) {
    return `${shortName(f.name)}: over 5 MB`
  }
  return null
}

export default function ImageUpload({ value, onChange }) {
  const images = Array.isArray(value) ? value : []
  const [uploading, setUploading] = useState(false)
  const [err, setErr]             = useState(null)
  const [editIdx, setEditIdx]     = useState(null)  // index of image being annotated
  const [dropping, setDropping]   = useState(false)
  const fileRef = useRef()
  const dragDepth = useRef(0)

  async function uploadFile(file) {
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

  async function ingest(fileList) {
    const all = Array.from(fileList || [])
    if (!all.length) return
    const errors = []
    const valid  = []
    for (const f of all) {
      const reason = validateImage(f)
      if (reason) errors.push(reason)
      else valid.push(f)
    }

    const room = MAX_IMAGES - images.length
    const accepted = valid.slice(0, room)
    if (valid.length > accepted.length) {
      errors.push(`Only ${room} more screenshot${room === 1 ? '' : 's'} allowed (max ${MAX_IMAGES})`)
    }

    setErr(errors.length ? errors.slice(0, 2).join(' · ') + (errors.length > 2 ? ` · +${errors.length - 2} more` : '') : null)
    if (!accepted.length) {
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
    try {
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

  function handleFiles(e) {
    return ingest(e.target.files)
  }

  function onDragEnter(e) {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    dragDepth.current += 1
    setDropping(true)
  }

  function onDragLeave() {
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDropping(false)
    }
  }

  function onDragOver(e) {
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault()
  }

  function onDrop(e) {
    if (!e.dataTransfer?.files?.length) return
    e.preventDefault()
    dragDepth.current = 0
    setDropping(false)
    ingest(e.dataTransfer.files)
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
    <div
      className={'flex flex-col border-t-2 border-black flex-shrink-0 relative ' + (dropping ? 'cda-drop-active' : '')}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center bg-gray-50 border-b-2 border-black h-9 px-3 gap-3">
        <span className="pixel-label">SCREENSHOTS{images.length ? ` (${images.length})` : ''}</span>
        {uploading && <span className="pixel-label opacity-60">UPLOADING…</span>}
        {err && <span className="pixel-label text-red-700">[ {err} ]</span>}
        <span className="pixel-label opacity-40 ml-auto hidden md:inline">DROP IMAGES HERE</span>
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
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={handleFiles}
              className="sr-only"
            />
          </label>
        )}

        {!images.length && !canAddMore && null}
        {!images.length && (
          <span className="font-terminal text-base opacity-50 self-center pl-1">
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
