/**
 * Constantes de Permissions
 * Définit toutes les permissions disponibles dans le système
 * À synchroniser avec backend_gn/Utilisateur/permissions.py
 */

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  
  // Fiches Criminelles
  FICHES_VIEW: 'fiches.view',
  FICHES_CREATE: 'fiches.create',
  FICHES_EDIT: 'fiches.edit',
  FICHES_DELETE: 'fiches.delete',
  
  // Biométrie
  BIOMETRIE_VIEW: 'biometrie.view',
  BIOMETRIE_ADD: 'biometrie.add',
  BIOMETRIE_EDIT: 'biometrie.edit',
  BIOMETRIE_DELETE: 'biometrie.delete',
  
  // Rapports
  REPORTS_VIEW: 'reports.view',
  REPORTS_CREATE: 'reports.create',
  REPORTS_EXPORT: 'reports.export',
  
  // Notifications & Emails
  NOTIFICATIONS_VIEW: 'notifications.view',
  
  // Intelligence Artificielle
  IA_VIEW_RESULTS: 'ia.view_results',
  IA_USE_RECOGNITION: 'ia.use_recognition',
  IA_USE_PREDICTION: 'ia.use_prediction',
  
  // Audit
  AUDIT_VIEW: 'audit.view',
  AUDIT_VIEW_OWN: 'audit.view_own',
  AUDIT_VIEW_ALL: 'audit.view_all',
  
  // Utilisateurs
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  
  // Rôles et Permissions
  ROLES_VIEW: 'roles.view',
  ROLES_MANAGE: 'roles.manage',
  
  // Enquêtes
  INVESTIGATIONS_CREATE: 'investigations.create',
  INVESTIGATIONS_EDIT: 'investigations.edit',
  INVESTIGATIONS_CLOSE: 'investigations.close',
  INVESTIGATIONS_VIEW: 'investigations.view',
  
  // Suspects
  SUSPECTS_CREATE: 'suspects.create',
  SUSPECTS_EDIT: 'suspects.edit',
  SUSPECTS_VIEW: 'suspects.view',
  
  // Preuves
  EVIDENCE_MANAGE: 'evidence.manage',
  EVIDENCE_VIEW: 'evidence.view',
  
  // Analyses
  ANALYTICS_VIEW: 'analytics.view',
}

/**
 * Configuration des permissions par rôle
 * Correspond exactement aux spécifications
 */
export const ROLE_PERMISSIONS = {
  'Administrateur Système': {
    description: 'Accès complet à toutes les fonctionnalités du système',
    color: 'red',
    permissions: Object.values(PERMISSIONS), // Toutes les permissions
  },
  
  'Observateur': {
    description: 'Consultation uniquement, sans modification',
    color: 'gray',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.FICHES_VIEW,
      PERMISSIONS.BIOMETRIE_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.NOTIFICATIONS_VIEW,
      PERMISSIONS.IA_VIEW_RESULTS,
      PERMISSIONS.INVESTIGATIONS_VIEW,
      PERMISSIONS.SUSPECTS_VIEW,
      PERMISSIONS.EVIDENCE_VIEW,
    ],
  },
  
  'Enquêteur Principal': {
    description: 'Responsable des enquêtes, création et gestion complète des dossiers criminels',
    color: 'blue',
    permissions: [
      //  Tableau de bord
      PERMISSIONS.DASHBOARD_VIEW,
      
      //  Fichier criminel (création, modification, suppression)
      PERMISSIONS.FICHES_VIEW,
      PERMISSIONS.FICHES_CREATE,
      PERMISSIONS.FICHES_EDIT,
      PERMISSIONS.FICHES_DELETE,
      
      //  Biométrie (ajout de données faciales, empreintes)
      PERMISSIONS.BIOMETRIE_VIEW,
      PERMISSIONS.BIOMETRIE_ADD,
      PERMISSIONS.BIOMETRIE_EDIT,
      
      //  Rapport (génération et consultation)
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_CREATE,
      PERMISSIONS.REPORTS_EXPORT,
      
      //  Intelligence artificielle (reconnaissance faciale, prédiction)
      PERMISSIONS.IA_VIEW_RESULTS,
      PERMISSIONS.IA_USE_RECOGNITION,
      PERMISSIONS.IA_USE_PREDICTION,
      
      // Enquêtes
      PERMISSIONS.INVESTIGATIONS_CREATE,
      PERMISSIONS.INVESTIGATIONS_EDIT,
      PERMISSIONS.INVESTIGATIONS_CLOSE,
      PERMISSIONS.INVESTIGATIONS_VIEW,
      
      // Suspects
      PERMISSIONS.SUSPECTS_CREATE,
      PERMISSIONS.SUSPECTS_EDIT,
      PERMISSIONS.SUSPECTS_VIEW,
      
      // Preuves
      PERMISSIONS.EVIDENCE_MANAGE,
      PERMISSIONS.EVIDENCE_VIEW,
      
      // Analyses
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.NOTIFICATIONS_VIEW,
    ],
  },
  
  'Analyste': {
    description: 'Spécialiste en analyse de données et rapports',
    color: 'purple',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.FICHES_VIEW,
      PERMISSIONS.BIOMETRIE_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_CREATE,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.IA_VIEW_RESULTS,
      PERMISSIONS.IA_USE_PREDICTION,
      PERMISSIONS.AUDIT_VIEW_OWN,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.EVIDENCE_VIEW,
      PERMISSIONS.NOTIFICATIONS_VIEW,
    ],
  },
}

