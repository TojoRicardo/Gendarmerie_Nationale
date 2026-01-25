import { ROLES } from './permissions'

/**
 * Utilitaire pour mapper les rôles entre le backend et le frontend
 * Gère les IDs numériques et les noms de rôles
 */

// Mapping des IDs numériques vers les rôles
const NUMERIC_ROLE_MAP = {
  1: ROLES.ADMINISTRATEUR,
  2: ROLES.ENQUETEUR,
  3: ROLES.ANALYSTE,
  4: ROLES.OBSERVATEUR,
}

// Mapping des noms de rôles (backend vers frontend)
const NAME_ROLE_MAP = {
  'admin': ROLES.ADMINISTRATEUR,
  'administrateur': ROLES.ADMINISTRATEUR,
  'officer': ROLES.ENQUETEUR,
  'enqueteur_principal': ROLES.ENQUETEUR,
  'enquêteur': ROLES.ENQUETEUR,
  'supervisor': ROLES.ENQUETEUR,
  'analyst': ROLES.ANALYSTE,
  'analyste': ROLES.ANALYSTE,
  'analyste_judiciaire': ROLES.ANALYSTE,
  'viewer': ROLES.OBSERVATEUR,
  'observateur': ROLES.OBSERVATEUR,
  'observateur_externe': ROLES.OBSERVATEUR,
}

/**
 * Normalise un rôle (ID numérique ou nom) vers le format frontend
 * @param {any} role - Le rôle à normaliser (peut être un ID, un nom, ou un objet)
 * @returns {string|null} - Le rôle normalisé ou null si non reconnu
 */
export const normalizeRole = (role) => {
  if (!role) return null
  
  // Si c'est un objet avec une propriété name
  const roleName = typeof role === 'object' ? role.name : role
  
  // Gestion des IDs numériques
  if (typeof roleName === 'number' || (typeof roleName === 'string' && !isNaN(roleName))) {
    const numericId = parseInt(roleName)
    const mappedRole = NUMERIC_ROLE_MAP[numericId]
    if (mappedRole) {
      console.log(` Rôle ID ${numericId} mappé vers: ${mappedRole}`)
      return mappedRole
    }
  }
  
  // Si c'est une chaîne, vérifier qu'elle est valide
  if (typeof roleName !== 'string') {
    console.warn(' Format de rôle non reconnu:', roleName, typeof roleName)
    return null
  }
  
  // Mapping par nom
  const mappedRole = NAME_ROLE_MAP[roleName.toLowerCase()] || roleName
  
  // Vérifier si le rôle mappé est valide
  const validRoles = Object.values(ROLES)
  if (validRoles.includes(mappedRole)) {
    return mappedRole
  }
  
  console.warn(' Rôle non reconnu:', roleName, 'mappé vers:', mappedRole)
  return null
}

/**
 * Obtient l'ID numérique d'un rôle
 * @param {string} role - Le nom du rôle
 * @returns {number|null} - L'ID numérique ou null si non trouvé
 */
export const getRoleId = (role) => {
  const entry = Object.entries(NUMERIC_ROLE_MAP).find(([id, name]) => name === role)
  return entry ? parseInt(entry[0]) : null
}

/**
 * Vérifie si un rôle est valide
 * @param {any} role - Le rôle à vérifier
 * @returns {boolean} - True si le rôle est valide
 */
export const isValidRole = (role) => {
  const normalizedRole = normalizeRole(role)
  const validRoles = Object.values(ROLES)
  return validRoles.includes(normalizedRole)
}

/**
 * Obtient tous les rôles disponibles
 * @returns {Array} - Liste de tous les rôles valides
 */
export const getAllRoles = () => {
  return Object.values(ROLES)
}

/**
 * Obtient les informations de mapping des rôles
 * @returns {Object} - Informations de debug sur les mappings
 */
export const getRoleMappingInfo = () => {
  return {
    numericMapping: NUMERIC_ROLE_MAP,
    nameMapping: NAME_ROLE_MAP,
    validRoles: Object.values(ROLES)
  }
}
