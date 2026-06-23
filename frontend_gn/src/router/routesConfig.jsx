import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import RoleModifierRedirect from './RoleModifierRedirect'
import AuditPage from './AuditPage'

// Lazy loading des pages
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Login = lazy(() => import('../auth/Login'))
const Register = lazy(() => import('../pages/Register'))
const BiometrieCriminelle = lazy(() => import('../pages/BiometrieCriminelle'))
const AjouterPhotoCriminelle = lazy(() => import('../pages/AjouterPhotoCriminelle'))
const IntelligenceArtificielle = lazy(() => import('../pages/IntelligenceArtificielle'))
const Profil = lazy(() => import('../pages/Profil'))

// Nouvelles pages SGIC
const Assignments = lazy(() => import('../pages/Assignments'))
const EnqueteDashboard = lazy(() => import('../pages/EnqueteDashboard'))
const EnqueteList = lazy(() => import('../pages/EnqueteList'))
const CreerEnquete = lazy(() => import('../pages/CreerEnquete'))
const VersementDossierEnquete = lazy(() => import('../pages/VersementDossierEnquete'))
const AjouterPreuve = lazy(() => import('../pages/AjouterPreuve'))
const AjouterRapport = lazy(() => import('../pages/AjouterRapport'))
const AjouterObservation = lazy(() => import('../pages/AjouterObservation'))
const MiseAJourAvancement = lazy(() => import('../pages/MiseAJourAvancement'))

// Fiches Criminelles
const FichesCriminelles = lazy(() => import('../pages/FichesCriminelles'))
const CreerFicheCriminelle = lazy(() => import('../pages/CreerFicheCriminelle'))
const VoirFicheCriminelle = lazy(() => import('../pages/VoirFicheCriminelle'))
const ModifierFicheCriminelle = lazy(() => import('../pages/ModifierFicheCriminelle'))

// Utilisateurs
const Utilisateurs = lazy(() => import('../pages/Utilisateurs'))
const CreerUtilisateur = lazy(() => import('../pages/CreerUtilisateur'))
const VoirUtilisateur = lazy(() => import('../pages/VoirUtilisateur'))
const ModifierUtilisateur = lazy(() => import('../pages/ModifierUtilisateur'))

// Rôles (ancien système - compatibilité)
const Roles = lazy(() => import('../pages/Roles'))
const CreerRole = lazy(() => import('../pages/CreerRole'))
const VoirRole = lazy(() => import('../pages/VoirRole'))
const ModifierRole = lazy(() => import('../pages/ModifierRole'))

const AssignerRoleUtilisateur = lazy(() => import('../pages/AssignerRoleUtilisateur'))

// Lazy loading des composants
const ListeNotifications = lazy(() => import('../../components/notifications/ListeNotifications'))
const ParametresNotifications = lazy(() => import('../../components/notifications/ParametresNotifications'))
const Rapports = lazy(() => import('../pages/Rapports'))
const HistoriqueActivite = lazy(() => import('../pages/HistoriqueActivite'))

// Dashboards spécialisés
const DashboardAnalyste = lazy(() => import('../pages/dashboards/DashboardAnalyste'))

// UPR - Unidentified Person Registry
const UPRList = lazy(() => import('../pages/UPRList'))
const UPRDetail = lazy(() => import('../pages/UPRDetail'))
const MultiCameraDashboard = lazy(() => import('../components/cameras/MultiCameraDashboard'))

