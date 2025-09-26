const TOAST_INTERVAL_MS = 5000
const TOAST_LIFETIME_RANGE = [6000, 8000]
const STORAGE_KEY = 'mnok_toast_last_timestamp'

const PEOPLE = [
  'José Almeida',
  'Maria das Graças',
  'Antônio Pereira',
  'Lúcia Fernandes',
  'Carlos Alberto',
  'Fernanda Gomes',
  'Raimundo Souza',
  'Helena Castro',
  'Eduardo Ramos',
  'Marina Carvalho',
  'Vera Lúcia',
  'Sebastião Santos'
]

const CITIES = [
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Salvador',
  'Fortaleza',
  'Recife',
  'Curitiba',
  'Porto Alegre',
  'Brasília',
  'Belém',
  'Goiânia',
  'Campinas'
]

const STATES = ['SP', 'RJ', 'MG', 'BA', 'CE', 'PE', 'PR', 'RS', 'DF', 'PA', 'GO', 'SC']

function createContainer() {
  let container = document.querySelector('.toast-stack')
  if (container) return container

  container = document.createElement('div')
  container.className = 'toast-stack'
  container.setAttribute('aria-live', 'polite')
  container.setAttribute('aria-atomic', 'false')
  document.body.appendChild(container)
  return container
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function createToastMessage() {
  const name = randomItem(PEOPLE)
  const city = randomItem(CITIES)
  const state = randomItem(STATES)
  return `${name} de ${city} - ${state} acabou de reduzir a dívida.`
}

function createToastElement(message) {
  const toast = document.createElement('div')
  toast.className = 'toast-notification'
  toast.innerHTML = `
    <strong>Mais um caso vitorioso hoje!</strong>
    <span>${message}</span>
  `
  return toast
}

function addToast(container) {
  const message = createToastMessage()
  const toast = createToastElement(message)
  container.appendChild(toast)

  const lifetime = Math.floor(
    TOAST_LIFETIME_RANGE[0] + Math.random() * (TOAST_LIFETIME_RANGE[1] - TOAST_LIFETIME_RANGE[0])
  )

  setTimeout(() => {
    toast.classList.add('is-leaving')
    setTimeout(() => {
      toast.remove()
    }, 400)
  }, lifetime)
}

export function initToastNotifications() {
  if (typeof window === 'undefined') return

  const container = createContainer()

  const lastTimestamp = sessionStorage.getItem(STORAGE_KEY)
  const now = Date.now()
  if (lastTimestamp && now - Number(lastTimestamp) < TOAST_INTERVAL_MS) {
    addToast(container)
  }

  addToast(container)
  sessionStorage.setItem(STORAGE_KEY, String(Date.now()))

  setInterval(() => {
    addToast(container)
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
  }, TOAST_INTERVAL_MS)
}
