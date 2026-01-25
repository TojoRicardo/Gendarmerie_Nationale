import React, { lazy } from 'react'
import { Navigate } from 'react-router-dom'

// Lazy loading des pages
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Connexion = lazy(() => import('../pages/Connexion'))
const Register = lazy(() => import('../pages/Register'))
const Inscription = lazy(() => import('../pages/Inscription'))
const PhotoBiometrique = lazy(() => import('../pages/PhotoBiometrique'))
const BiometrieCriminelle = lazy(() => import('../pages/BiometrieCriminelle'))
const AjouterPhotoCriminelle = lazy(() => import('../pages/AjouterPhotoCriminelle'))
const IntelligenceArtificielle = lazy(() => import('../pages/IntelligenceArtificielle'))
const Profil = lazy(() => import('../pages/Profil'))

// Nouvelles pages SGIC
const Assignments = lazy(() => import('../pages/Assignments'))
const RegisterSuspect = lazy(() => import('../pages/RegisterSuspect'))
const EvidenceManagement = lazy(() => import('../pages/EvidenceManagement'))
const Analytics = lazy(() => import('../pages/Analytics'))
const CloseCase = lazy(() => import('../pages/CloseCase'))
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

// Rôles (nouveau système)
const GestionRoles = lazy(() => import('../pages/GestionRoles'))
const CreerRoleNouveau = lazy(() => import('../pages/CreerRoleNouveau'))
const ModifierRoleNouveau = lazy(() => import('../pages/ModifierRoleNouveau'))
const AssignerRoleUtilisateur = lazy(() => import('../pages/AssignerRoleUtilisateur'))

// Lazy loading des composants
const ListeNotifications = lazy(() => import('../../components/notifications/ListeNotifications'))
const ParametresNotifications = lazy(() => import('../../components/notifications/ParametresNotifications'))
const Rapports = lazy(() => import('../pages/Rapports'))
const ReportGeneratorPage = lazy(() => import('../pages/ReportGeneratorPage'))
const TableauAudit = lazy(() => import('../../components/audit/TableauAudit'))
const FiltreAudit = lazy(() => import('../../components/audit/FiltreAudit'))
const OllamaManager = lazy(() => import('../../components/audit/OllamaManager'))
const HistoriqueActivite = lazy(() => import('../pages/HistoriqueActivite'))

// Dashboards spécialisés
const DashboardAnalyste = lazy(() => import('../pages/dashboards/DashboardAnalyste'))

// UPR - Unidentified Person Registry
const UPRList = lazy(() => import('../pages/UPRList'))
const UPRDetail = lazy(() => import('../pages/UPRDetail'))
const MultiCameraDashboard = lazy(() => import('../components/cameras/MultiCameraDashboard'))

/**
 * Composant spécial pour la page Audit
 * (nécessite état local pour les filtres)
 */
const AuditPage = React.memo(function AuditPage() {
  const [filtresAudit, setFiltresAudit] = React.useState({}) // Par défaut, aucun filtre = afficher tout
  const [showOllamaManager, setShowOllamaManager] = React.useState(false)

  // Charger tous les journaux au montage (sans filtres)
  React.useEffect(() => {
    // Les journaux seront chargés automatiquement par TableauAudit avec filtres vides
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Section Filtres */}
        <div className="bg-white rounded-xl shadow-sm">
          <FiltreAudit
            onFiltrer={setFiltresAudit}
            onReinitialiser={() => {
              setFiltresAudit({}) // Réinitialiser à vide = afficher tout
            }}
            onToggleOllama={() => setShowOllamaManager(!showOllamaManager)}
          />
        </div>

        {/* Gestionnaire Ollama */}
        {showOllamaManager && (
          <div className="bg-white rounded-xl shadow-sm">
            <OllamaManager />
          </div>
        )}

        {/* Section Journal d'Audit */}
        <div className="bg-white rounded-xl shadow-sm">
          <TableauAudit filtres={filtresAudit} />
        </div>
      </div>
    </div>
  )
})

export const routesConfig = [
  // Routes publiques
  {
    path: '/connexion',
    element: <Connexion />,
    isProtected: false,
    meta: {
      title: 'Connexion - SGIC',
      description: 'Page de connexion au système',
    },
  },
  {
    path: '/inscription',
    element: <Inscription />,
    isProtected: false,
    meta: {
      title: 'Inscription - SGIC',
      description: 'Page d\'inscription au système',
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
      // Rôles (nouveau système complet)
      {
        path: 'gestion-roles',
        element: <GestionRoles />,
        requiredPermission: 'roles.consulter',
        meta: {
          title: 'Gestion des Rôles - SGIC',
        },
      },
      {
        path: 'gestion-roles/creer',
        element: <CreerRoleNouveau />,
        requiredPermission: 'roles.gerer',
        meta: {
          title: 'Créer un rôle - SGIC',
        },
      },
      {
        path: 'gestion-roles/modifier/:id',
        element: <ModifierRoleNouveau />,
        requiredPermission: 'roles.gerer',
        meta: {
          title: 'Modifier un rôle - SGIC',
        },
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
        path: 'photos-biometriques',
        element: <PhotoBiometrique />,
        requiredPermission: 'biometrie.view',
        meta: {
          title: 'Photos Biométriques - SGIC',
          description: 'Gestion des photos d\'identification criminelle',
        },
      },
      {
        path: 'biometrie-criminelle',
        element: <BiometrieCriminelle />,
        requiredPermission: 'biometrie.view',
        meta: {
          title: 'Biométrie Criminelle - SGIC',
          description: 'Système professionnel Interpol/AFIS pour empreintes et photos',
        },
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
        path: 'register-suspect',
        element: <RegisterSuspect />,
        requiredPermission: 'suspects.create',
        meta: {
          title: 'Enregistrer un suspect - SGIC',
        },
      },
      {
        path: 'evidence-management',
        element: <EvidenceManagement />,
        requiredPermission: 'evidence.manage',
        meta: {
          title: 'Gestion des preuves - SGIC',
        },
      },
      {
        path: 'analytics',
        element: <Analytics />,
        requiredPermission: 'analytics.view',
        meta: {
          title: 'Analyses statistiques - SGIC',
        },
      },
      {
        path: 'close-case/:uuid',
        element: <CloseCase />,
        requiredPermission: 'investigations.close',
        meta: {
          title: 'Clôturer une enquête - SGIC',
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

