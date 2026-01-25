import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  ArrowLeft, Edit, Key, Users, CheckCircle, Activity, ShieldCheck
} from 'lucide-react'
import { fetchRoleById } from '../services/authService'
import { useNotification } from '../context/NotificationContext'

const VoirRole = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const notification = useNotification()
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState({
    nom: '',
    code: '',
    description: '',
    nombreUtilisateurs: 0,
    nombrePermissions: 0,
    estActif: true,
    permissions: []
  })

  // Charger les données du rôle
  useEffect(() => {
    const chargerRole = async () => {
      try {
        setLoading(true)
        // L'ID dans l'URL peut être un ID numérique ou un nom de rôle (déjà encodé)
        const roleId = decodeURIComponent(id)
        const roleData = await fetchRoleById(roleId)
        
        // Le nouveau système retourne directement l'objet rôle
        // Format: { id, name, description, is_active, permissions: [{ id, code, label, category }], ... }
        const roleInfo = roleData.role || roleData
        
        console.log('📥 Données reçues du backend:', roleInfo)
        console.log('📥 Permissions reçues:', roleInfo.permissions)
        
        // Formater les permissions - peut être un tableau d'objets ou de chaînes
        const formattedPermissions = (roleInfo.permissions || []).map(perm => {
          // Si c'est déjà un objet avec id, code, label, category
          if (typeof perm === 'object' && perm !== null) {
            return {
              id: perm.id || perm.code || '',
              code: perm.code || perm.id || '',
              label: perm.label || perm.code?.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '',
              category: perm.category || ''
            }
          }
          // Si c'est une chaîne (ancien format)
          if (typeof perm === 'string') {
            return {
              id: perm,
              code: perm,
              label: perm.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              category: ''
            }
          }
          // Si c'est un nombre (juste un ID)
          if (typeof perm === 'number') {
            return {
              id: perm,
              code: String(perm),
              label: String(perm),
              category: ''
            }
          }
          // Fallback
          return {
            id: String(perm),
            code: String(perm),
            label: String(perm),
            category: ''
          }
        })

        // Compter les utilisateurs avec ce rôle
        // Le backend peut retourner users_count dans roleData ou roleInfo
        const usersCount = roleInfo.users_count || roleData.users_count || roleInfo.nombre_utilisateurs || 0

        setRole({
          nom: roleInfo.name || roleInfo.nom || roleId || '',
          code: roleInfo.code || roleInfo.name?.toUpperCase()?.replace(/ /g, '_') || roleId?.toUpperCase()?.replace(/ /g, '_') || '',
          description: roleInfo.description || '',
          nombreUtilisateurs: usersCount,
          nombrePermissions: formattedPermissions.length,
          estActif: roleInfo.is_active !== undefined ? roleInfo.is_active : (roleInfo.estActif !== undefined ? roleInfo.estActif : true),
          permissions: formattedPermissions
        })
        
        console.log('✅ Rôle chargé avec succès:', {
          nom: roleInfo.name || roleInfo.nom,
          permissions: formattedPermissions.length,
          usersCount
        })
      } catch (error) {
        console.error('Erreur lors du chargement du rôle:', error)
        notification.showError('Impossible de charger les données du rôle')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      chargerRole()
    }
  }, [id, notification])

  // Grouper les permissions par catégorie
  const categoriesPermissions = role.permissions.reduce((acc, perm) => {
    let categorie = 'Autres'
    
    // Utiliser la catégorie de l'objet permission si disponible
    if (perm.category) {
      categorie = perm.category
    } else if (perm.categorie) {
      // Format alternatif
      categorie = perm.categorie
    } else if (perm.code || perm.id) {
      // Extraire la catégorie depuis le code/id
      const codeStr = String(perm.code || perm.id)
      const prefix = codeStr.split('.')[0]
      const categorieMap = {
        'fiches': 'Fiches',
        'utilisateurs': 'Utilisateurs',
        'users': 'Utilisateurs',
        'roles': 'Rôles',
        'biometrie': 'Biométrie',
        'ia': 'Intelligence Artificielle',
        'rapports': 'Rapports',
        'reports': 'Rapports',
        'audit': 'Audit',
        'dashboard': 'Tableau de bord',
        'investigations': 'Enquêtes',
        'suspects': 'Suspects',
        'evidence': 'Preuves',
        'analytics': 'Analyses',
        'notifications': 'Notifications'
      }
      categorie = categorieMap[prefix] || 'Autres'
    }
    
    if (!acc[categorie]) {
      acc[categorie] = []
    }
    acc[categorie].push(perm)
    return acc
  }, {})

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données du rôle...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec gradient moderne */}
      <div className="rounded-2xl p-6 shadow-xl" style={{ background: 'linear-gradient(to right, #185CD6, #1348A8)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/roles')}
              className="p-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-colors border border-white/20"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{role.nom}</h1>
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-mono rounded-lg mt-2 border border-white/30">
                {role.code}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold ${
              role.estActif 
                ? 'text-white shadow-lg' 
                : 'bg-white/20 backdrop-blur-sm text-white border border-white/30'
            }`}
            style={role.estActif ? { backgroundColor: '#10b981' } : {}}>
              <span className={`w-2 h-2 rounded-full mr-2 ${role.estActif ? 'bg-white' : 'bg-gray-400'}`}></span>
              {role.estActif ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>
      </div>

      {/* Statistiques Rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#185CD6' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Utilisateurs Assignés</p>
              <p className="text-3xl font-bold text-gray-900">{role.nombreUtilisateurs}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#185CD61A' }}>
              <Users size={28} style={{ color: '#185CD6' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#185CD6' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Permissions Totales</p>
              <p className="text-3xl font-bold text-gray-900">{role.nombrePermissions}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#185CD61A' }}>
              <Key size={28} style={{ color: '#185CD6' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: '#185CD6' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Catégories</p>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(categoriesPermissions).length}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#185CD61A' }}>
              <ShieldCheck size={28} style={{ color: '#185CD6' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card-pro p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <ShieldCheck className="mr-2" style={{ color: '#185CD6' }} size={24} />
              Description du rôle
            </h2>
            <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">
              {role.description}
            </p>
          </div>

          {/* Permissions */}
          <div className="card-pro p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Key className="mr-2" style={{ color: '#185CD6' }} size={24} />
              Permissions ({role.permissions.length})
            </h2>
            <div className="space-y-4">
              {Object.entries(categoriesPermissions).map(([categorie, perms]) => (
                <div key={categorie} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <h3 className="font-bold text-gray-900 mb-3">{categorie}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {perms.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center space-x-2 p-2 bg-white rounded-lg"
                      >
                        <CheckCircle style={{ color: '#185CD6' }} size={18} />
                        <span className="text-sm text-gray-700">{permission.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Informations du rôle */}
          <div className="card-pro p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <Activity className="mr-2 text-gray-600" size={20} />
              Informations
            </h3>
            <div className="space-y-4">
              <div className="pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Code du rôle</p>
                <p className="font-bold text-gray-900">{role.code}</p>
              </div>
              <div className="pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Utilisateurs assignés</p>
                <p className="font-bold text-gray-900">{role.nombreUtilisateurs}</p>
              </div>
              <div className="pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Permissions totales</p>
                <p className="font-bold text-gray-900">{role.nombrePermissions}</p>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="card-pro p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <Activity className="mr-2 text-gray-600" size={20} />
              Actions Rapides
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Utiliser le nom du rôle encodé dans l'URL
                  const roleName = encodeURIComponent(role.nom || role.code || id)
                  navigate(`/roles/modifier/${roleName}`)
                }}
                className="w-full px-4 py-3 text-white rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 shadow-lg"
                style={{ background: 'linear-gradient(to right, #185CD6, #1348A8)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #1348A8, #0f3a7f)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #185CD6, #1348A8)'}
              >
                <Edit size={18} />
                <span>Modifier le rôle</span>
              </button>
              <button
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 transition-colors flex items-center justify-center space-x-2"
                onClick={() => navigate('/utilisateurs')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#185CD6';
                  e.currentTarget.style.backgroundColor = '#185CD60D';
                  e.currentTarget.style.color = '#185CD6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = '#374151';
                }}
              >
                <Users size={18} />
                <span>Voir les utilisateurs</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoirRole

