import '../styles/thank-you.css'
import { STORAGE_KEYS } from './config.js'
import { leadTracker } from './services/leadTracker.js'

const VIEW_EVENT = 'view_thank_you'
const WHATS_EVENT = 'ChamouWhats'
const INSTAGRAM_EVENT = 'instagram_click'
const COUNTER_START = 9845
const COUNTER_INTERVAL_MS = 5000
const COUNTER_STORAGE_KEY = 'mnok_thank_counter'

function enforceHttps() {
  if (typeof window === 'undefined') return
  const { protocol, hostname, pathname, search } = window.location
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (protocol !== 'https:' && !isLocalhost) {
    window.location.replace(`https://${hostname}${pathname}${search}`)
  }
}

function ensureCRM() {
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
  return ctx.MeuNomeCRM
}

function loadStoredCounter() {
  try {
    const raw = sessionStorage.getItem(COUNTER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.warn('[ThankYou] Não foi possível ler o contador salvo.', error)
    return null
  }
}

function storeCounter(count) {
  try {
    sessionStorage.setItem(
      COUNTER_STORAGE_KEY,
      JSON.stringify({
        value: count,
        timestamp: Date.now()
      })
    )
  } catch (error) {
    console.warn('[ThankYou] Não foi possível salvar o contador.', error)
  }
}

function getStoredLeadPayload() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.leadPayload)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.warn('[ThankYou] Não foi possível recuperar os dados do lead.', error)
    return null
  }
}

function initCounter(counterEl) {
  if (!counterEl) return

  const YEAR = new Date().getFullYear().toString()
  const stored = loadStoredCounter()
  let count = COUNTER_START

  if (stored) {
    const elapsed = Math.floor((Date.now() - stored.timestamp) / COUNTER_INTERVAL_MS)
    count = COUNTER_START + elapsed
    if (stored.value > count) {
      count = stored.value
    }
  }

  const render = () => {
    counterEl.textContent = `${count.toLocaleString('pt-BR')} clientes libertos das dívidas em ${YEAR}`
  }

  render()
  storeCounter(count)

  setInterval(() => {
    count += 1
    render()
    storeCounter(count)
  }, COUNTER_INTERVAL_MS)
}

function bindWhatsApp(crm) {
  const whatsappLink = document.querySelector('[data-action="whatsapp"]')
  if (!whatsappLink) return

  whatsappLink.addEventListener('click', () => {
    const payload = {
      page: 'thank-you',
      medium: 'whatsapp',
      timestamp: new Date().toISOString()
    }
    crm.sendEvent(WHATS_EVENT, payload)
    leadTracker.sendEvent(WHATS_EVENT, payload)
  })
}

function bindInstagram(crm) {
  const instagramLink = document.querySelector('[data-action="instagram"]')
  if (!instagramLink) return

  instagramLink.addEventListener('click', () => {
    const payload = {
      page: 'thank-you',
      medium: 'instagram',
      timestamp: new Date().toISOString()
    }
    crm.sendEvent(INSTAGRAM_EVENT, payload)
    leadTracker.sendEvent(INSTAGRAM_EVENT, payload)
  })
}

function initThankYouPage() {
  enforceHttps()
  const crm = ensureCRM()
  leadTracker.init()

  const leadData = getStoredLeadPayload()
  const viewPayload = {
    ...(leadData ?? {}),
    page: 'thank-you',
    timestamp: new Date().toISOString()
  }

  crm.sendEvent(VIEW_EVENT, viewPayload)
  leadTracker.sendEvent(VIEW_EVENT, viewPayload)

  const counterEl = document.querySelector('#thank-counter')
  initCounter(counterEl)
  bindWhatsApp(crm)
  bindInstagram(crm)
}

document.addEventListener('DOMContentLoaded', initThankYouPage)
