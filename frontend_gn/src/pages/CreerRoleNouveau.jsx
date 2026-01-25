import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useNotification } from '../context/NotificationContext'
import { createRole } from '../services/authService'
import RoleForm from '../components/roles/RoleForm'

const CreerRoleNouveau = () => {
  const navigate = useNavigate()
  const notification = useNotification()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData) => {
    try {
      setLoading(true)
      await createRole(formData)
      notification.showSuccess('Rôle créé avec succès')
      navigate('/gestion-roles')
    } catch (error) {
      const errorMessage = error.message || 'Erreur lors de la création du rôle'
      notification.showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/gestion-roles')
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
            <h1 className="text-3xl font-bold text-white">Créer un Rôle</h1>
            <p className="text-white/80 text-sm mt-1">
              Définissez un nouveau rôle et ses permissions
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <RoleForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  )
}

export default CreerRoleNouveau

