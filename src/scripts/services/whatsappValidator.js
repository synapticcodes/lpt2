import { config } from '../config.js'
import { toE164 } from '../utils/phone.js'

function interpretResponse(body) {
  if (body == null) return false
  if (typeof body === 'boolean') return body
  if (typeof body.valid !== 'undefined') return Boolean(body.valid)
  if (typeof body.exists !== 'undefined') return Boolean(body.exists)
  if (typeof body.status === 'string') {
    const normalized = body.status.toLowerCase()
    return ['valid', 'connected', 'online', 'exists', 'ok'].includes(normalized)
  }
  return false
}

export async function validateWhatsApp(number) {
  const e164Phone = toE164(number)

  if (!e164Phone) {
    return {
      ok: false,
      message: 'Não conseguimos interpretar seu WhatsApp. Confirme o DDD e utilize apenas números.'
    }
  }
  if (!config.whatsappApiUrl) {
    console.warn('[WhatsAppValidator] URL da Evolution API não configurada. Prosseguindo com validação positiva por padrão.')
    return { ok: true, body: null }
  }

  const headers = {
    'Content-Type': 'application/json'
  }

  if (config.whatsappApiKey) {
    headers.apikey = config.whatsappApiKey
  }

  try {
    const response = await fetch(config.whatsappApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ numbers: [e164Phone] })
    })

    if (!response.ok) {
      return { ok: false, message: 'Não foi possível validar seu WhatsApp agora. Tente novamente em instantes.' }
    }

    const data = await response.json().catch(() => null)
    const result = Array.isArray(data) ? data[0] : data
    const valid = interpretResponse(result)

    return valid
      ? { ok: true, body: result }
      : {
          ok: false,
          body: result,
          message:
            'Não conseguimos confirmar o seu WhatsApp. Verifique se o número está correto e com DDD, e tente novamente.'
        }
  } catch (error) {
    console.error('[WhatsAppValidator] Erro de comunicação com Evolution API', error)
    return {
      ok: false,
      message: 'Instabilidade momentânea na validação de WhatsApp. Recarregue a página e tente novamente.'
    }
  }
}
