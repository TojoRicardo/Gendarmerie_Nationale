import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, ShieldCheck, Check, X } from 'lucide-react'
import { useNotification } from '../context/NotificationContext'
import { getUsers, updateUser, fetchRoles, fetchPermissions } from '../services/authService'
import PermissionCategory from '../components/roles/PermissionCategory'
import PermissionCheckbox from '../components/roles/PermissionCheckbox'

const AssignerRoleUtilisateur = () => {
  const navigate = useNavigate()
  const notification = useNotification()
  
  const [step, setStep] = useState(1) // 1: Sélection utilisateur, 2: Sélection rôle et permissions
  const [utilisateurs, setUtilisateurs] = useState([])
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchUser, setSearchUser] = useState('')
  
  // État du formulaire
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [selectedPermissions, setSelectedPermissions] = useState([])

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [usersData, rolesData, permsData] = await Promise.all([
          getUsers(),
          fetchRoles(true), // Inclure les inactifs aussi
          fetchPermissions()
        ])
        
        setUtilisateurs(Array.isArray(usersData) ? usersData : [])
        setRoles(Array.isArray(rolesData) ? rolesData : [])
        // S'assurer que permissions est toujours un tableau
        let permissionsArray = []
        if (Array.isArray(permsData)) {
          permissionsArray = permsData
        } else if (permsData && Array.isArray(permsData.permissions)) {
          permissionsArray = permsData.permissions
        } else if (permsData && Array.isArray(permsData.data)) {
          permissionsArray = permsData.data
        } else if (permsData && permsData.results && Array.isArray(permsData.results)) {
          permissionsArray = permsData.results
        }
        setPermissions(permissionsArray)
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
        notification.showError('Impossible de charger les données')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [notification])

  // Filtrer les utilisateurs
  const filteredUsers = utilisateurs.filter(user =>
    `${user.nom || ''} ${user.prenom || ''} ${user.email || ''} ${user.username || ''}`
      .toLowerCase()
      .includes(searchUser.toLowerCase())
  )

  // Quand un rôle est sélectionné, pré-remplir les permissions
  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    if (role && role.permissions) {
      // Extraire les IDs des permissions du rôle
      const rolePermissionIds = role.permissions.map(p => typeof p === 'object' ? p.id : p)
      setSelectedPermissions(rolePermissionIds)
    } else {
      setSelectedPermissions([])
    }
  }

  // Gérer la sélection/désélection des permissions
  const handleTogglePermission = (permissionId) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId)
      }
      return [...prev, permissionId]
    })
  }

  // Gérer la sélection/désélection par catégorie
  const handleToggleCategory = (category, selectAll) => {
    const permissionsArray = Array.isArray(permissions) ? permissions : []
    const categoryPermissions = permissionsArray.filter(p => p.category === category)
    const categoryIds = categoryPermissions.map(p => p.id)
    
    if (selectAll) {
      setSelectedPermissions(prev => [...new Set([...prev, ...categoryIds])])
    } else {
      setSelectedPermissions(prev => prev.filter(id => !categoryIds.includes(id)))
    }
  }

  // Sélectionner tout
  const handleSelectAll = () => {
    const permissionsArray = Array.isArray(permissions) ? permissions : []
    const allIds = permissionsArray.map(p => p.id)
    setSelectedPermissions(allIds)
  }

  // Passer à l'étape suivante
  const handleNextStep = () => {
    if (step === 1 && !selectedUser) {
      notification.showError('Veuillez sélectionner un utilisateur')
      return
    }
    setStep(2)
  }

  // Revenir à l'étape précédente
  const handlePrevStep = () => {
    setStep(1)
  }

  // Sauvegarder les changements
  const handleSave = async () => {
    if (!selectedUser) {
      notification.showError('Veuillez sélectionner un utilisateur')
      return
    }

    if (selectedPermissions.length === 0) {
      notification.showError('Veuillez sélectionner au moins une permission')
      return
    }

    try {
      setLoading(true)
      
      // Préparer les données à envoyer
      const updateData = {
        role: selectedRole ? selectedRole.name : selectedUser.role || null,
      }

      // Appeler l'API pour mettre à jour l'utilisateur
      await updateUser(selectedUser.id, updateData)
      
      notification.showSuccess(`Rôle ${selectedRole ? selectedRole.name : 'mis à jour'} assigné à ${selectedUser.email || selectedUser.username} avec succès`)
      navigate('/utilisateurs')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      notification.showError('Erreur lors de l\'assignation du rôle et des permissions')
    } finally {
      setLoading(false)
    }
  }

  // S'assurer que permissions est toujours un tableau
  const permissionsArray = Array.isArray(permissions) ? permissions : []
  const categories = [...new Set(permissionsArray.map(p => p.category))].sort()
  const selectedCount = selectedPermissions.length
  const totalCount = permissionsArray.length
  const allSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="rounded-2xl p-6 shadow-xl" style={{ background: 'linear-gradient(to right, #185CD6, #1348A8)' }}>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/utilisateurs')}
            className="p-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-colors border border-white/20"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Assigner Rôle et Permissions</h1>
            <p className="text-white/80 text-sm mt-1">
              Étape {step} sur 2 : {step === 1 ? 'Sélectionner un utilisateur' : 'Choisir le rôle et les permissions'}
            </p>
          </div>
        </div>
      </div>

      {/* Indicateur de progression */}
      <div className="card-pro p-4">
        <div className="flex items-center space-x-4">
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        </div>
      </div>

      {/* Étape 1: Sélection de l'utilisateur */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="card-pro p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <User className="mr-2" style={{ color: '#185CD6' }} size={20} />
              Sélectionner un utilisateur
            </h2>
            
            {/* Barre de recherche */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Rechercher un utilisateur (nom, prénom, email)..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="input-standard w-full h-btn"
              />
            </div>

            {/* Liste des utilisateurs */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Chargement des utilisateurs...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun utilisateur trouvé
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedUser?.id === user.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user.prenom} {user.nom} {user.nom && user.prenom ? '' : user.username}
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.role && (
                          <p className="text-xs text-gray-500 mt-1">
                            Rôle actuel: <span className="font-medium">{user.role}</span>
                          </p>
                        )}
                      </div>
                      {selectedUser?.id === user.id && (
                        <Check className="text-blue-600" size={20} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bouton suivant */}
          <div className="flex justify-end">
            <button
              onClick={handleNextStep}
              disabled={!selectedUser || loading}
              className="px-6 py-3 text-white rounded-xl font-semibold transition-all flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(to right, #185CD6, #1348A8)' }}
            >
              <span>Suivant</span>
              <ArrowLeft size={20} className="rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* Étape 2: Sélection du rôle et des permissions */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Informations de l'utilisateur sélectionné */}
          <div className="card-pro p-4 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  Utilisateur sélectionné: {selectedUser.prenom} {selectedUser.nom} {selectedUser.nom && selectedUser.prenom ? '' : selectedUser.username}
                </p>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
              </div>
              <button
                onClick={handlePrevStep}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Changer
              </button>
            </div>
          </div>

          {/* Sélection du rôle */}
          <div className="card-pro p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <ShieldCheck className="mr-2" style={{ color: '#185CD6' }} size={20} />
              Sélectionner un rôle (optionnel)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {roles.map((role) => (
                <div
                  key={role.id}
                  onClick={() => handleRoleSelect(role)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRole?.id === role.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{role.name}</p>
                      <p className="text-xs text-gray-500">{role.permissions_count || 0} permissions</p>
                    </div>
                    {selectedRole?.id === role.id && (
                      <Check className="text-blue-600" size={18} />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {roles.length === 0 && !loading && (
              <p className="text-center text-gray-500 py-4">Aucun rôle disponible</p>
            )}
          </div>

          {/* Sélection des permissions */}
          <div className="card-pro p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <ShieldCheck className="mr-2" style={{ color: '#185CD6' }} size={20} />
                Permissions
                <span className="ml-2 px-3 py-1 rounded-full text-sm font-semibold" 
                      style={{ backgroundColor: '#185CD61A', color: '#185CD6' }}>
                  {selectedCount} {selectedCount <= 1 ? 'sélectionnée' : 'sélectionnées'}
                </span>
              </h2>
              <button
                type="button"
                onClick={allSelected ? () => setSelectedPermissions([]) : handleSelectAll}
                className="px-4 py-2 text-sm rounded-lg font-semibold transition-colors"
                style={{ 
                  backgroundColor: allSelected ? '#f3f4f6' : '#185CD6',
                  color: allSelected ? '#374151' : 'white'
                }}
              >
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>

            <div className="space-y-4">
              {categories.map((category) => (
                <PermissionCategory
                  key={category}
                  category={category}
                  permissions={Array.isArray(permissions) ? permissions : []}
                  selectedPermissions={selectedPermissions}
                  onTogglePermission={handleTogglePermission}
                  onToggleCategory={handleToggleCategory}
                />
              ))}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={handlePrevStep}
              className="px-6 py-3 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 transition-all flex items-center space-x-2"
            >
              <ArrowLeft size={20} />
              <span>Précédent</span>
            </button>
            <button
              onClick={handleSave}
              disabled={loading || selectedPermissions.length === 0}
              className="px-6 py-3 text-white rounded-xl font-semibold transition-all flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(to right, #185CD6, #1348A8)' }}
            >
              <Check size={20} />
              <span>{loading ? 'Enregistrement...' : 'Assigner'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssignerRoleUtilisateur

