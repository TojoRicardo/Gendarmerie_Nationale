/**
 * Configuration du Menu de Navigation
 * Définit tous les éléments du menu avec leurs permissions requises
 */
import {
  Home,
  FileText,
  Users,
  Fingerprint,
  Brain,
  BarChart3,
  ClipboardList,
  FileSearch,
  ShieldCheck,
  Target,
  UserSearch,
} from 'lucide-react'
import { PERMISSIONS } from './permissions'

/**
 * Configuration complète du menu
 * Chaque élément est automatiquement filtré selon les permissions de l'utilisateur
 */
export const MENU_ITEMS = [
  {
    id: 'dashboard',
    icon: Home,
    label: 'Tableau de bord',
    path: '/dashboard',
    permission: PERMISSIONS.DASHBOARD_VIEW,
    gradient: 'from-gendarme-blue to-gendarme-blue-light',
    bgColor: 'bg-gendarme-blue/10',
    hoverBg: 'hover:bg-gendarme-blue/20',
    iconColor: 'text-gendarme-blue',
    description: 'Vue d\'ensemble et statistiques',
  },
  {
    id: 'assignations',
    icon: ClipboardList,
    label: 'Assignations',
    path: '/assignations',
    permission: PERMISSIONS.INVESTIGATIONS_VIEW,
    gradient: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-500/10',
    hoverBg: 'hover:bg-indigo-500/20',
    iconColor: 'text-indigo-500',
    description: 'Suivi des assignations d’enquête',
  },
  {
    id: 'enquete',
    icon: Target,
    label: 'Module Enquête',
    path: '/enquete',
    permission: PERMISSIONS.INVESTIGATIONS_VIEW,
    gradient: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500/10',
    hoverBg: 'hover:bg-emerald-500/20',
    iconColor: 'text-emerald-600',
    description: 'Gestion des preuves, rapports et observations',
    subActions: [
      {
        label: 'Ajouter preuve',
        path: '/enquete/preuves/ajouter',
        permission: PERMISSIONS.INVESTIGATIONS_CREATE,
      },
      {
        label: 'Ajouter rapport',
        path: '/enquete/rapports/ajouter',
        permission: PERMISSIONS.INVESTIGATIONS_CREATE,
      },
      {
        label: 'Observation',
        path: '/enquete/observations/ajouter',
        permission: PERMISSIONS.INVESTIGATIONS_VIEW,
      },
      {
        label: 'Mettre à jour',
        path: '/enquete/avancement',
        permission: PERMISSIONS.INVESTIGATIONS_EDIT,
      },
    ],
  },
  {
    id: 'fiches',
    icon: FileText,
    label: 'Fiches Criminelles',
    path: '/fiches-criminelles',
    permission: PERMISSIONS.FICHES_VIEW,
    gradient: 'from-gendarme-light to-gendarme-blue',
    bgColor: 'bg-gendarme-light/10',
    hoverBg: 'hover:bg-gendarme-light/20',
    iconColor: 'text-gendarme-light',
    description: 'Gestion des dossiers criminels',
    subActions: [
      {
        label: 'Créer une fiche',
        path: '/fiches-criminelles/creer',
        permission: PERMISSIONS.FICHES_CREATE,
      },
      {
        label: 'Consulter',
        path: '/fiches-criminelles',
        permission: PERMISSIONS.FICHES_VIEW,
      },
    ],
  },
  {
    id: 'biometrie',
    icon: Fingerprint,
    label: 'Biométrie',
    path: '/biometrie',
    permission: PERMISSIONS.BIOMETRIE_VIEW,
    gradient: 'from-gendarme-light to-gendarme-light-hover',
    bgColor: 'bg-gendarme-light/10',
    hoverBg: 'hover:bg-gendarme-light/20',
    iconColor: 'text-gendarme-light',
    description: 'Empreintes digitales et reconnaissance faciale',
    subActions: [
      {
        label: 'Ajouter empreintes',
        permission: PERMISSIONS.BIOMETRIE_ADD,
      },
      {
        label: 'Ajouter photo',
        permission: PERMISSIONS.BIOMETRIE_ADD,
      },
    ],
  },
  {
    id: 'upr',
    icon: UserSearch,
    label: 'UPR - Personnes Non Identifiées',
    path: '/upr',
    permission: PERMISSIONS.BIOMETRIE_VIEW,
    gradient: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    hoverBg: 'hover:bg-purple-500/20',
    iconColor: 'text-purple-500',
    description: 'Registre des personnes non identifiées avec reconnaissance faciale',
    subActions: [
      {
        label: 'Liste des UPR',
        path: '/upr',
        permission: PERMISSIONS.BIOMETRIE_VIEW,
      },
    ],
  },
  {
    id: 'rapports',
    icon: BarChart3,
    label: 'Rapports',
    path: '/rapports',
    permission: PERMISSIONS.REPORTS_VIEW,
    gradient: 'from-gendarme-gold to-gendarme-gold-light',
    bgColor: 'bg-gendarme-gold/10',
    hoverBg: 'hover:bg-gendarme-gold/20',
    iconColor: 'text-gendarme-gold-dark',
    description: 'Génération et consultation des rapports',
    subActions: [
      {
        label: 'Générer rapport',
        permission: PERMISSIONS.REPORTS_CREATE,
      },
      {
        label: 'Exporter',
        permission: PERMISSIONS.REPORTS_EXPORT,
      },
    ],
  },
  {
    id: 'ia',
    icon: Brain,
    label: 'Intelligence Artificielle',
    path: '/ia',
    permission: PERMISSIONS.IA_VIEW_RESULTS,
    gradient: 'from-gendarme-blue-light to-gendarme-light',
    bgColor: 'bg-gendarme-blue-light/10',
    hoverBg: 'hover:bg-gendarme-blue-light/20',
    iconColor: 'text-gendarme-blue-light',
    description: 'IA : Reconnaissance faciale et prédictions',
    subActions: [
      {
        label: 'Reconnaissance faciale',
        path: '/ia',
        permission: PERMISSIONS.IA_USE_RECOGNITION,
      },
      {
        label: 'Analyse prédictive',
        path: '/ia',
        permission: PERMISSIONS.IA_USE_PREDICTION,
      },
    ],
  },
  {
    id: 'utilisateurs',
    icon: Users,
    label: 'Utilisateurs',
    path: '/utilisateurs',
    permission: PERMISSIONS.USERS_VIEW,
    gradient: 'from-gendarme-blue to-gendarme-blue-dark',
    bgColor: 'bg-gendarme-blue-light/10',
    hoverBg: 'hover:bg-gendarme-blue-light/20',
    iconColor: 'text-gendarme-blue-light',
    description: 'Gestion des utilisateurs (Admin uniquement)',
  },
  {
    id: 'roles',
    icon: ShieldCheck,
    label: 'Rôles & Permissions',
    path: '/roles',
    permission: PERMISSIONS.ROLES_VIEW,
    gradient: 'from-gendarme-gold to-gendarme-gold-dark',
    bgColor: 'bg-gendarme-gold/10',
    hoverBg: 'hover:bg-gendarme-gold/20',
    iconColor: 'text-gendarme-gold-dark',
    description: 'Gestion des rôles (Admin uniquement)',
  },
  {
    id: 'audit',
    icon: FileSearch,
    label: 'Journal d\'audit',
    path: '/audit',
    permission: PERMISSIONS.AUDIT_VIEW, // 'audit.view'
    // Permissions alternatives pour permettre l'accès avec AUDIT_VIEW_OWN ou AUDIT_VIEW_ALL
    // Format: ['audit.view_own', 'audit.view_all']
    alternativePermissions: [PERMISSIONS.AUDIT_VIEW_OWN, PERMISSIONS.AUDIT_VIEW_ALL],
    gradient: 'from-gendarme-dark to-gendarme-dark-light',
    bgColor: 'bg-gendarme-dark/10',
    hoverBg: 'hover:bg-gendarme-dark/20',
    iconColor: 'text-gendarme-dark',
    description: 'Consultation des actions (lecture seule)',
    readOnly: true,
  },
]