export const routesConfig = [
  // Routes publiques
  {
    path: '/connexion',
    element: <Login />,
    isProtected: false,
    meta: {
      title: 'Connexion - SGIC',
      description: 'Page de connexion au système',
    },
  },
  {
    path: '/inscription',
    element: <Navigate to="/register" replace />,
    isProtected: false,
    meta: {
      title: 'Inscription - SGIC',
    },
  },
  {
    path: '/register',
    element: <Register />,
    isProtected: false,
    meta: {
      title: 'Inscription - SGIC',
      description: 'Page d\'inscription au système',
    },
  },

  // Routes protégées
  {
    path: '/',
    isProtected: true,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
        meta: {
          title: 'Tableau de bord - SGIC',
          description: 'Tableau de bord principal',
        },
      },

      // Utilisateurs
      {
        path: 'utilisateurs',
        element: <Utilisateurs />,
        requiredPermission: 'users.view',
        meta: {
          title: 'Utilisateurs - SGIC',
          description: 'Gestion des utilisateurs',
        },
      },
      {
        path: 'utilisateurs/creer',
        element: <CreerUtilisateur />,
        requiredPermission: 'users.create',
        meta: {
          title: 'Créer un utilisateur - SGIC',
        },
      },
      {
        path: 'utilisateurs/voir/:id',
        element: <VoirUtilisateur />,
        requiredPermission: 'users.view',
        meta: {
          title: 'Détails utilisateur - SGIC',
        },
      },
      {
        path: 'utilisateurs/modifier/:id',
        element: <ModifierUtilisateur />,
        requiredPermission: 'users.edit',
        meta: {
          title: 'Modifier utilisateur - SGIC',
        },
      },

      // Rôles (ancien système - compatibilité)
      {
        path: 'roles',
        element: <Roles />,
        requiredPermission: 'roles.consulter',
        meta: {
          title: 'Rôles & Permissions - SGIC',
        },
      },
      {
        path: 'roles/creer',
        element: <CreerRole />,
        requiredPermission: 'roles.gerer',
        meta: {
          title: 'Créer un rôle - SGIC',
        },
      },
      {
        path: 'roles/voir/:id',
        element: <VoirRole />,
        requiredPermission: 'roles.consulter',
        meta: {
          title: 'Détails du rôle - SGIC',
        },
      },
      {
        path: 'roles/modifier/:id',
        element: <ModifierRole />,
        requiredPermission: 'roles.gerer',
        meta: {
          title: 'Modifier un rôle - SGIC',
        },
      },
      // Alias gestion-roles → pages rôles existantes
      {
        path: 'gestion-roles',
        element: <Navigate to="/roles" replace />,
      },
      {
        path: 'gestion-roles/creer',
        element: <Navigate to="/roles/creer" replace />,
      },
      {
        path: 'gestion-roles/modifier/:id',
        element: <RoleModifierRedirect />,
      },
      {
        path: 'photos-biometriques',
        element: <Navigate to="/biometrie" replace />,
      },
      {
        path: 'assigner-role-utilisateur',
        element: <AssignerRoleUtilisateur />,
        requiredPermission: 'utilisateurs.modifier',
        meta: {
          title: 'Assigner Rôle et Permissions - SGIC',
        },
      },

      // Fiches criminelles
      {
        path: 'fiches-criminelles',
        element: <FichesCriminelles />,
        requiredPermission: 'fiches.view',
        meta: {
          title: 'Fiches Criminelles - SGIC',
        },
      },
      {
        path: 'fiches-criminelles/creer',
        element: <CreerFicheCriminelle />,
        requiredPermission: 'fiches.create',
        meta: {
          title: 'Créer une fiche - SGIC',
        },
      },
      {
        path: 'fiches-criminelles/voir/:id',
        element: <VoirFicheCriminelle />,
        requiredPermission: 'fiches.view',
        meta: {
          title: 'Détails de la fiche - SGIC',
        },
      },
      {
        path: 'fiches-criminelles/modifier/:id',
        element: <ModifierFicheCriminelle />,
        requiredPermission: 'fiches.edit',
        meta: {
          title: 'Modifier une fiche - SGIC',
        },
      },

      // Biométrie
      {
        path: 'biometrie',
        element: <BiometrieCriminelle />,
        requiredPermission: 'biometrie.view',
        meta: {
          title: 'Biométrie Criminelle - SGIC',
          description: 'Système professionnel de gestion biométrique complète',
        },
      },
      {
        path: 'biometrie-criminelle',
        element: <Navigate to="/biometrie" replace />,
      },
      {
        path: 'ajouter-photo-criminelle',
        element: <AjouterPhotoCriminelle />,
        requiredPermission: 'biometrie.create',
        meta: {
          title: 'Ajouter une photo criminelle - SGIC',
          description: 'Upload de photos biométriques pour identification faciale',
        },
      },

      // Intelligence Artificielle
      {
        path: 'ia',
        element: <IntelligenceArtificielle />,
        requiredPermission: 'ia.view_results',
        meta: {
          title: 'Intelligence Artificielle - SGIC',
        },
      },
      {
        path: 'ia/:ficheId',
        element: <IntelligenceArtificielle />,
        requiredPermission: 'ia.view_results',
        meta: {
          title: 'Analyse Prédictive - SGIC',
          description: 'Analyse prédictive d\'un dossier criminel',
        },
      },

      // Notifications
      {
        path: 'notifications',
        element: <ListeNotifications />,
        meta: {
          title: 'Notifications - SGIC',
        },
      },
      {
        path: 'notifications/parametres',
        element: <ParametresNotifications />,
        meta: {
          title: 'Paramètres notifications - SGIC',
        },
      },

      // Profil
      {
        path: 'profil',
        element: <Profil />,
        meta: {
          title: 'Mon Profil - SGIC',
        },
      },

      // Rapports
      {
        path: 'rapports',
        element: <Rapports />,
        requiredPermission: 'reports.view',
        meta: {
          title: 'Rapports - SGIC',
        },
      },
      {
        path: 'rapports/generer',
        element: <Navigate to="/rapports?tab=generation" replace />,
        requiredPermission: 'reports.generate',
        meta: {
          title: 'Générer un rapport - SGIC',
          description: 'Génération de rapports professionnels personnalisés',
        },
      },
      {
        path: 'rapports/dashboard',
        element: <DashboardAnalyste />,
        requiredPermission: 'reports.view',
        meta: {
          title: 'Dashboard Analyste - SGIC',
          description: 'Tableau de bord spécialisé pour les analystes',
        },
      },

      // Audit - Route personnalisée avec composants multiples
      {
        path: 'audit',
        element: <AuditPage />,
        requiredPermission: ['audit.view', 'audit.view_own', 'audit.view_all'], // Permissions alternatives
        meta: {
          title: 'Journal d\'Audit - SGIC',
        },
      },
      
      // Historique / Journal d'activité - Page dédiée
      {
        path: 'historique',
        element: <HistoriqueActivite />,
        requiredPermission: ['audit.view', 'audit.view_own', 'audit.view_all'],
        meta: {
          title: 'Historique / Journal d\'activité - SGIC',
          description: 'Consultation de l\'historique complet des actions utilisateur',
        },
      },

      // Nouvelles routes SGIC
      {
        path: 'assignations',
        element: <Assignments />,
        requiredPermission: 'investigations.view',
        meta: {
          title: 'Assignations d’enquêtes - SGIC',
          description: 'Suivi des missions et affectations des enquêteurs',
        },
      },
      {
        path: 'enquete',
        element: <EnqueteDashboard />,
        requiredPermission: 'investigations.view',
        meta: {
          title: 'Module Enquête - SGIC',
        },
      },
      {
        path: 'enquetes',
        element: <EnqueteList />,
        requiredPermission: 'investigations.view',
        meta: {
          title: 'Liste des enquêtes - SGIC',
        },
      },
      {
        path: 'enquetes/create',
        element: <CreerEnquete />,
        requiredPermission: 'investigations.create',
        meta: {
          title: 'Créer une enquête - SGIC',
        },
      },
      {
        path: 'enquetes/versement',
        element: <VersementDossierEnquete />,
        requiredPermission: 'investigations.create',
        meta: {
          title: "Versement dossier d'enquête - SGIC",
        },
      },
      {
        path: 'enquete/preuves/ajouter',
        element: <AjouterPreuve />,
        requiredPermission: 'investigations.create',
        meta: {
          title: 'Ajouter une preuve - SGIC',
        },
      },
      {
        path: 'enquete/rapports/ajouter',
        element: <AjouterRapport />,
        requiredPermission: 'investigations.create',
        meta: {
          title: 'Ajouter un rapport - SGIC',
        },
      },
      {
        path: 'enquete/observations/ajouter',
        element: <AjouterObservation />,
        requiredPermission: 'investigations.view',
        meta: {
          title: 'Ajouter une observation - SGIC',
        },
      },
      {
        path: 'enquete/avancement',
        element: <MiseAJourAvancement />,
        requiredPermission: 'investigations.edit',
        meta: {
          title: "Mettre à jour l'avancement - SGIC",
        },
      },

      // UPR - Unidentified Person Registry
      {
        path: 'upr',
        element: <UPRList />,
        requiredPermission: 'biometrie.view',
        meta: {
          title: 'Unidentified Person Registry - SGIC',
          description: 'Registre des personnes non identifiées',
        },
      },
      {
        path: 'upr/:id',
        element: <UPRDetail />,
        requiredPermission: 'biometrie.view',
        meta: {
          title: 'Détails UPR - SGIC',
        },
      },

      // Multi-Caméras
      {
        path: 'cameras',
        element: <MultiCameraDashboard />,
        requiredPermission: 'biometrie.view',
        meta: {
          title: 'Multi-Caméras - SGIC',
          description: 'Surveillance multi-caméras avec reconnaissance faciale',
        },
      },

    ],
  },

  // Route 404
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
    meta: {
      title: 'Page non trouvée - SGIC',
    },
  },
]

// Export par défaut pour la configuration des routes
export default routesConfig

