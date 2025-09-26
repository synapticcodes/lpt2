const NAME_GENDER_MAP = {
  joao: 'm',
  jose: 'm',
  pedro: 'm',
  paulo: 'm',
  carlos: 'm',
  luiz: 'm',
  luis: 'm',
  miguel: 'm',
  gabriel: 'm',
  lucas: 'm',
  mateus: 'm',
  maria: 'f',
  ana: 'f',
  mariana: 'f',
  julia: 'f',
  juliana: 'f',
  beatriz: 'f',
  fernanda: 'f',
  amanda: 'f',
  camila: 'f',
  carla: 'f',
  patricia: 'f',
  gabriela: 'f'
}

function normalize(value = '') {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
}

export function inferGenderFromName(fullName) {
  if (!fullName) return undefined
  const normalized = normalize(fullName)
  if (!normalized) return undefined
  const [first] = normalized.split(/\s+/)
  if (!first) return undefined
  if (NAME_GENDER_MAP[first]) {
    return NAME_GENDER_MAP[first]
  }
  if (first.endsWith('son')) return 'm'
  const lastChar = first[first.length - 1]
  if (lastChar === 'a') return 'f'
  if (lastChar === 'o') return 'm'
  return undefined
}
