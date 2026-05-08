import { useState, useEffect } from 'react'

// ── Simulated console errors (appear in DevTools → Console) ──────────
// These give you real error text to copy into the Error Log panel.
const FAKE_ERRORS = [
  `TypeError: Cannot read properties of undefined (reading 'map')
    at TaskList (TaskList.jsx:42:18)
    at renderWithHooks (react-dom.development.js:14985:18)
    at mountIndeterminateComponent (react-dom.development.js:17811:13)`,
  `Warning: Each child in a list should have a unique "key" prop.
    Check the render method of \`TaskGrid\`.
    at TaskCard (TaskCard.jsx:8:3)
    at TaskGrid (TaskGrid.jsx:15:5)`,
  `Uncaught Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
    at checkForNestedUpdates (react-dom.development.js:23804:15)
    at scheduleUpdateOnFiber (react-dom.development.js:21840:5)`,
]

// ── Seed data ────────────────────────────────────────────────────────
const INITIAL_TASKS = [
  {
    id: 1,
    title: 'Fix authentication flow',
    description: 'Users are getting logged out randomly after 5 minutes. Need to investigate token refresh logic.',
    priority: 'high',
    category: 'Bugs',
    completed: false,
    createdAt: '2026-05-01',
  },
  {
    id: 2,
    title: 'Design new onboarding screens',
    description: 'Create Figma mockups for the 3-step onboarding flow.',
    priority: 'medium',
    category: 'Design',
    completed: false,
    createdAt: '2026-05-02',
  },
  {
    id: 3,
    title: 'This task has an extremely long title that should be truncated but it keeps going and going because there is no CSS overflow handling which causes the card layout to break badly',
    description: 'This demonstrates the overflow bug.',
    priority: 'high',
    category: 'Bugs',
    completed: false,
    createdAt: '2026-05-03',
  },
  {
    id: 4,
    title: 'Write unit tests for API',
    description: 'Cover the /users and /sessions endpoints with Jest tests.',
    priority: 'low',
    category: 'Backend',
    completed: true,
    createdAt: '2026-04-28',
  },
  {
    id: 5,
    title: 'Optimize image uploads',
    description: 'Compress images client-side before upload. Target < 500KB.',
    priority: 'medium',
    category: 'Backend',
    completed: false,
    createdAt: '2026-05-04',
  },
  {
    id: 6,
    title: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions for automated testing and deployment.',
    priority: 'low',
    category: 'DevOps',
    completed: false,
    createdAt: '2026-05-05',
  },
]

const CATEGORIES = ['All', 'Bugs', 'Design', 'Backend', 'DevOps']

// ── Fire simulated errors into the console on mount ──────────────────
// Open DevTools → Console to see these. Copy them into your debug assistant.
if (typeof window !== 'undefined') {
  FAKE_ERRORS.forEach((msg) => console.error(msg))
}

