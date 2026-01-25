// Définition des rôles et leurs permissions
export const ROLES = {
  ADMINISTRATEUR: 'Administrateur',
  ENQUETEUR: 'Enquêteur Principal',
  ANALYSTE: 'Analyste Judiciaire',
  OBSERVATEUR: 'Observateur Externe',
}

// Permissions disponibles dans le système
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  
  // Utilisateurs
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  
  // Rôles
  ROLES_VIEW: 'roles.view',
  ROLES_MANAGE: 'roles.manage',
  
  // Fiches criminelles
  FICHES_VIEW: 'fiches.view',
  FICHES_CREATE: 'fiches.create',
  FICHES_EDIT: 'fiches.edit',
  FICHES_DELETE: 'fiches.delete',
  
  // Suspects
  SUSPECTS_VIEW: 'suspects.view',
  SUSPECTS_ADD: 'suspects.add',
  SUSPECTS_EDIT: 'suspects.edit',
  
  // Preuves
  PREUVES_VIEW: 'preuves.view',
  PREUVES_ADD: 'preuves.add',
  PREUVES_EDIT: 'preuves.edit',
  PREUVES_DELETE: 'preuves.delete',
  
  // Biométrie
  BIOMETRIE_VIEW: 'biometrie.view',
  BIOMETRIE_ADD: 'biometrie.add',
  BIOMETRIE_EDIT: 'biometrie.edit',
  BIOMETRIE_UPLOAD: 'biometrie.upload',
  
  // IA
  // IA_USE: 'ia.use', // ⚠️ N'existe pas dans le backend - Supprimé
  IA_VIEW_RESULTS: 'ia.view_results',
  IA_USE_RECOGNITION: 'ia.use_recognition',
  IA_USE_PREDICTION: 'ia.use_prediction',
  
  // Rapports
  REPORTS_VIEW: 'reports.view',
  REPORTS_CREATE: 'reports.create',
  REPORTS_GENERATE: 'reports.generate',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_EDIT: 'reports.edit',
  REPORTS_VALIDATE: 'reports.validate',
  
  // Audit
  AUDIT_VIEW: 'audit.view',
  
  // Statistiques
  STATS_VIEW: 'stats.view',
  STATS_ADVANCED: 'stats.advanced',
  
  // Paramètres système
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_DATABASE: 'system.database',
}

// Mapping des rôles avec leurs permissions
export const ROLE_PERMISSIONS = {
  [ROLES.ADMINISTRATEUR]: [
    // Toutes les permissions
    ...Object.values(PERMISSIONS)
  ],
  
  [ROLES.ENQUETEUR]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FICHES_VIEW,
    PERMISSIONS.FICHES_CREATE,
    PERMISSIONS.FICHES_EDIT,
    PERMISSIONS.FICHES_DELETE, // Peut supprimer ses propres fiches
    PERMISSIONS.SUSPECTS_VIEW,
    PERMISSIONS.SUSPECTS_ADD,
    PERMISSIONS.SUSPECTS_EDIT,
    PERMISSIONS.PREUVES_VIEW,
    PERMISSIONS.PREUVES_ADD,
    PERMISSIONS.PREUVES_EDIT,
    PERMISSIONS.PREUVES_DELETE, // Peut supprimer les preuves de ses enquêtes
    PERMISSIONS.BIOMETRIE_VIEW,
    PERMISSIONS.BIOMETRIE_ADD,
    PERMISSIONS.BIOMETRIE_EDIT,
    PERMISSIONS.BIOMETRIE_UPLOAD,
    PERMISSIONS.IA_VIEW_RESULTS,
    PERMISSIONS.IA_USE_RECOGNITION,
    PERMISSIONS.IA_USE_PREDICTION,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.REPORTS_EDIT, // Peut modifier ses rapports
    PERMISSIONS.REPORTS_VALIDATE, // Peut valider ses rapports
    PERMISSIONS.STATS_VIEW,
    PERMISSIONS.AUDIT_VIEW, // Peut consulter les actions de son équipe
  ],
  
  [ROLES.ANALYSTE]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FICHES_VIEW,
    PERMISSIONS.SUSPECTS_VIEW,
    PERMISSIONS.PREUVES_VIEW,
    PERMISSIONS.BIOMETRIE_VIEW,
    PERMISSIONS.IA_VIEW_RESULTS,
    PERMISSIONS.IA_USE_RECOGNITION,
    PERMISSIONS.IA_USE_PREDICTION,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.STATS_VIEW,
    PERMISSIONS.STATS_ADVANCED,
    PERMISSIONS.AUDIT_VIEW, // Lecture seule pour suivis d'activité
  ],
  
  [ROLES.OBSERVATEUR]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.FICHES_VIEW,
    PERMISSIONS.SUSPECTS_VIEW,
    PERMISSIONS.PREUVES_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
  ],
}

// Fonction pour vérifier si un utilisateur a une permission
export const hasPermission = (userRole, permission) => {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes(permission)
}

// Fonction pour vérifier si un utilisateur a au moins une des permissions
export const hasAnyPermission = (userRole, permissions) => {
  return permissions.some(permission => hasPermission(userRole, permission))
}

// Fonction pour vérifier si un utilisateur a toutes les permissions
export const hasAllPermissions = (userRole, permissions) => {
  return permissions.every(permission => hasPermission(userRole, permission))
}

// Fonction pour obtenir toutes les permissions d'un rôle
export const getRolePermissions = (userRole) => {
  return ROLE_PERMISSIONS[userRole] || []
}

// Fonction pour vérifier la propriété d'une ressource
// Utilisée pour vérifier si un enquêteur peut modifier/supprimer une fiche
export const canModifyResource = (userRole, userId, resourceOwnerId) => {
  // L'administrateur peut tout modifier
  if (userRole === ROLES.ADMINISTRATEUR) {
    return true
  }
  
  // L'enquêteur peut modifier uniquement ses propres ressources
  if (userRole === ROLES.ENQUETEUR) {
    return userId === resourceOwnerId
  }
  
  // Les autres rôles ne peuvent rien modifier
  return false
}

// Fonction pour vérifier si un utilisateur peut supprimer une ressource
export const canDeleteResource = (userRole, userId, resourceOwnerId) => {
  // Même logique que canModifyResource
  return canModifyResource(userRole, userId, resourceOwnerId)
}

// Fonction pour obtenir les restrictions d'affichage selon le rôle
export const getDisplayRestrictions = (userRole) => {
  return {
    showCreateButtons: hasPermission(userRole, PERMISSIONS.FICHES_CREATE),
    showEditButtons: hasAnyPermission(userRole, [PERMISSIONS.FICHES_EDIT, PERMISSIONS.PREUVES_EDIT]),
    showDeleteButtons: hasAnyPermission(userRole, [PERMISSIONS.FICHES_DELETE, PERMISSIONS.PREUVES_DELETE]),
    showUserManagement: hasPermission(userRole, PERMISSIONS.USERS_VIEW),
    showRoleManagement: hasPermission(userRole, PERMISSIONS.ROLES_VIEW),
    showSystemSettings: hasPermission(userRole, PERMISSIONS.SYSTEM_SETTINGS),
    canExport: hasPermission(userRole, PERMISSIONS.REPORTS_EXPORT),
    canValidateReports: hasPermission(userRole, PERMISSIONS.REPORTS_VALIDATE),
    isReadOnly: userRole === ROLES.OBSERVATEUR || userRole === ROLES.ANALYSTE,
  }
}

