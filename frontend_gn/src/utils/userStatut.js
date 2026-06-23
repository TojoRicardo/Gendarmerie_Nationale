/**
 * Statut effectif utilisateur — aligné sur le backend (user_status.py).
 * suspendu > actif (connexion 7 j) > inactif
 */

const ACTIVE_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function getStatutEffectif(user) {
  if (!user) return 'inactif'
  if (user.statut_effectif) {
    return user.statut_effectif.toLowerCase()
  }

  const statut = (user.statut || '').toString().toLowerCase().trim()
  if (statut === 'suspendu') return 'suspendu'

  if (user.is_current_user || user.is_connected) return 'actif'

  const dates = [user.last_login, user.derniereConnexion].filter(Boolean)
  if (dates.length) {
    const limite = Date.now() - ACTIVE_DAYS_MS
    if (dates.some((d) => new Date(d).getTime() >= limite)) return 'actif'
  }

  return 'inactif'
}

export function countUsersByStatut(users = []) {
  const counts = { total: users.length, actifs: 0, inactifs: 0, suspendus: 0 }
  users.forEach((u) => {
    const s = getStatutEffectif(u)
    if (s === 'suspendu') counts.suspendus += 1
    else if (s === 'actif') counts.actifs += 1
    else counts.inactifs += 1
  })
  return counts
}

export function filterUsersByStatut(users = [], filtre) {
  if (!filtre || filtre === 'tous') return users
  return users.filter((u) => getStatutEffectif(u) === filtre)
}

export const STATUT_CONFIG = {
  actif: {
    label: 'Actif',
    dotClass: 'bg-green-500 animate-pulse',
    textColor: 'text-green-600',
    badgeClass: 'bg-green-100 text-green-800 border border-green-300',
    bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    dotColor: '#10b981',
  },
  inactif: {
    label: 'Inactif',
    dotClass: 'bg-gray-500',
    textColor: 'text-gray-600',
    badgeClass: 'bg-red-100 text-red-800 border border-red-300',
    bgGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    dotColor: '#6b7280',
  },
  suspendu: {
    label: 'Suspendu',
    dotClass: 'bg-red-500',
    textColor: 'text-red-600',
    badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300',
    bgGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    dotColor: '#ef4444',
  },
}

export function getStatutConfig(statut) {
  return STATUT_CONFIG[statut] || STATUT_CONFIG.inactif
}
