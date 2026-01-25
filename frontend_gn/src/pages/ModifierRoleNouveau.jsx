import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useNotification } from '../context/NotificationContext'
import { fetchRoleById, updateRoleById } from '../services/authService'
import RoleForm from '../components/roles/RoleForm'

const ModifierRoleNouveau = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const notification = useNotification()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState(null)
  const [loadingRole, setLoadingRole] = useState(true)

  // Charger le rôle
  useEffect(() => {
    const loadRole = async () => {
      try {
        setLoadingRole(true)
        const response = await fetchRoleById(id)
        
        // Le RoleDetailSerializer retourne les données directement (pas dans un objet 'role')
        // Format attendu: { id, name, description, is_active, permissions: [{ id, code, label, category }], ... }
        const roleData = response
        
        // Vérifier que les données sont valides
        if (!roleData || !roleData.id) {
          throw new Error('Format de données invalide reçu du serveur')
        }
        
        console.log('📥 Données reçues du backend:', roleData)
        console.log('📥 Permissions reçues:', roleData.permissions)
        
        // S'assurer que les permissions sont dans le bon format (doivent être des objets avec 'id')
        if (roleData.permissions && Array.isArray(roleData.permissions)) {
          roleData.permissions = roleData.permissions.map(perm => {
            // Si c'est déjà un objet avec 'id', le garder tel quel
            if (typeof perm === 'object' && perm.id) {
              return perm
            }
            // Si c'est juste un ID numérique, créer un objet minimal (ne devrait pas arriver)
            if (typeof perm === 'number') {
              console.warn('⚠️ Permission reçue comme ID numérique:', perm)
              return { id: perm }
            }
            // Sinon, retourner tel quel
            return perm
          })
        } else {
          // S'assurer que permissions est toujours un tableau
          roleData.permissions = []
        }
        
        console.log('✅ Permissions formatées:', roleData.permissions)
        setRole(roleData)
      } catch (error) {
        console.error('Erreur lors du chargement du rôle:', error)
        
        // Rediriger silencieusement sans afficher d'erreur
        // L'erreur est déjà loggée dans la console pour le débogage
        navigate('/gestion-roles')
      } finally {
        setLoadingRole(false)
      }
    }

    if (id) {
      loadRole()
    }
  }, [id, navigate, notification])

  const handleSubmit = async (formData) => {
    try {
      setLoading(true)
      await updateRoleById(id, formData)
      notification.showSuccess('Rôle modifié avec succès')
      navigate('/gestion-roles')
    } catch (error) {
      const errorMessage = error.message || 'Erreur lors de la modification du rôle'
      notification.showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/gestion-roles')
  }

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données du rôle...</p>
        </div>
      </div>
    )
  }

  if (!role) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="rounded-2xl p-6 shadow-xl" style={{ background: 'linear-gradient(to right, #185CD6, #1348A8)' }}>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCancel}
            className="p-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-colors border border-white/20"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Modifier le Rôle</h1>
            <p className="text-white/80 text-sm mt-1">
              {role.name}
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <RoleForm
        role={role}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  )
}

export default ModifierRoleNouveau

