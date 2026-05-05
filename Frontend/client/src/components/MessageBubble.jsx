import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

const blockStyle = {
  background: '#fafafa',
  border: '2px solid #000',
  padding: '0.6rem 0.75rem',
  margin: 0,
  fontSize: '0.82rem',
  lineHeight: 1.4,
  fontFamily: '"JetBrains Mono", monospace',
}

// react-markdown v9 dropped the `inline` prop, so we detect block code via the
// language- className it sets on fenced blocks. No language class → inline.
const codeRenderer = ({ className, children, ...rest }) => {
  const match = /language-(\w+)/.exec(className || '')
  if (!match) {
    return (
      <code
        {...rest}
        className="bg-gray-100 px-1 border border-black/30 font-mono text-[0.9em]"
      >
        {children}
      </code>
    )
  }
  return (
    <SyntaxHighlighter
      language={match[1]}
      PreTag="div"
      useInlineStyles={false}
      customStyle={blockStyle}
      codeTagProps={{ style: { fontFamily: '"JetBrains Mono", monospace' } }}
    >
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  )
}

// Render markdown paragraphs as <div>. Avoids the "<p> cannot contain a
// nested <div>" warning when a paragraph contains things like a code block
// rendered as a div.
const paragraphRenderer = ({ children }) => (
  <div className="md-p my-2">{children}</div>
)

const MD_COMPONENTS = { code: codeRenderer, p: paragraphRenderer }

function ClassificationCard({ data }) {
  if (!data?.errors?.length) return null
  return (
    <div className="border-2 border-black p-2 mb-3 bg-yellow-50">
      <div className="pixel-label mb-1">DETECTED ERRORS ({data.errors.length})</div>
      <ul className="font-terminal text-base space-y-1">
        {data.errors.map((e, i) => (
          <li key={i}>
            <span className="font-bold">{e.type}</span>
            {e.location ? <> @ {e.location}</> : null}
            {e.summary  ? <>: {e.summary}</>  : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function MessageBubble({ role, content, classification, live }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] bg-black text-white p-3 border-2 border-black shadow-pixel-sm">
          <div className="pixel-label mb-1 opacity-60">YOU</div>
          <div className="font-terminal text-lg whitespace-pre-wrap break-words">
            {content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="bg-white p-3 border-2 border-black shadow-pixel-sm w-full">
        <div className="pixel-label mb-1 opacity-60">
          ASSISTANT{live ? ' …' : ''}
        </div>
        <ClassificationCard data={classification} />
        <div className="markdown-body break-words">
          <ReactMarkdown components={MD_COMPONENTS}>
            {content || ''}
          </ReactMarkdown>
        </div>
        {live && (
          <span className="inline-block w-2 h-4 bg-black ml-1 align-middle animate-pulse" />
        )}
      </div>
    </div>
  )
}
