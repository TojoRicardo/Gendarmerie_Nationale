import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ShieldCheck, Search } from 'lucide-react'
import { useNotification } from '../context/NotificationContext'
import { fetchRoles, deleteRoleById } from '../services/authService'
import RoleList from '../components/roles/RoleList'

const GestionRoles = () => {
  const navigate = useNavigate()
  const notification = useNotification()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Charger les rôles
  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const data = await fetchRoles()
      setRoles(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error)
      notification.showError('Impossible de charger les rôles')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    navigate('/gestion-roles/creer')
  }


  const handleEdit = (role) => {
    navigate(`/gestion-roles/modifier/${role.id}`)
  }
  
  const handleView = (role) => {
    // Pour l'instant, rediriger vers l'édition (on peut créer une page de visualisation plus tard)
    navigate(`/gestion-roles/modifier/${role.id}`)
  }

  const handleDelete = async (role) => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ?\n\n` +
      `Cette action est irréversible. Si ce rôle est utilisé par des utilisateurs, ` +
      `la suppression sera impossible.`
    )
    
    if (!confirmed) return

    try {
      await deleteRoleById(role.id)
      notification.showSuccess('Rôle supprimé avec succès')
      loadRoles()
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.error || 'Erreur lors de la suppression'
      notification.showError(errorMessage)
    }
  }

  // Filtrer les rôles selon la recherche
  const filteredRoles = roles.filter(role =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="rounded-2xl p-6 shadow-xl" style={{ background: 'linear-gradient(to right, #185CD6, #1348A8)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Gestion des Rôles</h1>
              <p className="text-white/80 text-sm mt-1">
                Gérez les rôles et leurs permissions
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2 shadow-lg"
          >
            <Plus size={20} />
            <span>Créer un rôle</span>
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="card-pro p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher un rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-standard w-full h-btn pl-10 pr-4"
          />
        </div>
      </div>

      {/* Liste des rôles */}
      <div className="card-pro p-6">
        <RoleList
          roles={filteredRoles}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      </div>
    </div>
  )
}

export default GestionRoles

