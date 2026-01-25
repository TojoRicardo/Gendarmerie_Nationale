import { Menu, Bell, User, LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'

const Entete = ({ onToggleSidebar, onToggleCollapsed, utilisateur }) => {
  const navigate = useNavigate()
  const { deconnexion } = useAuth()
  const [logoError, setLogoError] = useState(false)

  const handleLogout = async () => {
    try {
      await deconnexion()
      navigate('/connexion')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      navigate('/connexion')
    }
  }

  return (
    <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b border-slate-600 shadow-lg z-30 relative">
      <div className="flex items-center justify-between p-standard">
        {/* Left: Menu Toggle */}
        <div className="flex items-center gap-element-lg">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-slate-600/50 rounded-lg lg:hidden min-h-btn min-w-btn flex items-center justify-center transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="icon-lg text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            {/* Drapeau malgache */}
            <div className="w-20 h-12 flex items-center justify-center overflow-hidden rounded-sm shadow-md border border-white/10">
              <img 
                src="/drapeau Malagasy.svg" 
                alt="Drapeau malgache"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Textes */}
            <div className="flex flex-col">
              <h1 className="text-lg lg:text-xl font-bold text-white leading-tight">
                Gendarmerie Nationale Malagasy
              </h1>
              <span className="text-xs lg:text-sm font-bold text-yellow-400 leading-tight">
                Système de Gestion Criminelle
              </span>
            </div>
          </div>
        </div>

        {/* Right: User Actions */}
        <div className="flex items-center gap-element-sm">
          {/* Notifications */}
          <button
            className="relative p-2 hover:bg-slate-600/50 rounded-lg min-h-btn min-w-btn flex items-center justify-center transition-colors"
            aria-label="Notifications"
          >
            <Bell className="icon-standard text-white" />
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/profil')}
            className="p-2 hover:bg-slate-600/50 rounded-lg min-h-btn min-w-btn flex items-center justify-center transition-colors"
            aria-label="Paramètres"
          >
            <Settings className="icon-standard text-white" />
          </button>

          {/* User Menu */}
          {utilisateur && (
            <div className="flex items-center gap-element pl-3 border-l border-slate-600">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-body-sm font-medium text-white">
                  {utilisateur.nom || utilisateur.email}
                </span>
                <span className="text-label-sm text-slate-300">
                  {utilisateur.role || 'Utilisateur'}
                </span>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-semibold text-label">
                  {utilisateur.nom?.[0] || utilisateur.email?.[0] || 'U'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-500/20 rounded-lg min-h-btn min-w-btn flex items-center justify-center transition-colors"
                aria-label="Déconnexion"
                title="Déconnexion"
              >
                <LogOut className="icon-standard text-red-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Entete

