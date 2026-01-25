import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react'
import { get, post } from '../../services/api'

const PinManagement = () => {
  const [pinData, setPinData] = useState({
    pin: '',
    confirmPin: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pinStatus, setPinStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  // Charger le statut du PIN
  useEffect(() => {
    loadPinStatus()
  }, [])

  const loadPinStatus = async () => {
    try {
      setLoadingStatus(true)
      const response = await get('/utilisateur/pin-status/')
      setPinStatus(response.data)
    } catch (error) {
      console.error('Erreur lors du chargement du statut PIN:', error)
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Pour les champs PIN, ne permettre que les chiffres et limiter à 6
    if (name === 'pin' || name === 'confirmPin') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6)
      setPinData(prev => ({ ...prev, [name]: numericValue }))
    } else {
      setPinData(prev => ({ ...prev, [name]: value }))
    }
    
    // Effacer les messages d'erreur/succès lors de la saisie
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateForm = () => {
    if (!pinData.password) {
      setError('Le mot de passe est requis')
      return false
    }
    
    if (!pinData.pin) {
      setError('Le PIN est requis')
      return false
    }
    
    if (pinData.pin.length !== 6) {
      setError('Le PIN doit contenir exactement 6 chiffres')
      return false
    }
    
    if (pinData.pin !== pinData.confirmPin) {
      setError('Les deux PIN ne correspondent pas')
      return false
    }
    
    // Vérifier les PINs interdits
    const forbiddenPins = ['000000', '111111', '222222', '333333', '444444', '555555', 
                          '666666', '777777', '888888', '999999', '123456', '654321']
    if (forbiddenPins.includes(pinData.pin)) {
      setError('Ce PIN est trop simple et n\'est pas autorisé. Veuillez choisir un PIN plus sécurisé.')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      const response = await post('/utilisateur/set-pin/', {
        pin: pinData.pin,
        confirm_pin: pinData.confirmPin,
        password: pinData.password
      })
      
      if (response.data.success) {
        setSuccess(response.data.message || 'PIN défini avec succès')
        setPinData({
          pin: '',
          confirmPin: '',
          password: ''
        })
        // Recharger le statut
        await loadPinStatus()
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.pin?.[0] ||
                          error.response?.data?.confirm_pin?.[0] ||
                          error.response?.data?.password?.[0] ||
                          'Une erreur est survenue lors de la définition du PIN'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-blue-600" size={24} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statut du PIN */}
      {pinStatus && (
        <div className={`p-4 rounded-lg border-2 ${
          pinStatus.is_blocked 
            ? 'bg-red-50 border-red-300' 
            : pinStatus.has_pin 
              ? 'bg-green-50 border-green-300' 
              : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-start gap-3">
            {pinStatus.is_blocked ? (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : pinStatus.has_pin ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">
                {pinStatus.is_blocked 
                  ? 'PIN bloqué temporairement' 
                  : pinStatus.has_pin 
                    ? 'PIN configuré' 
                    : 'PIN non configuré'}
              </h4>
              <p className="text-xs text-gray-600">
                {pinStatus.is_blocked 
                  ? `Trop d'échecs. Réessayez dans ${pinStatus.remaining_minutes} minute(s).`
                  : pinStatus.has_pin 
                    ? `Tentatives restantes : ${pinStatus.attempts_remaining}/3`
                    : 'Veuillez définir un PIN pour sécuriser votre compte.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages d'erreur/succès */}
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

      {success && (
        <div className="p-4 rounded-lg bg-green-50 border-2 border-green-300">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-900 font-semibold">Succès</p>
              <p className="text-xs text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            {pinStatus?.has_pin ? 'Modifier le PIN' : 'Définir un PIN'}
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Le PIN doit contenir exactement 6 chiffres. Il sera utilisé en plus de votre mot de passe lors de la connexion.
          </p>
        </div>

        {/* Mot de passe actuel */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
            Mot de passe actuel <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={pinData.password}
              onChange={handleChange}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Entrez votre mot de passe actuel"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center hover:opacity-80"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Nouveau PIN */}
        <div className="space-y-2">
          <label htmlFor="pin" className="block text-sm font-semibold text-gray-700">
            Nouveau PIN (6 chiffres) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <ShieldCheck className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="pin"
              name="pin"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="6"
              value={pinData.pin}
              onChange={handleChange}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              required
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center hover:opacity-80"
            >
              {showPin ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {pinData.pin.length}/6 chiffres
          </p>
        </div>

        {/* Confirmation PIN */}
        <div className="space-y-2">
          <label htmlFor="confirmPin" className="block text-sm font-semibold text-gray-700">
            Confirmer le PIN <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <ShieldCheck className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="confirmPin"
              name="confirmPin"
              type={showConfirmPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="6"
              value={pinData.confirmPin}
              onChange={handleChange}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPin(!showConfirmPin)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center hover:opacity-80"
            >
              {showConfirmPin ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {pinData.confirmPin && pinData.pin !== pinData.confirmPin && (
            <p className="text-xs text-red-500">Les deux PIN ne correspondent pas</p>
          )}
        </div>

        {/* Informations de sécurité */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-1">Règles de sécurité</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Le PIN doit contenir exactement 6 chiffres</li>
                <li>Évitez les séquences simples (123456, 000000, etc.)</li>
                <li>Après 3 échecs, votre compte sera bloqué pendant 5 minutes</li>
                <li>Le PIN est haché et stocké de manière sécurisée</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bouton de soumission */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading || pinStatus?.is_blocked}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>{pinStatus?.has_pin ? 'Modifier le PIN' : 'Définir le PIN'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PinManagement