/**
 * Filtre les éléments du menu selon les permissions de l'utilisateur
 * @param {Array} permissions - Liste des permissions de l'utilisateur
 * @returns {Array} - Menu items filtrés
 */
export const getFilteredMenuItems = (permissions) => {
  if (!permissions || !Array.isArray(permissions)) {
    return []
  }
  
  // Si l'utilisateur a tous les droits (permission '*'), afficher tous les éléments
  if (permissions.includes('*')) {
    return MENU_ITEMS
  }
  
  return MENU_ITEMS.filter(item => {
    // Si pas de permission requise, l'élément est toujours visible
    if (!item.permission) return true
    
    // Vérifier si l'utilisateur a la permission principale
    const hasMainPermission = permissions.includes(item.permission)
    
    // Vérifier si l'utilisateur a une des permissions alternatives
    let hasAlternative = false
    if (item.alternativePermissions && Array.isArray(item.alternativePermissions)) {
      hasAlternative = item.alternativePermissions.some(perm => {
        const found = permissions.includes(perm)
        // Debug spécifique pour le journal d'audit
        if (item.id === 'audit') {
          console.log('[MenuItems] Audit - Vérification permission alternative:', perm, 'trouvée:', found)
        }
        return found
      })
    }
    
    const isVisible = hasMainPermission || hasAlternative
    
    // Debug pour le journal d'audit
    if (item.id === 'audit') {
      console.log('[MenuItems] Journal d\'audit - Permission principale:', item.permission, 'trouvée:', hasMainPermission)
      console.log('[MenuItems] Journal d\'audit - Permissions alternatives:', item.alternativePermissions)
      console.log('[MenuItems] Journal d\'audit - Alternative trouvée:', hasAlternative)
      console.log('[MenuItems] Journal d\'audit - Visible:', isVisible)
      console.log('[MenuItems] Journal d\'audit - Permissions utilisateur:', permissions)
    }
    
    return isVisible
  })
}

/**
 * Vérifie si un utilisateur peut voir un sous-menu
 * @param {Object} subAction - Action du sous-menu
 * @param {Array} permissions - Permissions de l'utilisateur
 * @returns {boolean}
 */
export const canSeeSubAction = (subAction, permissions) => {
  if (!subAction.permission) return true
  
  // Si l'utilisateur a tous les droits (permission '*'), autoriser tout
  if (permissions && permissions.includes('*')) {
    return true
  }
  
  return permissions && permissions.includes(subAction.permission)
}

export default MENU_ITEMS

