/**
 * Token storage helpers (localStorage).
 *
 *  Note on storage choice:
 *    localStorage is convenient but readable by any script on the page (XSS).
 *    The stronger choice is HttpOnly cookies set by the backend — but those
 *    add CSRF concerns and are explicitly out of scope per the doc.
 *    For an internship MVP, localStorage is acceptable.
 *
 *  Study (extra credit):
 *    - "Where to store JWT" — Hussein Nasser (debate, no perfect answer)
 *    - OWASP cheat sheet on session management
 */

const KEY = 'cda.token'

export const getToken   = () => localStorage.getItem(KEY)
export const setToken   = (t) => localStorage.setItem(KEY, t)
export const clearToken = () => localStorage.removeItem(KEY)
export const isAuthed   = () => Boolean(getToken())
