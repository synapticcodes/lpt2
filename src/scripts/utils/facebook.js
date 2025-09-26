const FB_COOKIE_TTL_DAYS = 90

function readCookie(name) {
  if (typeof document === 'undefined') return ''
  const pattern = new RegExp(`(?:^|; )${name}=([^;]*)`)
  const match = document.cookie.match(pattern)
  return match ? decodeURIComponent(match[1]) : ''
}

function writeCookie(name, value, { days = FB_COOKIE_TTL_DAYS } = {}) {
  if (typeof document === 'undefined' || !value) return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`
}

function buildFbcFromUrl() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  const fbclid = params.get('fbclid')?.trim()
  if (!fbclid) return ''
  const timestamp = Math.floor(Date.now() / 1000)
  return `fb.1.${timestamp}.${fbclid}`
}

export function getFacebookIdentifiers() {
  const fbp = readCookie('_fbp') || undefined

  let fbc = readCookie('_fbc') || undefined
  if (!fbc) {
    const fromUrl = buildFbcFromUrl()
    if (fromUrl) {
      fbc = fromUrl
      writeCookie('_fbc', fromUrl)
    }
  }

  return {
    fbp,
    fbc
  }
}
