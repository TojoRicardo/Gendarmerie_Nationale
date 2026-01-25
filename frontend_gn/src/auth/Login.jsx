/**
 * Page de connexion professionnelle
 * Système de Gestion Intelligente - Gendarmerie Nationale
 * 
 * Features:
 * - Validation en temps réel
 * - Gestion d'erreurs frontend/backend
 * - Protection CSRF
 * - Design moderne et responsive
 * - Sécurité renforcée
 */

import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, AlertCircle, Mail, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getRoleRedirect } from '../utils/roleRedirection'
import { login as authServiceLogin } from './authService'
import PinVerification from '../components/pin/PinVerification'
import { saveAuthToken, saveUserData, saveRefreshToken } from '../utils/sessionStorage'

const Login = () => {
  // États du formulaire
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  
  // États pour le PIN après connexion
  const [pinRequired, setPinRequired] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [pinValue, setPinValue] = useState('')
  
  // États de validation
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  
  // États UI
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  

  const navigate = useNavigate()
  const { connexion, providerReady, mettreAJourUtilisateurDirect } = useAuth()

  /**
   * Validation en temps réel
   */
  const validateField = useCallback((name, value) => {
    const newErrors = { ...errors }
    
    switch (name) {
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'L\'identifiant est requis'
        } else if (value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Format d\'email invalide'
        }
        break
      case 'password':
        if (!value) {
          newErrors.password = 'Le mot de passe est requis'
        } else if (value.length < 6) {
          newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères'
        }
        break
      default:
        break
    }
    
    setErrors(newErrors)
    return !newErrors[name]
  }, [errors])

  /**
   * Validation complète du formulaire
   */
  const validateForm = useCallback(() => {
    const newErrors = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'identifiant est requis'
    } else if (formData.email.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide'
    }
    
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }
    
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  /**
   * Gestion des changements de champs avec validation
   */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('') // Effacer l'erreur globale
    
    // Validation en temps réel si le champ a été touché
    if (touched[name]) {
      validateField(name, value)
    }
  }, [touched, validateField])

  /**
   * Gestion du blur (champ perdu le focus)
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    validateField(name, value)
  }, [validateField])

  /**
   * Connexion fallback si AuthContext n'est pas prêt
   */
  const fallbackLogin = useCallback(async (emailOrUsername, password, pin) => {
    const isEmail = emailOrUsername.includes('@')
    const credentials = isEmail
      ? { email: emailOrUsername, password, pin }
      : { username: emailOrUsername, password, pin }

    const result = await authServiceLogin(credentials)


    if (!result.success || !result.user) {
      throw new Error(result.message || 'Données utilisateur non reçues du serveur')
    }

    const userData = {
      ...result.user,
      permissions: result.user?.permissions || [],
    }

    return {
      success: true,
      token: result.token,
      utilisateur: userData,
    }
  }, [])

  /**
   * Extraction et formatage des messages d'erreur
   */
  const extractErrorMessage = useCallback((err) => {
    // Erreurs réseau
    if (err.code === 'ERR_NETWORK' || err.code === 'ERR_CONNECTION_REFUSED' ||
        err.message?.includes('ERR_CONNECTION_REFUSED') || err.message?.includes('Network Error')) {
      return "Impossible de se connecter au serveur. Vérifiez votre connexion internet."
    }

    // Message d'erreur depuis le backend
    if (err.message) {
      const message = err.message.toLowerCase()
      
      if (message.includes('suspendu') || message.includes('suspend')) {
        return "Votre compte a été suspendu. Veuillez contacter l'administrateur pour réactiver votre compte."
      }
      if (message.includes('aucun compte') || message.includes("n'existe") || 
          (message.includes('email') && (message.includes('incorrect') || message.includes('invalide')))) {
        return "Aucun compte n'existe avec cet identifiant. Vérifiez vos informations."
      }
      if (message.includes('mot de passe') && message.includes('incorrect')) {
        return "Mot de passe incorrect. Veuillez réessayer."
      }
      if (message.includes('désactivé') || message.includes('inactif')) {
        return "Votre compte est désactivé. Veuillez contacter l'administrateur."
      }
      
      return err.message
    }

    return "Une erreur inattendue s'est produite. Veuillez réessayer."
  }, [])

  /**
   * Soumission du formulaire
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Marquer tous les champs comme touchés
    setTouched({ email: true, password: true })
    
    // Validation complète
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setIsSubmitting(true)

    try {
      // Connexion via AuthContext ou fallback
      const loginHandler = providerReady ? connexion : fallbackLogin
      const result = await loginHandler(formData.email, formData.password, '')
      
      // Vérifier si le PIN est requis
      if (result?.pin_required || result?.data?.pin_required) {
        const token = result?.temp_token || result?.data?.temp_token
        if (token) {
          setTempToken(token)
          setPinRequired(true)
          setError('')
          return
        }
      }


      // Récupérer les données utilisateur
      const userData = result?.utilisateur || JSON.parse(localStorage.getItem('user_data') || '{}')
      
      // Redirection intelligente selon le rôle
      const roleConfig = getRoleRedirect(userData?.role)
      
      // Redirection avec message de bienvenue
      navigate(roleConfig.route, { 
        replace: true,
        state: { welcomeMessage: roleConfig.message }
      })

    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      setError(errorMessage)
      
      // Log uniquement les erreurs non-réseau
      if (!err.code?.includes('ERR_NETWORK') && !err.code?.includes('ERR_CONNECTION_REFUSED')) {
        console.error("Erreur lors de la connexion:", err)
      }
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }


  /**
   * Vérifier si le formulaire est valide pour activer le bouton
   */
  const isFormValid = formData.email.trim().length > 0 && formData.password.length > 0


  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#0092D1' }}>
      {/* Animations de fond subtiles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob" style={{ backgroundColor: '#00a8e8' }}></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" style={{ backgroundColor: '#00a8e8' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-8 animate-blob animation-delay-4000" style={{ backgroundColor: '#00a8e8' }}></div>
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6 animate-fade-in">
        {/* Panneau transparent avec effet glassmorphism */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20">
          {/* En-tête */}
          <div className="text-center mb-8">
            {/* Drapeau de Madagascar */}
            <div className="flex justify-center mb-6">
              <div className="w-48 h-32 rounded-lg overflow-hidden shadow-2xl">
                <img 
                  src="/drapeau Malagasy.svg" 
                  alt="Drapeau de Madagascar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
              Système de Gestion Intelligente
            </h1>
            <p className="text-white/90 text-sm font-semibold">
              Gendarmerie Nationale Malagasy 
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10" noValidate>
          {/* Message d'erreur global */}
          {error && (
            <div className={`p-4 rounded-xl border-2 bg-white shadow-lg animate-slide-down ${
              error.toLowerCase().includes('suspendu') 
                ? 'bg-orange-50 border-orange-300 text-orange-900' 
                : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">
                    {error.toLowerCase().includes('suspendu') 
                      ? 'Compte suspendu' 
                      : error.toLowerCase().includes('mot de passe')
                        ? 'Mot de passe incorrect'
                        : error.toLowerCase().includes('aucun compte')
                          ? 'Identifiant incorrect'
                          : 'Erreur de connexion'}
                  </p>
                  <p className="text-xs leading-relaxed opacity-90">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Champ Identifiant */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold text-white">
              Identifiant
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className={`h-5 w-5 transition-colors ${
                  errors.email ? 'text-red-500' : touched.email && !errors.email ? 'text-green-500' : 'text-gray-400'
                }`} />
              </div>
              <input
                id="email"
                name="email"
                type="text"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' 
                    : touched.email && !errors.email
                      ? 'border-green-400 focus:ring-green-400/50 focus:border-green-400'
                      : 'border-green-300 focus:ring-green-400/50 focus:border-green-400'
                }`}
                placeholder="Email ou nom d'utilisateur"
                autoComplete="username"
                disabled={loading}
              />
              {errors.email && touched.email && (
                <p className="mt-1 text-xs text-red-500 animate-fade-in">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Champ Mot de passe */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-white">
              Mot de passe
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <Lock className={`h-5 w-5 transition-colors ${
                  errors.password ? 'text-red-500' : touched.password && !errors.password ? 'text-green-500' : 'text-gray-400 group-focus-within:text-blue-500'
                }`} />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full pl-12 pr-12 py-3.5 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm ${
                  errors.password 
                    ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' 
                    : touched.password && !errors.password
                      ? 'border-green-400 focus:ring-green-400/50 focus:border-green-400'
                      : 'border-gray-300 focus:ring-blue-500/50 focus:border-blue-400'
                }`}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                disabled={loading}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
              {errors.password && touched.password && (
                <p className="mt-1 text-xs text-red-500 animate-fade-in">{errors.password}</p>
              )}
            </div>
          </div>

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={loading || !isFormValid || isSubmitting}
            className="w-full text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] group disabled:hover:scale-100 relative z-20 cursor-pointer"
            style={{ 
              backgroundColor: '#003247',
              pointerEvents: (loading || !isFormValid || isSubmitting) ? 'none' : 'auto'
            }}
            onMouseEnter={(e) => {
              if (!loading && isFormValid && !isSubmitting) {
                e.currentTarget.style.backgroundColor = '#004A6B'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && isFormValid && !isSubmitting) {
                e.currentTarget.style.backgroundColor = '#003247'
              }
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-xs text-white/80 text-center font-medium">
              © 2025 Gendarmerie Nationale Malagasy - Système confidentiel
            </p>
          </div>
        </div>
      </div>

      {/* Styles pour les animations */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-blob {
          animation: blob 8s infinite ease-in-out;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      {/* Modal de vérification PIN */}
      {pinRequired && tempToken && (
        <PinVerification
          tempToken={tempToken}
          onSuccess={(data) => {
            // Sauvegarder les tokens et données utilisateur
            saveAuthToken(data.access)
            saveUserData(data.user)
            if (data.refresh) {
              saveRefreshToken(data.refresh)
            }
            
            // Mettre à jour immédiatement le contexte AuthContext
            if (data.user) {
              mettreAJourUtilisateurDirect(data.user)
            }
            
            // Marquer que l'utilisateur vient de se connecter
            sessionStorage.setItem('justLoggedIn', 'true')
            
            // Redirection
            const roleConfig = getRoleRedirect(data.user?.role)
            navigate(roleConfig.route, { 
              replace: true,
              state: { welcomeMessage: roleConfig.message }
            })
          }}
          onCancel={() => {
            setPinRequired(false)
            setTempToken('')
            setPinValue('')
            setError('')
            setLoading(false)
          }}
        />
      )}
    </div>
  )
}

export default Login

