// Blocks viewports under MIN_WIDTH with a themed splash.
// Mounted in main.jsx so it intercepts every route.

import { useEffect, useState } from 'react'

const MIN_WIDTH = 1024

function useViewport() {
  const [size, setSize] = useState({
    w: typeof window === 'undefined' ? 1024 : window.innerWidth,
    h: typeof window === 'undefined' ? 768 : window.innerHeight,
  })
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])
  return size
}

// Pixel-art monitor graphic. Drawn as SVG rects so it scales crisply and
// matches the rest of the pixel theme (no anti-aliased curves anywhere).
function PixelMonitor() {
  return (
    <svg
      viewBox="0 0 32 28"
      width="160"
      height="140"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Outer frame */}
      <rect x="2"  y="2"  width="28" height="18" fill="#000" />
      {/* Screen */}
      <rect x="4"  y="4"  width="24" height="14" fill="#fff" />
      {/* Tiny "code lines" inside the screen */}
      <rect x="6"  y="6"  width="8"  height="1" fill="#000" />
      <rect x="6"  y="8"  width="14" height="1" fill="#000" />
      <rect x="6"  y="10" width="6"  height="1" fill="#000" />
      <rect x="6"  y="12" width="12" height="1" fill="#000" />
      <rect x="6"  y="14" width="9"  height="1" fill="#000" />
      {/* Stand neck */}
      <rect x="14" y="20" width="4"  height="3" fill="#000" />
      {/* Base */}
      <rect x="8"  y="23" width="16" height="2" fill="#000" />
    </svg>
  )
}

// Pixel-art phone with a strike-through to make the "no" intent obvious.
function PixelPhoneNo() {
  return (
    <svg
      viewBox="0 0 16 24"
      width="60"
      height="90"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Phone outer frame */}
      <rect x="2"  y="1"  width="12" height="22" fill="#000" />
      {/* Screen */}
      <rect x="3"  y="3"  width="10" height="16" fill="#fff" />
      {/* Speaker / home indicator */}
      <rect x="6"  y="20" width="4"  height="1" fill="#fff" />
      {/* Diagonal strike (drawn as stair-stepped pixels) */}
      <rect x="1"  y="20" width="2" height="2" fill="#000" />
      <rect x="3"  y="18" width="2" height="2" fill="#000" />
      <rect x="5"  y="16" width="2" height="2" fill="#000" />
      <rect x="7"  y="14" width="2" height="2" fill="#000" />
      <rect x="9"  y="12" width="2" height="2" fill="#000" />
      <rect x="11" y="10" width="2" height="2" fill="#000" />
      <rect x="13" y="8"  width="2" height="2" fill="#000" />
    </svg>
  )
}

export default function DesktopGate({ children }) {
  const { w, h } = useViewport()

  if (w >= MIN_WIDTH) return children

  const deficit = MIN_WIDTH - w

  return (
    <div className="min-h-screen w-full bg-white text-black flex items-center justify-center p-6">
      <div className="pixel-card w-full max-w-md p-6 sm:p-8 flex flex-col items-center text-center">
        {/* Graphic row: monitor + crossed-out phone, side-by-side */}
        <div className="flex items-end justify-center gap-6 mb-6">
          <PixelMonitor />
          <PixelPhoneNo />
        </div>

        <h1 className="pixel-h1 mb-3">DESKTOP{' '}REQUIRED</h1>

        <p className="font-terminal text-xl leading-snug mb-5">
          This app is built for full-size screens. You need a keyboard and at
          least <span className="font-pixel text-[10px]">{MIN_WIDTH}px</span> of
          width to use it comfortably.
        </p>

        {/* Live resolution readout */}
        <div className="w-full border-2 border-black p-3 mb-5 bg-white">
          <div className="pixel-label mb-2">YOUR SCREEN</div>
          <div className="font-terminal text-2xl">
            {w} <span className="opacity-50">×</span> {h}
          </div>
          <div className="pixel-label mt-2 opacity-70">
            NEED {deficit}PX MORE WIDTH
          </div>
        </div>

        <p className="font-terminal text-lg leading-snug mb-5 opacity-80">
          Open this URL on a laptop or desktop browser to continue. If you're
          on a tablet, rotating to landscape may be enough.
        </p>

        <a
          href="https://github.com/tanushk07/code-debug-assistant"
          target="_blank"
          rel="noreferrer"
          className="pixel-btn"
        >
          VIEW ON GITHUB
        </a>
      </div>
    </div>
  )
}
