/**
 * Configuration de la redirection par rôle
 * Définit où chaque type d'utilisateur doit être redirigé après connexion
 *  Important: Ces routes doivent correspondre à celles définies dans le backend
 */

const ADMIN_CONFIG = {
  route: '/dashboard',
  primaryRoute: '/dashboard',
    message: 'Bienvenue, Administrateur. Accès complet au système.',
    features: ['Gestion complète', 'Tous les modules', 'Configuration système'],
  allowedRoutes: ['*'],
    color: 'red'
}
  
const OBSERVATEUR_CONFIG = {
    route: '/dashboard',
    primaryRoute: '/dashboard',
    message: 'Bienvenue, Observateur. Consultation des données uniquement.',
    features: ['Consultation fiches', 'Consultation rapports', 'Export données'],
  allowedRoutes: [
    '/dashboard',
    '/fiches-criminelles',
    '/rapports',
    '/rapports/dashboard',
    '/analytics',
    '/ia',
    '/notifications'
  ],
    color: 'gray'
}

const ENQUETEUR_CONFIG = {
  route: '/enquete',
  primaryRoute: '/enquete',
    message: 'Bienvenue, Enquêteur Principal. Gestion des enquêtes activée.',
  features: ['Assignations', 'Module enquête', 'Preuves', 'Rapports', 'Audit'],
  allowedRoutes: [
    '/dashboard',
    '/assignations',
    '/enquete',
    '/enquete/preuves',
    '/enquete/rapports',
    '/enquete/observations',
    '/enquete/avancement',
    '/fiches-criminelles',
    '/biometrie',
    '/biometrie-criminelle',
    '/photos-biometriques',
    '/analytics',
    '/ia',
    '/rapports',
    '/rapports/dashboard',
    '/rapports/generer'
  ],
    color: 'blue'
}
  
const ANALYSTE_CONFIG = {
    route: '/rapports/dashboard',
    primaryRoute: '/rapports',
    message: 'Bienvenue, Analyste. Module de rapports et analyses.',
    features: ['Rapports', 'Statistiques', 'IA Prédictive'],
  allowedRoutes: [
    '/dashboard',
    '/rapports',
    '/rapports/dashboard',
    '/rapports/generer',
    '/analytics',
    '/ia',
  ],
    color: 'purple'
}

export const ROLE_REDIRECTS = {
  'Administrateur Système': ADMIN_CONFIG,
  'Administrateur': ADMIN_CONFIG,
  'Observateur': OBSERVATEUR_CONFIG,
  'Observateur Externe': OBSERVATEUR_CONFIG,
  'Enquêteur Principal': ENQUETEUR_CONFIG,
  'Enquêteur': ENQUETEUR_CONFIG,
  'Analyste': ANALYSTE_CONFIG,
  'Analyste Judiciaire': ANALYSTE_CONFIG,
  // Rôle par défaut si non reconnu
  'default': {
    route: '/dashboard',
    primaryRoute: '/dashboard',
    message: 'Bienvenue dans le système.',
    features: ['Tableau de bord'],
    allowedRoutes: ['/dashboard'],
    color: 'gray'
  }
}

/**
 * Obtient la route de redirection pour un rôle donné
 * @param {string} role - Le rôle de l'utilisateur
 * @returns {object} - Configuration de redirection {route, message, features}
 */
export const getRoleRedirect = (role) => {
  return ROLE_REDIRECTS[role] || ROLE_REDIRECTS['default']
}

/**
 * Génère un message de bienvenue personnalisé
 * @param {object} user - L'objet utilisateur
 * @returns {string} - Message de bienvenue
 */
export const getWelcomeMessage = (user) => {
  const { prenom, nom, role } = user
  const userName = prenom && nom ? `${prenom} ${nom}` : user.username
  const roleConfig = getRoleRedirect(role)
  
  return {
    title: `Bienvenue, ${userName}`,
    subtitle: roleConfig.message,
    features: roleConfig.features,
    role: role
  }
}

/**
 * Détermine si l'utilisateur doit voir le tutoriel selon son rôle
 * @param {string} role - Le rôle de l'utilisateur
 * @returns {boolean}
 */
export const shouldShowTutorial = (role) => {
  return ['Opérateur de Saisie', 'Enquêteur Junior'].includes(role)
}

/**
 * Retourne les modules accessibles pour un rôle
 * @param {string} role - Le rôle de l'utilisateur
 * @returns {array} - Liste des modules accessibles
 */
export const getAccessibleModules = (role) => {
  const config = getRoleRedirect(role)
  return config.features || []
}

/**
 * Vérifie si l'utilisateur a accès à une route donnée
 * @param {string} role - Le rôle de l'utilisateur
 * @param {string} currentPath - Le chemin actuel
 * @returns {boolean} - True si l'utilisateur a accès
 */
export const hasAccessToRoute = (role, currentPath = '') => {
  const config = getRoleRedirect(role)
  const sanitizedPath = currentPath.split('?')[0] || '/'

  // Administrateur (ou toute config avec wildcard) a accès à tout
  if (config.allowedRoutes.includes('*')) {
    return true
  }
  
  return config.allowedRoutes.some(route => sanitizedPath.startsWith(route))
}

/**
 * Détermine si une redirection est nécessaire
 * @param {string} role - Le rôle de l'utilisateur
 * @param {string} currentPath - Le chemin actuel
 * @returns {boolean} - True si redirection nécessaire
 */
export const shouldRedirectToRoleRoute = (role, currentPath) => {
  // Ne pas rediriger sur la page de login
  if (currentPath === '/login' || currentPath === '/connexion') {
    return false
  }
  
  // Si l'utilisateur n'a pas accès à la route actuelle
  if (!hasAccessToRoute(role, currentPath)) {
    return true
  }
  
  return false
}

/**
 * Obtient la couleur associée au rôle
 * @param {string} role - Le rôle de l'utilisateur
 * @returns {string} - Couleur Tailwind
 */
export const getRoleColor = (role) => {
  const config = getRoleRedirect(role)
  return config.color || 'gray'
}

/**
 * Format le nom du rôle pour l'affichage
 * @param {string} role - Le rôle de l'utilisateur
 * @returns {string} - Nom formaté
 */
export const formatRoleName = (role) => {
  return role || 'Utilisateur'
}

/**
 * Obtient l'icône associée au rôle (Font Awesome)
 * @param {string} role - Le rôle de l'utilisateur
 * @returns {string} - Classe d'icône
 */
export const getRoleIcon = (role) => {
  const icons = {
    'Administrateur Système': 'fa-user-shield',
    'Enquêteur Principal': 'fa-user-tie',
    'Enquêteur Junior': 'fa-user',
    'Analyste': 'fa-chart-line',
    'Opérateur de Saisie': 'fa-keyboard',
    'Superviseur': 'fa-user-check',
  }
  
  return icons[role] || 'fa-user'
}

