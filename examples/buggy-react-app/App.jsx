import { useState } from 'react'
import UserList from './UserList.jsx'

function App() {
  // Bug 1: list contains an `undefined` id, which will leak into fetchUser()
  const [ids] = useState([1, 2, 3, undefined])

  return (
    <div className="app">
      <h1>User Directory</h1>
      <UserList userIds={ids} />
    </div>
  )
}

export default App
