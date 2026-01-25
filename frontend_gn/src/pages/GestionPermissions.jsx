import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import usePermissions from '../hooks/usePermissions'
import EnqueteursConnectes from '../../components/utilisateurs/EnqueteursConnectes'
import { getPermissionsAndRoles, getActiveUsersByRole } from '../services/sessionService'
import { 
  FaUsers, 
  FaCheckCircle, 
  FaTimesCircle,
  FaChartBar
} from 'react-icons/fa'
import { KeyRound, ShieldCheck } from 'lucide-react'

/**
 * Page de gestion et visualisation des permissions
 */
const GestionPermissions = () => {
  const { utilisateur } = useAuth()
  const { permissions, hasPermission, isEnqueteurPrincipal, isAdmin } = usePermissions()
  const [systemData, setSystemData] = useState(null)
  const [activeByRole, setActiveByRole] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [permData, activeData] = await Promise.all([
        getPermissionsAndRoles(),
        getActiveUsersByRole()
      ])
      setSystemData(permData)
      setActiveByRole(activeData)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalActiveUsers = Object.values(activeByRole).reduce(
    (sum, role) => sum + (role.count || 0), 
    0
  )

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestion des Permissions</h1>
            <p className="text-blue-100">
              Système de contrôle d'accès et surveillance des utilisateurs
            </p>
          </div>
          <KeyRound className="text-6xl opacity-20" />
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Utilisateurs en ligne</p>
              <p className="text-3xl font-bold text-gray-900">{totalActiveUsers}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <FaUsers className="text-2xl text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Rôles disponibles</p>
              <p className="text-3xl font-bold text-gray-900">
                {systemData?.roles ? Object.keys(systemData.roles).length : 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShieldCheck className="text-2xl text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Mes permissions</p>
              <p className="text-3xl font-bold text-gray-900">{permissions.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <KeyRound className="text-2xl text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Mon rôle</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {utilisateur?.role || 'Non défini'}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <FaChartBar className="text-2xl text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Enquêteurs Principaux connectés */}
      {(isEnqueteurPrincipal || isAdmin) && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Enquêteurs Principaux en ligne
          </h2>
          <EnqueteursConnectes />
        </div>
      )}

      {/* Utilisateurs actifs par rôle */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Utilisateurs actifs par rôle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(activeByRole).map(([roleName, roleData]) => (
            <div
              key={roleName}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{roleName}</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {roleData.count}
                </span>
              </div>
              {roleData.users && roleData.users.length > 0 ? (
                <div className="space-y-2">
                  {roleData.users.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center space-x-2 text-sm"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">
                        {user.prenom && user.nom
                          ? `${user.prenom} ${user.nom}`
                          : user.username}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Aucun utilisateur actif</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mes permissions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mes Permissions</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemData?.permissions &&
              Object.entries(systemData.permissions).map(([code, description]) => {
                const hasIt = hasPermission(code)
                return (
                  <div
                    key={code}
                    className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all ${
                      hasIt
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {hasIt ? (
                      <FaCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
                    ) : (
                      <FaTimesCircle className="text-gray-400 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-mono font-medium ${
                          hasIt ? 'text-green-900' : 'text-gray-500'
                        }`}
                      >
                        {code}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{description}</p>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Informations sur les rôles */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Rôles et Permissions du Système
        </h2>
        <div className="space-y-4">
          {systemData?.roles &&
            Object.entries(systemData.roles).map(([roleName, roleInfo]) => (
              <div
                key={roleName}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div
                  className={`p-6 ${
                    utilisateur?.role === roleName
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{roleName}</h3>
                    {utilisateur?.role === roleName && (
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-medium">
                        Votre rôle
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{roleInfo.description}</p>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Permissions ({roleInfo.permissions?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {roleInfo.permissions?.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default GestionPermissions

