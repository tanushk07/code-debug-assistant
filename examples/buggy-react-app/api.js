const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.example.com'

export function fetchUser(id) {
  return fetch(`${BASE_URL}/users/${id}`).then((res) => res.json())
}

export function fetchPosts(userId) {
  // Bug 6: missing `await`/.then chaining — this returns Promise<Promise<Response>>
  // Bug 7: `r.json` without parentheses — returns the function reference, not the parsed body
  return fetch(`${BASE_URL}/users/${userId}/posts`).then((r) => r.json)
}
