export default function ErrorLog({ value = '', onChange }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center bg-gray-50 border-b-2 border-black h-9 px-3 flex-shrink-0">
        <span className="pixel-label">ERROR LOG</span>
      </div>
      <textarea
        className="w-full flex-1 p-3 font-mono text-sm bg-white text-black resize-none outline-none"
        placeholder="Paste your error / stack trace here…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  )
}
