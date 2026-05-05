import Editor from '@monaco-editor/react'
import { useEffect, useState } from 'react'

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

export default function CodeEditor({ files = [], onChange }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (active >= files.length) setActive(Math.max(0, files.length - 1))
  }, [files.length, active])

  function addFile() {
    const name = prompt('Filename?', `file-${files.length + 1}.js`)
    if (!name) return
    onChange([...files, { name, language: langOf(name), content: '' }])
    setActive(files.length)
  }

  function removeFile(i, e) {
    e?.stopPropagation()
    if (!confirm(`Remove "${files[i].name}"?`)) return
    onChange(files.filter((_, idx) => idx !== i))
  }

  function updateContent(val) {
    onChange(files.map((f, idx) => (idx === active ? { ...f, content: val ?? '' } : f)))
  }

  if (!files.length) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center border-b-2 border-black bg-gray-50 h-9">
          <span className="pixel-label px-3">FILES</span>
          <button
            onClick={addFile}
            className="ml-auto px-3 h-full font-pixel text-[10px] hover:bg-black hover:text-white border-l-2 border-black"
          >
            + ADD FILE
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center font-terminal text-xl opacity-50">
          [ NO FILES — CLICK + ADD FILE ]
        </div>
      </div>
    )
  }

  const f = files[active]

  return (
    <div className="flex flex-col h-full">
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
          onClick={addFile}
          className="px-3 h-full font-pixel text-[10px] hover:bg-black hover:text-white"
          aria-label="Add file"
        >
          +
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          theme="vs"
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
      </div>
    </div>
  )
}
