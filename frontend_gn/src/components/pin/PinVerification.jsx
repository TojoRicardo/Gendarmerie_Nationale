import { useState } from 'react'
import { Lock, AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { post } from '../../services/api'

const PinVerification = ({ tempToken, onSuccess, onCancel }) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPin(value)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (pin.length !== 6) {
      setError('Le PIN doit contenir exactement 6 chiffres')
      return
    }
    
    if (!tempToken) {
      setError('Token temporaire manquant. Veuillez vous reconnecter.')
      return
    }
    
    setLoading(true)
    
    try {
      // S'assurer d'envoyer un objet JSON, jamais une chaîne
      const requestData = {
        temp_token: tempToken,
        pin: pin
      }
      
      console.log('Envoi de la requête verify-pin avec:', { 
        temp_token: tempToken ? `${tempToken.substring(0, 20)}...` : null,
        pin: '******'
      })
      
      const response = await post('/utilisateur/verify-pin/', requestData)
      
      // Vérifier la réponse
      if (response && response.data) {
        if (response.data.success === false) {
          // Erreur retournée par le backend
          setError(response.data.message || 'Erreur lors de la vérification du PIN')
        } else if (response.data.access && response.data.user) {
          // Succès
          onSuccess(response.data)
        } else {
          setError('Réponse invalide du serveur')
        }
      } else {
        setError('Réponse invalide du serveur')
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du PIN:', error)
      
      // Gérer les différents types d'erreurs
      let errorMessage = 'Une erreur est survenue lors de la vérification du PIN'
      
      if (error.response) {
        // Erreur HTTP avec réponse
        const data = error.response.data
        if (data) {
          if (data.message) {
            errorMessage = data.message
          } else if (data.error) {
            errorMessage = data.error
          } else if (typeof data === 'string') {
            errorMessage = data
          }
        } else {
          errorMessage = `Erreur ${error.response.status}: ${error.response.statusText}`
        }
      } else if (error.request) {
        // Requête envoyée mais pas de réponse
        errorMessage = 'Pas de réponse du serveur. Vérifiez votre connexion.'
      } else {
        // Erreur lors de la configuration de la requête
        errorMessage = error.message || errorMessage
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Vérification du PIN</h2>
              <p className="text-blue-100 text-sm">Entrez votre code PIN à 6 chiffres</p>
            </div>
          </div>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6">
          {/* Message d'erreur */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border-2 border-red-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-900 font-semibold">Erreur</p>
                  <p className="text-xs text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire PIN */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="pin" className="block text-sm font-semibold text-gray-700">
                Code PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="pin"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="6"
                  value={pin}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-3xl tracking-widest font-mono"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  autoFocus
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {pin.length}/6 chiffres
              </p>
            </div>

            {/* Boutons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || pin.length !== 6}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Vérification...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Vérifier</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PinVerification

