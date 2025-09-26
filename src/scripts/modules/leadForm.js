import { STORAGE_KEYS } from '../config.js'
import { attachPhoneMask, sanitizePhone, isValidPhone } from '../utils/phone.js'
import { validateWhatsApp } from '../services/whatsappValidator.js'
import { inferGenderFromName } from '../utils/gender.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

const validators = {
  name: (value) => Boolean(value && value.trim().length >= 3),
  email: (value) => Boolean(value && EMAIL_REGEX.test(value.trim())),
  phone: (value) => isValidPhone(value)
}

const sanitizer = {
  text: (value = '') => value.replace(/[<>]/g, '').trim(),
  email: (value = '') => value.replace(/[<>\s]/g, '').toLowerCase()
}

function setSessionFlag(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('[LeadForm] Não foi possível persistir estado do formulário.', error)
  }
}

function getSessionFlag(key) {
  try {
    const stored = sessionStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    return null
  }
}

function showMessage(container, message, { tone = 'neutral' } = {}) {
  if (!container) return
  container.textContent = message
  container.classList.remove('is-error', 'is-success', 'is-neutral')
  container.classList.add(`is-${tone}`)
}

function toggleLoading(button, loading) {
  if (!button) return
  button.disabled = loading
  button.dataset.loading = loading ? 'true' : 'false'
}

function replaceFormWithMessage(form) {
  if (!form) return
  const wrapper = document.createElement('div')
  wrapper.className = 'lead-form__after-message'
  wrapper.innerHTML = `
    <h3>Pronto! Estamos cuidando de tudo para você</h3>
    <p>Já recebemos seus dados, nossa atendente <strong>Vera Lúcia Nogueira</strong> irá brevemente entrar em contato com você via WhatsApp. Fique atento!</p>
  `
  form.replaceWith(wrapper)
}

function collectFormData(form) {
  const name = form.querySelector('#name')?.value.trim() ?? ''
  const email = form.querySelector('#email')?.value.trim() ?? ''
  const phoneRaw = form.querySelector('#phone')?.value ?? ''
  const phone = sanitizePhone(phoneRaw)

  return { name, email, phone }
}

function setInputState(input, isValid, { force = false } = {}) {
  if (!input) return
  if (force) {
    input.dataset.touched = 'true'
  }

  if (input.dataset.touched === 'true') {
    input.classList.toggle('is-valid', Boolean(isValid))
    input.classList.toggle('is-error', !isValid)
  } else {
    input.classList.remove('is-valid', 'is-error')
  }
}

function validateField(field, value, inputs, options = {}) {
  const input = inputs[field]
  const validator = validators[field]
  const isValid = validator(value)
  setInputState(input, isValid, options)
  return isValid
}

function validateForm(data, inputs, options = {}) {
  const nameValid = validateField('name', data.name, inputs, options)
  const emailValid = validateField('email', data.email, inputs, options)
  const phoneValid = validateField('phone', data.phone, inputs, options)
  return nameValid && emailValid && phoneValid
}

