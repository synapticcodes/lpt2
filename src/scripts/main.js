import '../styles/main.css'
import { leadTracker } from './services/leadTracker.js'
import { initLeadForm } from './modules/leadForm.js'
import { initToastNotifications } from './modules/toastNotifications.js'

function enforceHttps() {
  if (typeof window === 'undefined') return
  const { protocol, hostname, pathname, search } = window.location
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (protocol !== 'https:' && !isLocalhost) {
    window.location.replace(`https://${hostname}${pathname}${search}`)
  }
}

function initWhatsAppTracking(tracker) {
  const whatsappLinks = document.querySelectorAll('[data-track="whatsapp"], a[href^="https://wa.me"]')
  if (!whatsappLinks.length) return

  whatsappLinks.forEach((link) => {
    link.addEventListener('click', () => {
      tracker.sendEvent('ChamouWhats', {
        href: link.href,
        position: link.dataset.position || link.getAttribute('aria-label') || 'desconhecido'
      })
    })
  })
}

document.addEventListener('DOMContentLoaded', () => {
  enforceHttps()
  leadTracker.init()
  initLeadForm({ tracker: leadTracker })
  initWhatsAppTracking(leadTracker)
  initToastNotifications()
})
