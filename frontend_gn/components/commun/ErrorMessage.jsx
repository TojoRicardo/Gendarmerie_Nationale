import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Composant d'affichage d'erreur réutilisable
 */
const ErrorMessage = ({ 
  title = 'Une erreur est survenue',
  message = 'Impossible de charger les données. Veuillez réessayer.',
  onRetry = null,
  showHomeButton = false,
  type = 'error' // 'error', 'warning', 'info'
}) => {
  const navigate = useNavigate()

  const typeStyles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      text: 'text-red-800',
      button: 'btn-danger-pro'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: '',
      text: 'text-yellow-800',
      button: 'btn-warning-pro'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: '',
      text: 'text-blue-800',
      button: 'btn-primary-pro'
    }
  }

  const styles = typeStyles[type] || typeStyles.error

  return (
    <div className={`${styles.bg} border-2 ${styles.border} rounded-2xl p-8 text-center animate-fadeIn`}>
      <div className="flex justify-center mb-4">
        <AlertTriangle 
          className={`${styles.icon} animate-wiggle`} 
          size={64} 
          style={type === 'warning' || type === 'info' ? { color: '#C4C4C4' } : {}}
        />
      </div>
      
      <h2 className={`text-2xl font-bold ${styles.text} mb-2`}>
        {title}
      </h2>
      
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {message}
      </p>

      <div className="flex gap-4 justify-center">
        {onRetry && (
          <button 
            onClick={onRetry}
            className={`${styles.button} flex items-center space-x-2`}
          >
            <RefreshCw size={18} />
            <span>Réessayer</span>
          </button>
        )}
        
        {showHomeButton && (
          <button 
            onClick={() => navigate('/dashboard')}
            className="btn-secondary-pro flex items-center space-x-2"
          >
            <Home size={18} />
            <span>Retour à l'accueil</span>
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Message pour données vides
 */
export const EmptyMessage = ({ 
  title = 'Aucune donnée',
  message = 'Il n\'y a pas encore de données à afficher.',
  icon: Icon = AlertTriangle,
  action = null,
  actionLabel = null
}) => (
  <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 text-center animate-fadeIn">
    <div className="flex justify-center mb-4">
      <Icon className="text-gray-400" size={64} />
    </div>
    
    <h2 className="text-2xl font-bold text-gray-700 mb-2">
      {title}
    </h2>
    
    <p className="text-gray-500 mb-6 max-w-md mx-auto">
      {message}
    </p>

    {action && actionLabel && (
      <button 
        onClick={action}
        className="btn-primary-pro"
      >
        {actionLabel}
      </button>
    )}
  </div>
)

export default ErrorMessage

