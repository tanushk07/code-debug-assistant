import Editor from '@monaco-editor/react'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../lib/theme.js'

const langOf = (name) => {
  const ext = (name.split('.').pop() || '').toLowerCase()
  return {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', go: 'go', rs: 'rust',
    html: 'html', css: 'css',
    json: 'json', md: 'markdown',
    sql: 'sql', sh: 'shell', bash: 'shell',
    yml: 'yaml', yaml: 'yaml', xml: 'xml',
    c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp',
    rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  }[ext] || 'plaintext'
}

const MAX_FILE_SIZE = 1 * 1024 * 1024  // 1 MB per text file

export default function CodeEditor({ files = [], onChange }) {
  const [active, setActive] = useState(0)
  const [theme] = useTheme()
  const [importErr, setImportErr] = useState(null)
  const [dropping, setDropping] = useState(false)
  const fileInputRef = useRef()
  const dragDepth = useRef(0)

  useEffect(() => {
    if (active >= files.length) setActive(Math.max(0, files.length - 1))
  }, [files.length, active])

  function addEmptyFile() {
    const name = prompt('Filename?', `file-${files.length + 1}.js`)
    if (!name) return
    onChange([...files, { name, language: langOf(name), content: '' }])
    setActive(files.length)
  }

  function openPicker() {
    fileInputRef.current?.click()
  }

  async function importFiles(fileList) {
    const arr = Array.from(fileList || []).filter((f) => f.size <= MAX_FILE_SIZE)
    const skipped = (fileList?.length || 0) - arr.length
    if (!arr.length) {
      if (skipped) setImportErr(`Skipped ${skipped} file(s) over 1 MB`)
      return
    }
    setImportErr(skipped ? `Skipped ${skipped} file(s) over 1 MB` : null)
    const imported = []
    for (const f of arr) {
      try {
        const content = await f.text()
        imported.push({ name: f.name, language: langOf(f.name), content })
      } catch {
        // unreadable file — skip
      }
    }
    if (imported.length) {
      onChange([...files, ...imported])
      setActive(files.length)
    }
  }

  function onPickerChange(e) {
    importFiles(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onDragEnter(e) {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    dragDepth.current += 1
    setDropping(true)
  }

  function onDragLeave(e) {
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
    importFiles(e.dataTransfer.files)
  }

  function removeFile(i, e) {
    e?.stopPropagation()
    if (!confirm(`Remove "${files[i].name}"?`)) return
    onChange(files.filter((_, idx) => idx !== i))
  }

  function updateContent(val) {
    onChange(files.map((f, idx) => (idx === active ? { ...f, content: val ?? '' } : f)))
  }

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs'

  // Hidden file input shared by both states
  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      onChange={onPickerChange}
      className="sr-only"
      aria-hidden="true"
    />
  )

  if (!files.length) {
    return (
      <div
        className="flex flex-col h-full relative"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="flex items-center border-b-2 border-black bg-gray-50 h-9">
          <span className="pixel-label px-3">FILES</span>
          {importErr && <span className="pixel-label text-red-700 ml-2">[ {importErr} ]</span>}
          <button
            onClick={openPicker}
            className="ml-auto px-3 h-full font-pixel text-[10px] hover:bg-black hover:text-white border-l-2 border-black"
            title="Open code files from your computer"
          >
            OPEN…
          </button>
          <button
            onClick={addEmptyFile}
            className="px-3 h-full font-pixel text-[10px] hover:bg-black hover:text-white border-l-2 border-black"
          >
            + NEW
          </button>
        </div>
        <div
          className={'flex-1 flex flex-col items-center justify-center font-terminal text-xl opacity-70 cursor-pointer ' + (dropping ? 'cda-drop-active' : '')}
          onClick={openPicker}
        >
          <div className="text-2xl mb-2">[ DROP CODE FILES HERE ]</div>
          <div className="font-pixel text-[10px] tracking-wider opacity-60">OR CLICK TO BROWSE</div>
        </div>
        {hiddenInput}
      </div>
    )
  }

  const f = files[active]

  return (
    <div
      className="flex flex-col h-full relative"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-stretch border-b-2 border-black bg-gray-50 h-9 overflow-x-auto">
        {files.map((file, i) => {
          const isActive = i === active
          return (
            <div
              key={i}
              className={
                'flex items-center border-r-2 border-black ' +
                (isActive ? 'bg-black text-white' : 'hover:bg-gray-100')
              }
            >
              <button
                onClick={() => setActive(i)}
                className="px-3 h-full font-pixel text-[10px] truncate max-w-[12rem]"
                title={file.name}
              >
                {file.name}
              </button>
              <button
                onClick={(e) => removeFile(i, e)}
                className="px-2 h-full font-pixel text-[10px] opacity-60 hover:opacity-100"
                aria-label="Remove file"
              >
                X
              </button>
            </div>
          )
        })}
        <button
          onClick={openPicker}
          className="px-3 h-full font-pixel text-[10px] hover:bg-black hover:text-white border-r-2 border-black"
          title="Open files from disk"
        >
          OPEN…
        </button>
        <button
          onClick={addEmptyFile}
          className="px-3 h-full font-pixel text-[10px] hover:bg-black hover:text-white"
          aria-label="Add empty file"
          title="Add empty file"
        >
          +
        </button>
        {importErr && <span className="pixel-label text-red-700 px-3 self-center">[ {importErr} ]</span>}
      </div>
      <div className="flex-1 min-h-0 relative">
        <Editor
          height="100%"
          theme={monacoTheme}
          language={f?.language || 'plaintext'}
          value={f?.content || ''}
          onChange={updateContent}
          options={{
            minimap: { enabled: false },
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            renderLineHighlight: 'gutter',
            smoothScrolling: false,
          }}
        />
        {dropping && (
          <div className="absolute inset-0 cda-drop-active flex items-center justify-center pointer-events-none">
            <div className="font-pixel text-base tracking-wider">DROP TO IMPORT</div>
          </div>
        )}
      </div>
      {hiddenInput}
    </div>
  )
}
