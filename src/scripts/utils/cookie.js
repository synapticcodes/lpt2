const DEFAULT_MAX_AGE_DAYS = 365

export function getCookie(name) {
  if (typeof document === 'undefined') return ''
  const pattern = new RegExp(`(?:^|; )${name}=([^;]*)`)
  const match = document.cookie.match(pattern)
  return match ? decodeURIComponent(match[1]) : ''
}

export function setCookie(name, value, { days = DEFAULT_MAX_AGE_DAYS, path = '/', sameSite = 'Lax' } = {}) {
  if (typeof document === 'undefined') return
  if (typeof value === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const cookie = `${name}=${encodeURIComponent(value)}; path=${path}; expires=${expires}; SameSite=${sameSite}`
  document.cookie = cookie
}

export function deleteCookie(name, { path = '/' } = {}) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}
