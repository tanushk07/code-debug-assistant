import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="max-w-3xl w-full text-center space-y-10">
        <div className="space-y-3">
          <h1 className="pixel-h1 text-2xl md:text-4xl">
            CODE&nbsp;DEBUG
            <br />
            ASSISTANT
          </h1>
          <div className="pixel-label opacity-60">/ MULTIMODAL / STREAMING / TWO-AGENT</div>
        </div>

        <div className="border-2 border-black shadow-pixel mx-auto max-w-xl text-left p-6 font-terminal text-xl space-y-2">
          <p>&gt; PASTE BROKEN CODE</p>
          <p>&gt; DROP ERROR LOGS</p>
          <p>&gt; UPLOAD A SCREENSHOT</p>
          <p>&gt; CHAT WITH AN AI THAT SEES THE FULL PICTURE</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/login"  className="pixel-btn">LOG IN</Link>
          <Link to="/signup" className="pixel-btn-primary">SIGN UP</Link>
        </div>

        <div className="pixel-label opacity-40 pt-8">[ NEBULA9 ASSIGNMENT — TANUSHK ]</div>
      </div>
    </div>
  )
}
