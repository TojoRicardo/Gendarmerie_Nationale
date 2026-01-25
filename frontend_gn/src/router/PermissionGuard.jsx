import { Navigate } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { AlertTriangle, ShieldOff } from 'lucide-react'

/**
 * PermissionGuard - Composant de garde pour vérifier les permissions
 * 
 * Vérifie si l'utilisateur a la permission requise avant d'afficher le contenu.
 * Si l'utilisateur n'a pas la permission, affiche un message d'accès refusé.
 * 
 * @param {string|string[]} requiredPermission - Permission requise (ex: 'users.view') ou tableau de permissions alternatives
 * @param {React.ReactNode} children - Contenu à afficher si autorisé
 * @param {boolean} redirectToDashboard - Rediriger vers dashboard au lieu d'afficher un message (défaut: false)
 */
const PermissionGuard = ({ 
  requiredPermission, 
  children, 
  redirectToDashboard = false 
}) => {
  const { hasPermission: checkPermission, hasAnyPermission } = usePermissions()

  // Vérifier si l'utilisateur a la permission
  let hasPermission = true
  
  if (requiredPermission) {
    if (Array.isArray(requiredPermission)) {
      // Si c'est un tableau, vérifier si l'utilisateur a au moins une des permissions
      hasPermission = hasAnyPermission(requiredPermission)
    } else {
      // Si c'est une seule permission, vérifier normalement
      hasPermission = checkPermission(requiredPermission)
    }
  }

  if (!hasPermission) {
    // Option 1 : Rediriger vers le dashboard
    if (redirectToDashboard) {
      return <Navigate to="/dashboard" replace />
    }

    // Option 2 : Afficher un message d'accès refusé
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-6">
        <div className="max-w-2xl w-full">
          {/* Carte d'accès refusé */}
          <div className="bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
            {/* Header avec icône */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
                <ShieldOff size={40} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Accès Refusé
              </h1>
              <p className="text-red-50 text-lg">
                Vous n'avez pas l'autorisation d'accéder à cette page
              </p>
            </div>

            {/* Contenu */}
            <div className="p-8 space-y-6">
              {/* Message détaillé */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">
                      Permission insuffisante
                    </h3>
                    <p className="text-red-700 text-sm leading-relaxed">
                      Cette section nécessite des permissions spécifiques que votre compte ne possède pas actuellement.
                      Si vous pensez qu'il s'agit d'une erreur, veuillez contacter votre administrateur système.
                    </p>
                    <div className="mt-3 text-xs text-red-600 font-mono bg-red-100 px-3 py-2 rounded">
                      Permission requise : <strong>{requiredPermission}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations supplémentaires */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Que faire maintenant ?
                </h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Retournez au tableau de bord et vérifiez votre niveau d'accès</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Contactez un administrateur pour demander les permissions nécessaires</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Consultez la documentation sur les rôles et permissions</span>
                  </li>
                </ul>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => window.history.back()}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Retour</span>
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-gendarme-blue to-gendarme-blue-light hover:shadow-lg text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Tableau de bord</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-sm text-gray-500">
            <p>Gendarmerie Nationale - Système de Gestion des Informations Criminelles</p>
          </div>
        </div>
      </div>
    )
  }

  // L'utilisateur a la permission, afficher le contenu
  return children
}

export default PermissionGuard

