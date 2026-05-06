# Demo: Buggy React User Directory

A small React app with **7 deliberate bugs** across 3 files. Use it to
exercise every feature of the Code Debug Assistant — multi-file editor,
error log, screenshot upload, annotation, classifier, fixer.

## Files in this demo

| File          | Role                                  |
|---------------|---------------------------------------|
| `App.jsx`     | Top-level component                   |
| `UserList.jsx`| Buggy fetch + render                  |
| `api.js`      | Buggy network helpers                 |
| `error.log`   | What the runtime crashes look like    |
| `screenshot.html` | Static page that mimics a React error overlay |

## Steps to test the app end-to-end

1. **Open the app:** http://localhost:5173 → log in (or sign up).
2. **Create a session:** click `+ NEW SESSION` in the sidebar.
3. **Paste the code into the editor:**
   - Click `+ ADD FILE` → name it `App.jsx` → paste contents of `App.jsx`.
   - Click `+` again → `UserList.jsx` → paste.
   - Click `+` again → `api.js` → paste.
4. **Paste the error log:** copy the contents of `error.log` into the
   ERROR LOG box at the bottom of the editor column.
5. **(Optional) Add a screenshot:**
   - Open `screenshot.html` in any browser. It renders a fake React
     red-screen error overlay.
   - Take a screenshot (system shortcut, or browser devtools' "capture
     full size screenshot").
   - Click `+ ADD` in the SCREENSHOTS panel → upload it.
   - Hover the thumbnail → click the 🖊 pencil → an overlay opens.
   - Free-draw arrows pointing at the error → `SAVE`.
   - The thumbnail updates with your annotated version.
6. **(Optional) Add more screenshots** the same way — drag in any other
   screenshots showing the bug from different angles. Hover any thumbnail
   to delete (✕) or re-annotate (🖊).
7. **Ask the assistant:** in the chat panel, type:
   > What are all the bugs in this code, and how do I fix them?
   then `Ctrl+Enter` (or click `SEND`).

The session title will auto-set to your first message. Watch the SSE
stream — the **classifier** card lists structured errors first, then the
**fixer** streams a markdown explanation with diffs.

## Other prompts to try

- "Why is the UI re-rendering infinitely?"
- "Fix the missing await in api.js"
- "How do I make this null-safe?"
- "Rewrite UserList.jsx to be production-ready."

## Bugs the AI should catch (so you can grade its answer)

| #  | File          | Line | Bug                                            |
|----|---------------|------|------------------------------------------------|
| 1  | App.jsx       |  6   | `undefined` in the user-id list                |
| 2  | UserList.jsx  |  8   | `useState()` with no initial value             |
| 3  | UserList.jsx  | 14   | useEffect missing dependency array (infinite loop) |
| 4  | UserList.jsx  | 18   | `users.map` without null check                 |
| 5  | UserList.jsx  | 21   | `u.name.toUpperCase` without null check        |
| 6  | api.js        |  9   | Missing `await` / chained promise handling     |
| 7  | api.js        |  9   | `r.json` without `()` — returns method ref     |

A model worth its salt should catch at least 1–4 from a quick read.
Groq's Llama 3.3 70B usually catches 5+ in one pass.

## Resetting the demo

The session is just data — delete it from the sidebar (hover → `X`) and
start a fresh one any time.
