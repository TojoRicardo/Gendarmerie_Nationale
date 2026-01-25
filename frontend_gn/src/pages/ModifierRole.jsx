import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  Save, X, Key, ArrowLeft, CheckSquare, ShieldCheck
} from 'lucide-react'
import { MESSAGES } from '../utils/notifications'
import { useNotification } from '../context/NotificationContext'
import { updateRole, getRoleById } from '../services/authService'

const ModifierRole = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const notification = useNotification()
  const [loading, setLoading] = useState(true)

  // État initial vide, sera rempli avec les données de l'API
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    description: '',
    estActif: true,
    permissions: []
  })

  // Charger les données du rôle au montage du composant
  useEffect(() => {
    const chargerRole = async () => {
      try {
        setLoading(true)
        // L'ID dans l'URL est maintenant le nom du rôle (déjà encodé)
        // Décoder d'abord, puis getRoleById va ré-encoder si nécessaire
        const roleName = decodeURIComponent(id || '')
        
        // Si c'est encore un ID numérique, essayer de le convertir
        if (roleName && !isNaN(roleName) && roleName.length <= 2) {
          // Mapping des IDs numériques vers les noms de rôles (temporaire pour compatibilité)
          const numericRoleMap = {
            '1': 'Administrateur Système',
            '2': 'Enquêteur Principal',
            '3': 'Analyste',
            '4': 'Observateur'
          }
          const mappedRoleName = numericRoleMap[roleName]
          if (mappedRoleName) {
            console.warn(`Conversion ID numérique ${roleName} vers nom de rôle: ${mappedRoleName}`)
            const roleData = await getRoleById(mappedRoleName)
            const roleInfo = roleData.role || roleData
            setFormData({
              nom: roleInfo.nom || roleInfo.name || mappedRoleName || '',
              code: roleInfo.code || roleInfo.name?.toUpperCase() || mappedRoleName?.toUpperCase() || '',
              description: roleInfo.description || '',
              estActif: roleInfo.estActif !== undefined ? roleInfo.estActif : true,
              permissions: roleInfo.permissions || []
            })
            return
          }
        }
        
        const roleData = await getRoleById(roleName)
        
        // Mapper les données du rôle depuis l'API vers le formulaire
        // L'API peut retourner soit role.nom/code, soit directement nom/code
        const roleInfo = roleData.role || roleData
        
        setFormData({
          nom: roleInfo.nom || roleInfo.name || roleName || '',
          code: roleInfo.code || roleInfo.name?.toUpperCase() || roleName?.toUpperCase() || '',
          description: roleInfo.description || '',
          estActif: roleInfo.estActif !== undefined ? roleInfo.estActif : true,
          permissions: roleInfo.permissions || []
        })
      } catch (error) {
        console.error('Erreur lors du chargement du rôle:', error)
        notification.showError('Impossible de charger les données du rôle')
        // En cas d'erreur, utiliser le nom du rôle décodé comme valeur par défaut
        const roleName = decodeURIComponent(id || '')
        setFormData(prev => ({
          ...prev,
          nom: roleName || '',
          code: roleName?.toUpperCase() || ''
        }))
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      chargerRole()
    }
  }, [id, notification])

  // Liste des permissions disponibles
  const permissionsDisponibles = [
    { id: 'fiches.view', label: 'Consulter les fiches', categorie: 'Fiches' },
    { id: 'fiches.create', label: 'Créer des fiches', categorie: 'Fiches' },
    { id: 'fiches.edit', label: 'Modifier des fiches', categorie: 'Fiches' },
    { id: 'fiches.delete', label: 'Supprimer des fiches', categorie: 'Fiches' },
    { id: 'users.view', label: 'Consulter les utilisateurs', categorie: 'Utilisateurs' },
    { id: 'users.create', label: 'Créer des utilisateurs', categorie: 'Utilisateurs' },
    { id: 'users.edit', label: 'Modifier des utilisateurs', categorie: 'Utilisateurs' },
    { id: 'users.delete', label: 'Supprimer des utilisateurs', categorie: 'Utilisateurs' },
    { id: 'roles.view', label: 'Consulter les rôles', categorie: 'Rôles' },
    { id: 'roles.manage', label: 'Gérer les rôles', categorie: 'Rôles' },
    { id: 'biometrie.view', label: 'Consulter la biométrie', categorie: 'Biométrie' },
    { id: 'biometrie.upload', label: 'Gérer la biométrie', categorie: 'Biométrie' },
    { id: 'ia.view_results', label: 'Consulter l\'IA', categorie: 'Intelligence Artificielle' },
    { id: 'ia.use', label: 'Utiliser l\'IA', categorie: 'Intelligence Artificielle' },
    { id: 'reports.view', label: 'Consulter les rapports', categorie: 'Rapports' },
    { id: 'reports.generate', label: 'Créer des rapports', categorie: 'Rapports' },
    { id: 'reports.export', label: 'Exporter des rapports', categorie: 'Rapports' },
    { id: 'audit.view', label: 'Consulter l\'audit', categorie: 'Audit' },
  ]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const togglePermission = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation des champs requis
    if (!formData.nom || !formData.nom.trim()) {
      notification.showError('Le nom du rôle est requis')
      return
    }
    
    if (!formData.code || !formData.code.trim()) {
      notification.showError('Le code du rôle est requis')
      return
    }
    
    try {
      // Préparer les données avec toutes les informations de base
      const roleData = {
        nom: formData.nom.trim(),
        code: formData.code.trim(),
        description: formData.description ? formData.description.trim() : '',
        estActif: formData.estActif !== undefined ? formData.estActif : true,
        permissions: Array.isArray(formData.permissions) ? formData.permissions : []
      }
      
      // Appeler l'API backend pour mettre à jour le rôle et ses permissions
      const result = await updateRole(id, roleData)
      
      // Afficher un message avec les détails des changements
      const usersCount = result?.users_affected || 0
      const permissionsAdded = result?.permissions_added || []
      const permissionsRemoved = result?.permissions_removed || []
      const infoChanges = result?.info_changes || []
      
      let message = 'Rôle mis à jour avec succès !'
      
      // Afficher les changements d'informations de base
      if (infoChanges.length > 0) {
        message += ` Changements: ${infoChanges.join(', ')}.`
      }
      
      if (usersCount > 0) {
        message += ` ${usersCount} utilisateur(s) concerné(s).`
      }
      
      if (permissionsAdded.length > 0) {
        message += ` ${permissionsAdded.length} permission(s) ajoutée(s) et appliquée(s).`
      }
      
      if (permissionsRemoved.length > 0) {
        message += ` ⚠️ ${permissionsRemoved.length} permission(s) retirée(s) - non appliquée(s) aux utilisateurs existants.`
      }
      
      notification.showSuccess(message)
      // Utiliser le nom du rôle encodé pour la navigation
      const roleName = encodeURIComponent(formData.nom || formData.code || id)
      navigate(`/roles/voir/${roleName}`)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rôle:', error)
      const errorMessage = error.message || error.response?.data?.message || 'Erreur lors de la mise à jour du rôle'
      notification.showError(errorMessage)
    }
  }

  // Grouper les permissions par catégorie
  const categoriesPermissions = permissionsDisponibles.reduce((acc, perm) => {
    if (!acc[perm.categorie]) {
      acc[perm.categorie] = []
    }
    acc[perm.categorie].push(perm)
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
              onClick={() => navigate(`/roles/voir/${id}`)}
              className="p-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-colors border border-white/20"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Modifier le Rôle</h1>
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-mono rounded-lg mt-2 border border-white/30">
                {formData.code}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate(`/roles/voir/${id}`)}
            className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-colors flex items-center space-x-2 border border-white/20"
          >
            <X size={20} />
            <span>Annuler</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de base */}
        <div className="card-pro p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <ShieldCheck className="mr-2" style={{ color: '#185CD6' }} size={20} />
            Informations de base
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nom du rôle *
              </label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Ex: Enquêteur Principal"
                className="input-standard w-full h-btn text-sm px-3"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Code *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Ex: ENQUETEUR"
                className="input-standard w-full h-btn text-sm px-3"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Décrivez les responsabilités de ce rôle..."
                rows="2"
                className="input-standard w-full text-sm px-3 py-2 min-h-[60px] max-h-[100px] resize-y"
                required
              ></textarea>
            </div>
            <div className="md:col-span-2 flex items-center space-x-2">
              <input
                type="checkbox"
                name="estActif"
                id="estActif"
                checked={formData.estActif}
                onChange={handleChange}
                className="w-4 h-4 rounded focus:ring-2"
                style={{ accentColor: '#185CD6' }}
              />
              <label htmlFor="estActif" className="text-sm font-semibold text-gray-700">
                Rôle actif
              </label>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="card-pro p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Key className="mr-2" style={{ color: '#185CD6' }} size={24} />
              <span>Permissions</span>
              <span className="ml-2 px-3 py-1 rounded-full text-sm font-semibold" 
                    style={{ backgroundColor: '#185CD61A', color: '#185CD6' }}>
                {formData.permissions.length} {formData.permissions.length <= 1 ? 'sélectionnée' : 'sélectionnées'}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => {
                if (formData.permissions.length === permissionsDisponibles.length) {
                  setFormData(prev => ({ ...prev, permissions: [] }))
                } else {
                  setFormData(prev => ({ ...prev, permissions: permissionsDisponibles.map(p => p.id) }))
                }
              }}
              className="px-4 py-2 text-sm rounded-lg font-semibold transition-colors"
              style={{ 
                backgroundColor: formData.permissions.length === permissionsDisponibles.length ? '#f3f4f6' : '#185CD6',
                color: formData.permissions.length === permissionsDisponibles.length ? '#374151' : 'white'
              }}
              onMouseEnter={(e) => {
                if (formData.permissions.length === permissionsDisponibles.length) {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                } else {
                  e.currentTarget.style.backgroundColor = '#1348A8';
                }
              }}
              onMouseLeave={(e) => {
                if (formData.permissions.length === permissionsDisponibles.length) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                } else {
                  e.currentTarget.style.backgroundColor = '#185CD6';
                }
              }}
            >
              {formData.permissions.length === permissionsDisponibles.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>

          <div className="space-y-6">
            {Object.entries(categoriesPermissions).map(([categorie, perms]) => (
              <div key={categorie} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                  <CheckSquare className="mr-2" style={{ color: '#185CD6' }} size={18} />
                  {categorie}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {perms.map((permission) => (
                    <label
                      key={permission.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                        formData.permissions.includes(permission.id)
                          ? 'border-2'
                          : 'bg-white border-2 border-gray-200'
                      }`}
                      style={formData.permissions.includes(permission.id) ? { 
                        backgroundColor: '#185CD61A',
                        borderColor: '#185CD6'
                      } : {}}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="w-5 h-5 rounded focus:ring-2"
                        style={{ accentColor: '#185CD6' }}
                      />
                      <span className={`text-sm font-medium ${
                        formData.permissions.includes(permission.id) ? 'font-semibold' : 'text-gray-700'
                      }`}
                      style={formData.permissions.includes(permission.id) ? { color: '#185CD6' } : {}}>
                        {permission.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/roles/voir/${id}`)}
            className="px-6 py-3 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 transition-all flex items-center space-x-2"
          >
            <X size={20} />
            <span>Annuler</span>
          </button>
          <button
            type="submit"
            className="px-6 py-3 text-white rounded-xl font-semibold transition-all flex items-center space-x-2 shadow-lg"
            style={{ background: 'linear-gradient(to right, #185CD6, #1348A8)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #1348A8, #0F3A8A)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #185CD6, #1348A8)';
            }}
          >
            <Save size={20} />
            <span>Enregistrer les modifications</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default ModifierRole

