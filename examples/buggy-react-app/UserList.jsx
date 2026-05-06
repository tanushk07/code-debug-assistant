import { useEffect, useState } from 'react'
import { fetchUser } from './api.js'

export default function UserList({ userIds }) {
  // Bug 2: useState() with no initial value → users is `undefined`
  // until the fetch resolves, but we render `users.map` synchronously below.
  const [users, setUsers] = useState()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all(userIds.map((id) => fetchUser(id)))
      .then((rows) => setUsers(rows))
      .finally(() => setLoading(false))
  }) // Bug 3: no dependency array → effect runs on every render → infinite loop

  if (loading) return <div>Loading...</div>

  return (
    <ul>
      {/* Bug 4: users may still be undefined; .map() throws */}
      {users.map((u) => (
        <li key={u.id}>
          {/* Bug 5: u.name might be null for some users; .toUpperCase() throws */}
          {u.name.toUpperCase()}
        </li>
      ))}
    </ul>
  )
}