// ── App Component ────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [toasts, setToasts] = useState([])

  // Toast helper
  function toast(message, type = 'success') {
    const id = Date.now()
    setToasts((t) => [...t, { id, message, type }])
    // BUG 7: setTimeout uses wrong variable — toasts never auto-dismiss
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 300000) // 5 minutes instead of 3 seconds — practically never clears
  }

  // ── Filtering ──────────────────────────────────────────────────────
  const filtered = tasks.filter((t) => {
    const matchesCategory = filter === 'All' || t.category === filter

    // BUG 8: Case-sensitive search — searching "fix" won't find "Fix"
    const matchesSearch = t.title.includes(search) || t.description.includes(search)

    return matchesCategory && matchesSearch
  })

  // ── Stats (BUG 9: completed count is wrong — counts incomplete instead) ──
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => !t.completed).length // ← BUG: should be t.completed
  const pendingTasks = tasks.filter((t) => !t.completed).length

  // ── Toggle completion ──────────────────────────────────────────────
  function toggleComplete(id) {
    setTasks((prev) =>
      prev.map((t) =>
        // BUG 10: Uses index-like comparison instead of id
        // This marks the wrong task when tasks are reordered/filtered
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    )
    // Actually, let's make this more subtle — the toggle itself works,
    // but the toast message is always wrong
    const task = tasks.find((t) => t.id === id)
    toast(
      // BUG 11: Shows opposite message — says "completed" when actually uncompleting
      task?.completed ? `"${task.title}" marked complete` : `"${task.title}" marked incomplete`
    )
  }

  // ── Delete task ────────────────────────────────────────────────────
  function deleteTask(taskId, e) {
    // BUG 12: e.stopPropagation() is missing — delete also triggers card click (opens edit modal)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    toast('Task deleted')
  }

  // ── Add / Edit ─────────────────────────────────────────────────────
  function saveTask(taskData) {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...taskData } : t))
      )
      toast('Task updated')
    } else {
      const newTask = {
        ...taskData,
        id: Date.now(),
        completed: false,
        createdAt: new Date().toISOString().split('T')[0],
      }
      setTasks((prev) => [...prev, newTask])
      toast('Task created')
    }
    setShowModal(false)
    setEditingTask(null)
  }

  function openEdit(task) {
    setEditingTask(task)
    setShowModal(true)
  }

  function openCreate() {
    setEditingTask(null)
    setShowModal(true)
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="app-header">
        <h1>⚡ TaskFlow</h1>
        <div className="header-stats">
          <span>
            <span className="stat-dot total" />
            {totalTasks} Total
          </span>
          <span>
            <span className="stat-dot done" />
            {completedTasks} Done
          </span>
          <span>
            <span className="stat-dot pending" />
            {pendingTasks} Pending
          </span>
        </div>
      </header>

      <div className="app-layout">
        {/* ── Sidebar ────────────────────────────────────────────── */}
        <nav className="sidebar">
          <div className="sidebar-title">Categories</div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`sidebar-item ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              <span>
                {cat === 'All' && '📋'}
                {cat === 'Bugs' && '🐛'}
                {cat === 'Design' && '🎨'}
                {cat === 'Backend' && '⚙️'}
                {cat === 'DevOps' && '🚀'}
              </span>
              {cat}
              <span className="count">
                {cat === 'All'
                  ? tasks.length
                  : tasks.filter((t) => t.category === cat).length}
              </span>
            </button>
          ))}
        </nav>

        {/* ── Main ───────────────────────────────────────────────── */}
        <main className="main-content">
          <div className="toolbar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={openCreate}>
              + New Task
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <h3>No tasks found</h3>
              <p>
                {search
                  ? 'Try a different search term'
                  : 'Click "+ New Task" to get started'}
              </p>
            </div>
          ) : (
            <div className="task-grid">
              {filtered.map((task) => (
                <div
                  key={task.id}
                  className={`task-card ${task.completed ? 'completed-task' : ''}`}
                  onClick={() => openEdit(task)}
                >
                  <div className="task-card-header">
                    <h3>{task.title}</h3>
                    <div className="task-actions">
                      <button
                        title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                        onClick={() => toggleComplete(task.id)}
                      >
                        {task.completed ? '↩️' : '✅'}
                      </button>
                      <button
                        className="delete-btn"
                        title="Delete"
                        onClick={(e) => deleteTask(task.id, e)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <p>{task.description}</p>
                  <div className="task-card-footer">
                    <span className={`priority-badge priority-${task.priority}`}>
                      {task.priority}
                    </span>
                    <span className="task-date">{task.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <TaskModal
          task={editingTask}
          onSave={saveTask}
          onClose={() => {
            setShowModal(false)
            setEditingTask(null)
          }}
        />
      )}

      {/* ── Toasts ─────────────────────────────────────────────────── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? '✓' : '✗'} {t.message}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Modal Component ──────────────────────────────────────────────────
function TaskModal({ task, onSave, onClose }) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [priority, setPriority] = useState(task?.priority || 'medium')
  const [category, setCategory] = useState(task?.category || 'Bugs')

  function handleSubmit(e) {
    e.preventDefault()
    // BUG 13: No validation — allows saving empty title
    onSave({ title, description, priority, category })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{task ? 'Edit Task' : 'New Task'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some details..."
            />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Bugs">Bugs</option>
              <option value="Design">Design</option>
              <option value="Backend">Backend</option>
              <option value="DevOps">DevOps</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
