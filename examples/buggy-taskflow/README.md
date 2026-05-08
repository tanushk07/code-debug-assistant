# 🐛 Buggy TaskFlow

A deliberately buggy React task-management app, designed for demoing **Code Debug Assistant**.

Use this app to test screenshot capture, UI annotation, error log analysis, and AI-powered debugging.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) and start finding bugs!

---

## 🔍 Bug Catalog

### Visual / CSS Bugs

| #  | Bug | Where to See It |
|----|-----|-----------------|
| 1  | **Header has no z-index** — cards and modals overlap the fixed header when scrolling | Scroll down or open the modal |
| 2  | **Card overflow not hidden** — the long-titled task spills outside its card | Look at the "extremely long title" task |
| 3  | **No text truncation** — task titles aren't clamped, breaking card height consistency | Same card as above |
| 4  | **High-priority badge text invisible** — text color matches the background color | Look at any "high" priority task |
| 5  | **Modal not vertically centered** — `align-items: flex-start` instead of `center` | Click "+ New Task" |
| 6  | **Modal sits under the header** — no margin to push it below the fixed header | Open the modal and look at the top |

### Logic / JavaScript Bugs

| #  | Bug | How to Trigger |
|----|-----|----------------|
| 7  | **Toasts never auto-dismiss** — timeout is 300,000ms (5 min) instead of 3,000ms | Create or delete a task, watch the toast stick around |
| 8  | **Case-sensitive search** — typing "fix" won't find "Fix authentication flow" | Type "fix" (lowercase) in search |
| 9  | **"Done" counter shows wrong number** — counts incomplete tasks as completed | Look at header stats — "Done" equals "Pending" |
| 10 | **Toggle toast shows opposite message** — says "completed" when uncompleting | Mark a completed task as incomplete |
| 11 | **Delete also opens edit modal** — missing `e.stopPropagation()` | Click the 🗑️ button on any task |
| 12 | **Empty task title allowed** — no validation on the create/edit form | Open "+ New Task", leave title empty, click Create |

---

## 🎯 Demo Workflow

1. **Open the app** → immediately see visual bugs (invisible badge, overflow)
2. **Take a screenshot** → upload to Code Debug Assistant
3. **Annotate the bug** → circle the invisible "high" badge, the overflowing card, etc.
4. **Paste the code** → paste `App.jsx` or `index.css` into the code editor
5. **Ask the AI** → "Why is the high priority badge text invisible?"
6. **Get the fix** → AI identifies `color: rgba(255, 107, 107, 0.15)` should be `color: var(--danger)`