export function initLeadForm({ tracker }) {
  const form = document.querySelector('#lead-form')
  if (!form) return

  const submitButton = form.querySelector('button[type="submit"]')
  const resultBox = document.querySelector('#resultado')
  if (resultBox) {
    showMessage(resultBox, '', { tone: 'neutral' })
  }
  const inputs = {
    name: form.querySelector('#name'),
    email: form.querySelector('#email'),
    phone: form.querySelector('#phone')
  }

  attachPhoneMask(inputs.phone)

  let isWhatsappValid = false
  let validatedPhone = null
  let validationInFlight = false
  let validationToken = 0
  let pendingValidationPhone = null

  const applySubmitAvailability = () => {
    if (!submitButton) return
    if (submitButton.dataset.loading === 'true') return
    submitButton.disabled = !isWhatsappValid
  }

  const handleIncompletePhone = (digits) => {
    isWhatsappValid = false
    validatedPhone = null
    validationInFlight = false
    validationToken += 1
    pendingValidationPhone = null
    if (inputs.phone) {
      setInputState(inputs.phone, false)
    }
    if (!digits.length) {
      showMessage(resultBox, '', { tone: 'neutral' })
    } else {
      showMessage(resultBox, 'Informe seu WhatsApp com 11 dígitos (DDD + número).', { tone: 'neutral' })
    }
    applySubmitAvailability()
  }

  const triggerWhatsAppValidation = async (digits) => {
    if (!inputs.phone || !digits) return
    if (validationInFlight && pendingValidationPhone === digits) return
    validationInFlight = true
    const currentToken = ++validationToken
    pendingValidationPhone = digits
    isWhatsappValid = false
    applySubmitAvailability()
    showMessage(resultBox, 'Validando WhatsApp...', { tone: 'neutral' })

    let validation
    try {
      validation = await validateWhatsApp(digits)
    } catch (error) {
      console.error('[LeadForm] Falha na validação de WhatsApp', error)
      validation = {
        ok: false,
        message: 'Instabilidade momentânea na validação de WhatsApp. Recarregue a página e tente novamente.'
      }
    }

    if (currentToken !== validationToken) {
      return
    }

    validationInFlight = false
    pendingValidationPhone = null

    if (validation.ok) {
      isWhatsappValid = true
      validatedPhone = digits
      inputs.phone.dataset.touched = 'true'
      setInputState(inputs.phone, true, { force: true })
      showMessage(resultBox, 'WhatsApp válido! Já podemos prosseguir.', { tone: 'success' })
    } else {
      isWhatsappValid = false
      validatedPhone = null
      inputs.phone.dataset.touched = 'true'
      setInputState(inputs.phone, false, { force: true })
      const message =
        validation.message || 'Não encontramos WhatsApp nesse número. Informe outro com WhatsApp ativo.'
      showMessage(resultBox, message, { tone: 'error' })
      tracker?.sendEvent?.('LeadFormError', { reason: 'whatsapp_invalid', response: validation.body ?? null })
    }

    applySubmitAvailability()
  }

  applySubmitAvailability()

  const initialDigits = inputs.phone ? sanitizePhone(inputs.phone.value) : ''
  if (initialDigits.length === 11) {
    triggerWhatsAppValidation(initialDigits)
  } else if (initialDigits.length) {
    handleIncompletePhone(initialDigits)
  }

  const preSubmitted = getSessionFlag(STORAGE_KEYS.formSubmitted)
  if (preSubmitted) {
    replaceFormWithMessage(form)
    return
  }

  let preencheuFormDispatched = Boolean(getSessionFlag(STORAGE_KEYS.formCompleted))

  const maybeDispatchPreencheu = () => {
    const data = collectFormData(form)
    const complete = validateForm(data, inputs)

    if (!preencheuFormDispatched && complete) {
      preencheuFormDispatched = true
      setSessionFlag(STORAGE_KEYS.formCompleted, true)
      tracker.sendEvent('PreencheuForm', {
        form_state: 'completed',
        phone: data.phone,
        email: sanitizer.email(data.email),
        name: sanitizer.text(data.name)
      })
    }
  }

  Object.values(inputs).forEach((input) => {
    if (!input) return

    input.addEventListener('input', () => {
      if (submitButton?.dataset.loading === 'true') return
      if (input.id === 'phone') {
        const sanitized = sanitizePhone(input.value)
        if (sanitized.length > 11) {
          input.value = input.value.slice(0, input.value.length - 1)
        }
        if (sanitized.length < 11) {
          handleIncompletePhone(sanitized)
        } else if (sanitized.length === 11) {
          if (isWhatsappValid && sanitized === validatedPhone) {
            showMessage(resultBox, 'WhatsApp válido! Já podemos prosseguir.', { tone: 'success' })
            applySubmitAvailability()
          } else {
            triggerWhatsAppValidation(sanitized)
          }
        }
      }
      maybeDispatchPreencheu()
    })

    input.addEventListener('blur', () => {
      input.dataset.touched = 'true'
      const data = collectFormData(form)
      if (input.id === 'phone') {
        const digits = data.phone
        const phoneIsValid = digits.length === 11 && isWhatsappValid && digits === validatedPhone
        setInputState(inputs.phone, phoneIsValid, { force: true })
        if (!phoneIsValid && digits.length === 11 && !validationInFlight) {
          showMessage(
            resultBox,
            'Valide um número de WhatsApp ativo para prosseguir com o atendimento.',
            { tone: 'error' }
          )
        }
        return
      }
      validateField(input.id, data[input.id], inputs)
    })
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submitButton?.dataset.loading === 'true') return
    const formData = collectFormData(form)

    const isValid = validateForm(formData, inputs, { force: true })
    if (!isValid) {
      showMessage(resultBox, 'Preencha nome, e-mail e WhatsApp completo com DDD.', { tone: 'error' })
      tracker.sendEvent('LeadFormError', { reason: 'invalid_fields' })
      return
    }

    if (!isWhatsappValid || formData.phone !== validatedPhone) {
      showMessage(resultBox, 'Valide um número de WhatsApp ativo para continuar.', { tone: 'error' })
      tracker.sendEvent('LeadFormError', { reason: 'whatsapp_not_validated' })
      return
    }

    toggleLoading(submitButton, true)
    showMessage(resultBox, 'Enviando seus dados com segurança...', { tone: 'neutral' })

    try {
      const sanitizedPayload = {
        name: sanitizer.text(formData.name),
        email: sanitizer.email(formData.email),
        phone: formData.phone,
        session_id: tracker.sessionId,
        utm: tracker.utmParams,
        validated_at: new Date().toISOString(),
        gender: inferGenderFromName(formData.name)
      }

      setSessionFlag(STORAGE_KEYS.leadPayload, sanitizedPayload)
      await tracker.sendEvent('Lead', sanitizedPayload)

      setSessionFlag(STORAGE_KEYS.formSubmitted, true)
      showMessage(resultBox, 'Tudo certo! Redirecionando você para o próximo passo...', { tone: 'success' })
      Object.values(inputs).forEach((input) => setInputState(input, true, { force: true }))
      replaceFormWithMessage(form)

      window.location.href = '/obrigado'
    } catch (error) {
      console.error('[LeadForm] Erro ao enviar dados do lead', error)
      toggleLoading(submitButton, false)
      applySubmitAvailability()
      showMessage(resultBox, 'Não foi possível enviar seus dados. Tente novamente em instantes.', {
        tone: 'error'
      })
      tracker.sendEvent('LeadFormError', { reason: 'submission_failed' })
    }
  })
}