/**
 * Descriptions lisibles des permissions
 */
export const PERMISSION_LABELS = {
  [PERMISSIONS.DASHBOARD_VIEW]: 'Voir le tableau de bord',
  
  [PERMISSIONS.FICHES_VIEW]: 'Consulter les fiches criminelles',
  [PERMISSIONS.FICHES_CREATE]: 'Créer des fiches criminelles',
  [PERMISSIONS.FICHES_EDIT]: 'Modifier les fiches criminelles',
  [PERMISSIONS.FICHES_DELETE]: 'Supprimer les fiches criminelles',
  
  [PERMISSIONS.BIOMETRIE_VIEW]: 'Consulter les données biométriques',
  [PERMISSIONS.BIOMETRIE_ADD]: 'Ajouter des données biométriques',
  [PERMISSIONS.BIOMETRIE_EDIT]: 'Modifier les données biométriques',
  [PERMISSIONS.BIOMETRIE_DELETE]: 'Supprimer les données biométriques',
  
  [PERMISSIONS.REPORTS_VIEW]: 'Consulter les rapports',
  [PERMISSIONS.REPORTS_CREATE]: 'Générer des rapports',
  [PERMISSIONS.REPORTS_EXPORT]: 'Exporter des rapports',
  
  [PERMISSIONS.NOTIFICATIONS_VIEW]: 'Consulter les notifications',
  
  [PERMISSIONS.IA_VIEW_RESULTS]: 'Voir les résultats IA',
  [PERMISSIONS.IA_USE_RECOGNITION]: 'Utiliser la reconnaissance faciale',
  [PERMISSIONS.IA_USE_PREDICTION]: 'Utiliser l\'analyse prédictive',
  
  [PERMISSIONS.AUDIT_VIEW]: 'Consulter le journal d\'audit',
  [PERMISSIONS.AUDIT_VIEW_OWN]: 'Voir ses propres actions',
  [PERMISSIONS.AUDIT_VIEW_ALL]: 'Voir toutes les actions',
  
  [PERMISSIONS.USERS_VIEW]: 'Consulter les utilisateurs',
  [PERMISSIONS.USERS_CREATE]: 'Créer des utilisateurs',
  [PERMISSIONS.USERS_EDIT]: 'Modifier des utilisateurs',
  [PERMISSIONS.USERS_DELETE]: 'Supprimer des utilisateurs',
  
  [PERMISSIONS.ROLES_VIEW]: 'Consulter les rôles',
  [PERMISSIONS.ROLES_MANAGE]: 'Gérer les rôles et permissions',
}

export default PERMISSIONS

