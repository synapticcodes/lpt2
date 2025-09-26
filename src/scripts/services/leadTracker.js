import { config, STORAGE_KEYS, UTM_KEYS } from '../config.js'
import { inferGenderFromName } from '../utils/gender.js'
import { getFacebookIdentifiers } from '../utils/facebook.js'
import { getCookie, setCookie } from '../utils/cookie.js'

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `mnok-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

function setPersistentString(key, value, { days = 365 } = {}) {
  if (typeof value === 'undefined' || value === null) return
  const stringValue = String(value)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, stringValue)
    }
  } catch (error) {
    console.warn('[LeadTracker] Não foi possível persistir valor no localStorage.', error)
  }

  try {
    setCookie(key, stringValue, { days })
  } catch (error) {
    console.warn('[LeadTracker] Não foi possível persistir valor no cookie.', error)
  }
}

function getPersistentString(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(key)
      if (stored) {
        return stored
      }
    }
  } catch (error) {
    console.warn('[LeadTracker] Não foi possível ler localStorage persistente.', error)
  }

  const cookieValue = getCookie(key)
  if (cookieValue) {
    return cookieValue
  }

  return ''
}

function storeSessionValue(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch (error) {
    console.warn('[LeadTracker] Não foi possível salvar sessionStorage', error)
  }
}

function getSessionValue(key) {
  try {
    return sessionStorage.getItem(key)
  } catch (error) {
    console.warn('[LeadTracker] Não foi possível ler sessionStorage', error)
    return null
  }
}

function parseJSON(value, fallback = {}) {
  try {
    return JSON.parse(value)
  } catch (error) {
    return fallback
  }
}

class LeadTracker {
  constructor() {
    this.sessionId = null
    this.utmParams = {}
    this.metaPixelReady = false
    this.pageViewSent = false
    this.geo = null
    this.ensureGlobalCRM()
  }

  ensureGlobalCRM() {
    if (typeof window === 'undefined') return
    const ctx = window
    if (!ctx.MeuNomeCRM || typeof ctx.MeuNomeCRM !== 'object') {
      ctx.MeuNomeCRM = {
        sendEvent(eventName, payload = {}) {
          console.info('[MeuNomeCRM] evento', eventName, payload)
        }
      }
    } else if (typeof ctx.MeuNomeCRM.sendEvent !== 'function') {
      ctx.MeuNomeCRM.sendEvent = function noop() {}
    }
  }

  init() {
    this.sessionId = this.ensureSessionId()
    this.utmParams = this.captureUTMParams()
    this.collectGeoData()
    this.initMetaPixel()
    this.sendPageView()
  }

  ensureSessionId() {
    const fromCookie = getPersistentString(STORAGE_KEYS.sessionId)
    if (fromCookie) {
      storeSessionValue(STORAGE_KEYS.sessionId, fromCookie)
      return fromCookie
    }

    const fromStorage = getSessionValue(STORAGE_KEYS.sessionId)
    if (fromStorage) {
      setPersistentString(STORAGE_KEYS.sessionId, fromStorage)
      return fromStorage
    }

    const generated = randomId()
    storeSessionValue(STORAGE_KEYS.sessionId, generated)
    setPersistentString(STORAGE_KEYS.sessionId, generated)
    return generated
  }

  captureUTMParams() {
    if (typeof window === 'undefined') return {}
    const params = new URLSearchParams(window.location.search)
    const collected = {}

    UTM_KEYS.forEach((key) => {
      const value = params.get(key)
      if (value) {
        collected[key] = value
      }
    })

    if (!Object.keys(collected).length) {
      const existing = getSessionValue(STORAGE_KEYS.utm)
      if (existing) {
        return parseJSON(existing)
      }

      const persisted = getPersistentString(STORAGE_KEYS.utm)
      if (persisted) {
        const parsed = parseJSON(persisted)
        if (parsed && typeof parsed === 'object') {
          storeSessionValue(STORAGE_KEYS.utm, persisted)
          return parsed
        }
      }
      return {}
    }

    const serialized = JSON.stringify(collected)
    storeSessionValue(STORAGE_KEYS.utm, serialized)
    setPersistentString(STORAGE_KEYS.utm, serialized, { days: 90 })
    return collected
  }

  collectGeoData() {
    if (typeof navigator === 'undefined') {
      this.geo = null
      return
    }

    const base = {
      language: navigator.language || null,
      timezone:
        typeof Intl !== 'undefined' && Intl.DateTimeFormat
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : null
    }

    this.geo = base

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.geo = {
            ...base,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
        },
        (error) => {
          this.geo = { ...base, error: error.code }
        },
        { maximumAge: 600000, timeout: 5000 }
      )
    }
  }

  initMetaPixel() {
    if (typeof window === 'undefined') return
    if (!config.metaPixelId) {
      console.warn('[LeadTracker] Meta Pixel ID não configurado.')
      return
    }

    if (window.fbq) {
      this.metaPixelReady = true
      return
    }

    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = true
      n.version = '2.0'
      n.queue = []
      t = b.createElement(e)
      t.async = true
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s.parentNode.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

    window.fbq('init', config.metaPixelId)
    this.metaPixelReady = true
  }

  getContextPayload(extra = {}) {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/'
    return {
      session_id: this.sessionId,
      ...extra,
      utm: this.utmParams,
      geo: this.geo,
      path,
      timestamp: new Date().toISOString()
    }
  }

  buildLeadPayload(payload) {
    const leadName = typeof payload.name === 'string' ? payload.name.trim() : ''
    const [firstName = '', ...rest] = leadName.split(/\s+/).filter(Boolean)
    const lastName = rest.join(' ')

    const gender = inferGenderFromName(leadName)

    const leadPayload = {
      email: typeof payload.email === 'string' ? payload.email : undefined,
      phone: typeof payload.phone === 'string' ? payload.phone : undefined,
      name: leadName || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      gender
    }

    const hasLeadData = Object.values(leadPayload).some((value) => Boolean(value))
    return hasLeadData ? leadPayload : undefined
  }

  buildCookieSnapshot(payload) {
    const gender = inferGenderFromName(payload.name)

    const cookies = {
      LeadEmail: typeof payload.email === 'string' ? payload.email : undefined,
      LeadPhone: typeof payload.phone === 'string' ? payload.phone : undefined,
      LeadFirstName: typeof payload.name === 'string' ? payload.name.split(/\s+/)[0] : undefined,
      LeadLastName:
        typeof payload.name === 'string'
          ? payload.name.split(/\s+/).slice(1).join(' ') || undefined
          : undefined,
      LeadGenero: gender
    }

    Object.keys(cookies).forEach((key) => {
      if (!cookies[key]) {
        delete cookies[key]
      }
    })

    return Object.keys(cookies).length ? cookies : undefined
  }

  getPersistedLeadData() {
    if (typeof window === 'undefined') return {}

    const fromSession = getSessionValue(STORAGE_KEYS.leadPayload)
    if (fromSession) {
      const parsedSession = parseJSON(fromSession, null)
      if (parsedSession && typeof parsedSession === 'object') {
        return this.normalizeLeadData(parsedSession)
      }
    }

    const persisted = getPersistentString(STORAGE_KEYS.leadPayload)
    if (persisted) {
      const parsed = parseJSON(persisted, null)
      if (parsed && typeof parsed === 'object') {
        storeSessionValue(STORAGE_KEYS.leadPayload, persisted)
        return this.normalizeLeadData(parsed)
      }
    }
    return {}
  }

  normalizeLeadData(raw = {}) {
    const normalized = {}
    if (typeof raw.name === 'string') normalized.name = raw.name
    if (typeof raw.email === 'string') normalized.email = raw.email
    if (typeof raw.phone === 'string') normalized.phone = raw.phone
    if (typeof raw.gender === 'string') normalized.gender = raw.gender
    return normalized
  }

  async sendToProcessEvent(eventName, payload) {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.warn('[LeadTracker] Supabase não configurado — evento não enviado.')
      return
    }

    if (!config.metaPixelId) {
      console.warn('[LeadTracker] Pixel ID não configurado — evento não enviado.')
      return
    }

    if (!payload.session_id) {
      console.warn('[LeadTracker] Sessão não encontrada — evento não enviado.')
      return
    }

    const body = {
      pixelId: config.metaPixelId,
      sessionId: payload.session_id,
      eventName,
      eventTime: Math.floor(Date.now() / 1000),
      actionSource: 'website',
      domain: typeof window !== 'undefined' ? window.location.hostname : undefined,
      eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      utm: payload.utm && Object.keys(payload.utm || {}).length ? payload.utm : undefined,
      cookies: this.buildCookieSnapshot(payload),
      lead: this.buildLeadPayload(payload),
      customData: {
        path: payload.path,
        geo: payload.geo,
        source: 'landing_builder'
      }
    }

    const { fbc, fbp } = getFacebookIdentifiers()
    if (fbc) {
      body.fbc = fbc
    }
    if (fbp) {
      body.fbp = fbp
    }

    if (!body.customData.geo) {
      delete body.customData.geo
    }

    if (body.cookies === undefined) {
      delete body.cookies
    }

    if (body.lead === undefined) {
      delete body.lead
    }

    if (!body.utm) {
      delete body.utm
    }

    try {
      const url = `${config.supabaseUrl.replace(/\/$/, '')}/functions/v1/process-event`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${config.supabaseAnonKey}`
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Status ${response.status}: ${errorText}`)
      }
    } catch (error) {
      console.error('[LeadTracker] Erro ao enviar evento para process-event', error)
    }
  }

  sendMetaPixel(eventName, payload) {
    if (typeof window === 'undefined' || !this.metaPixelReady || !window.fbq) return
    try {
      window.fbq('trackCustom', eventName, payload)
    } catch (error) {
      console.error('[LeadTracker] Erro ao enviar evento para Meta Pixel', error)
    }
  }

  sendCRMEvent(eventName, payload) {
    if (typeof window === 'undefined' || !window.MeuNomeCRM) return
    try {
      window.MeuNomeCRM.sendEvent(eventName, payload)
    } catch (error) {
      console.error('[LeadTracker] Erro ao enviar evento para CRM', error)
    }
  }

  async sendEvent(eventName, data = {}) {
    const persistedLead = this.getPersistedLeadData()
    const mergedData = { ...persistedLead, ...data }
    const payload = this.getContextPayload(mergedData)
    this.sendCRMEvent(eventName, payload)
    this.sendMetaPixel(eventName, payload)
    await this.sendToProcessEvent(eventName, payload)
    return payload
  }

  sendPageView() {
    if (typeof window === 'undefined') return
    if (this.pageViewSent) return
    this.pageViewSent = true
    this.sendEvent('PageView')
  }

  async storeLead() {
    console.info('[LeadTracker] Persistência direta de lead desativada — use sendEvent("Lead").')
    return { error: null }
  }
}

export const leadTracker = new LeadTracker()
