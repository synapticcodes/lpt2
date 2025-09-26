const DIGIT_REGEX = /\D+/g

export function sanitizePhone(value = '') {
  return value.replace(DIGIT_REGEX, '').slice(0, 11)
}

export function toE164(value = '', countryCode = '55') {
  const digits = value.replace(DIGIT_REGEX, '')
  const normalizedCountryCode = String(countryCode)

  if (!digits) return ''

  if (digits.startsWith(normalizedCountryCode)) {
    const minLength = normalizedCountryCode.length + 10
    const maxLength = 15
    return digits.length >= minLength && digits.length <= maxLength ? digits : ''
  }

  const nationalNumber = sanitizePhone(digits)
  if (!nationalNumber) return ''

  if (nationalNumber.length >= 10 && nationalNumber.length <= 13) {
    const candidate = `${normalizedCountryCode}${nationalNumber}`
    return candidate.length <= 15 ? candidate : ''
  }

  return ''
}

export function formatPhone(value = '') {
  const digits = sanitizePhone(value)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function isValidPhone(value = '') {
  return sanitizePhone(value).length === 11
}

export function attachPhoneMask(input) {
  if (!input) return

  const handleInput = (event) => {
    const { selectionStart } = event.target
    const rawValue = event.target.value
    event.target.value = formatPhone(rawValue)
    if (selectionStart) {
      event.target.setSelectionRange(event.target.value.length, event.target.value.length)
    }
  }

  input.addEventListener('input', handleInput)
  input.addEventListener('blur', handleInput)
  input.value = formatPhone(input.value)
}
