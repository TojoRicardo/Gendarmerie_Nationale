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

"use client"

import React, { useState, useCallback } from 'react'
import { Eye, EyeOff, Lock, AlertCircle, User, ArrowRight, Loader2, Mail } from 'lucide-react'

// Mock hooks and functions for demo - replace with your actual imports
const useNavigate = () => (path, options) => console.log('Navigate to:', path)
const useAuth = () => ({ 
  connexion: async () => ({ success: true, utilisateur: { role: 'admin' } }), 
  providerReady: true, 
  mettreAJourUtilisateurDirect: () => {} 
})
const getRoleRedirect = (role) => ({ route: '/dashboard', message: 'Bienvenue!' })
const authServiceLogin = async (credentials) => ({ success: true, user: { role: 'admin' }, token: 'token' })
const saveAuthToken = (token) => {}
const saveUserData = (data) => {}
const saveRefreshToken = (token) => {}
const PinVerification = ({ tempToken, onSuccess, onCancel }) => null

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%)' }}>
      {/* Formes blob blanches en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blob en haut à droite */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/20 rounded-full blur-sm animate-blob"></div>
        {/* Blob en bas à gauche */}
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] bg-white/15 rounded-full blur-sm animate-blob animation-delay-2000"></div>
        {/* Blob au centre droite */}
        <div className="absolute top-1/3 -right-24 w-[300px] h-[300px] bg-white/10 rounded-full blur-sm animate-blob animation-delay-4000"></div>
      </div>

      {/* Carte principale à deux colonnes */}
      <div className="relative z-10 w-full max-w-4xl mx-auto animate-fade-in">
        <div className="bg-sky-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
          
          {/* Colonne gauche - Formulaire */}
          <div className="w-full lg:w-1/2 p-5 md:p-6 relative">
            {/* Forme blob décorative */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-sky-200/50 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="relative z-10">
              {/* Logo Gendarmerie Nationale */}
              <div className="flex justify-center mb-4">
                <img 
                  src="/image/logoGendarme.png" 
                  alt="Logo Gendarmerie Nationale" 
                  className="h-32 w-auto object-contain"
                />
              </div>

              {/* Titre */}
              <div className="text-center mb-5">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                  Système de Gestion Intelligente
                </h1>
                <p className="text-sky-600 text-sm font-medium">
                  Gendarmerie Nationale Madagascar
                </p>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Message d'erreur global */}
                {error && (
                  <div className={`p-4 rounded-xl border bg-white shadow-lg animate-slide-down ${
                    error.toLowerCase().includes('suspendu') 
                      ? 'border-orange-300 text-orange-900' 
                      : 'border-red-300 text-red-900'
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
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Identifiant
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className={`h-5 w-5 transition-colors ${
                        errors.email ? 'text-red-500' : 'text-gray-400'
                      }`} />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="text"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-12 pr-4 py-3.5 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 transition-all duration-200 ${
                        errors.email 
                          ? 'border-red-400 focus:border-red-500' 
                          : 'border-gray-200 focus:border-sky-400'
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
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mot passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className={`h-5 w-5 transition-colors ${
                        errors.password ? 'text-red-500' : 'text-gray-400'
                      }`} />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-12 pr-12 py-3.5 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 transition-all duration-200 ${
                        errors.password 
                          ? 'border-red-400 focus:border-red-500' 
                          : 'border-gray-200 focus:border-sky-400'
                      }`}
                      placeholder="Votre mot sur passe"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
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

                {/* Lien mot de passe oublié */}
                <div className="text-left">
                  <button type="button" className="text-sm text-gray-600 hover:text-sky-600 transition-colors">
                    Mot passe oublié ?
                  </button>
                </div>

                {/* Bouton de connexion */}
                <button
                  type="submit"
                  disabled={loading || !isFormValid || isSubmitting}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl group cursor-pointer"
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
              <div className="mt-5 pt-4">
                <p className="text-xs text-gray-500 text-center">
                  © 2023 Gendarmerie Nationale Madagascar - Système confidentiel
                </p>
              </div>
            </div>
          </div>

          {/* Colonne droite - Illustration */}
          <div className="w-full lg:w-1/2 bg-sky-400 p-5 md:p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Formes blob décoratives */}
            <div className="absolute top-4 right-4 w-24 h-24 bg-sky-300/50 rounded-full"></div>
            <div className="absolute bottom-20 left-4 w-16 h-16 bg-sky-300/50 rounded-full"></div>
            <div className="absolute top-1/3 left-8 w-12 h-12 bg-sky-300/30 rounded-full"></div>

            {/* Illustration SVG */}
            <div className="relative z-10 flex-1 flex items-center justify-center w-full">
              <svg viewBox="0 0 400 300" className="w-full max-w-md h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Lignes de connexion */}
                <path d="M100 80 L180 80 L180 140 L220 140" stroke="#0369a1" strokeWidth="2" strokeDasharray="4 4"/>
                <path d="M220 140 L280 140 L280 80 L340 80" stroke="#0369a1" strokeWidth="2" strokeDasharray="4 4"/>
                <path d="M220 140 L220 200 L180 200" stroke="#0369a1" strokeWidth="2" strokeDasharray="4 4"/>
                <path d="M280 140 L320 180" stroke="#0369a1" strokeWidth="2" strokeDasharray="4 4"/>
                
                {/* Cadenas principal */}
                <rect x="190" y="110" width="60" height="50" rx="8" fill="white" stroke="#0ea5e9" strokeWidth="2"/>
                <path d="M205 110 V95 A15 15 0 0 1 235 95 V110" stroke="#0ea5e9" strokeWidth="3" fill="none"/>
                <circle cx="220" cy="135" r="6" fill="#0ea5e9"/>
                
                {/* Bulle message gauche */}
                <rect x="60" y="60" width="80" height="40" rx="8" fill="white" stroke="#0ea5e9" strokeWidth="2"/>
                <line x1="75" y1="75" x2="120" y2="75" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
                <line x1="75" y1="85" x2="105" y2="85" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
                
                {/* Bulle message droite haut */}
                <rect x="300" y="50" width="70" height="50" rx="8" fill="white" stroke="#0ea5e9" strokeWidth="2"/>
                <line x1="315" y1="65" x2="355" y2="65" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
                <line x1="315" y1="78" x2="345" y2="78" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
                <line x1="315" y1="88" x2="335" y2="88" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round"/>
                
                {/* Petit cadenas */}
                <rect x="155" y="180" width="40" height="35" rx="6" fill="white" stroke="#0ea5e9" strokeWidth="2"/>
                <path d="M165 180 V170 A10 10 0 0 1 185 170 V180" stroke="#0ea5e9" strokeWidth="2" fill="none"/>
                <circle cx="175" cy="197" r="4" fill="#0ea5e9"/>
                
                {/* Graphique circulaire */}
                <circle cx="330" cy="190" r="25" fill="white" stroke="#0ea5e9" strokeWidth="2"/>
                <path d="M330 190 L330 165 A25 25 0 0 1 355 190 Z" fill="#0ea5e9"/>
                
                {/* Plateforme base */}
                <ellipse cx="200" cy="260" rx="100" ry="20" fill="#0369a1" opacity="0.3"/>
                
                {/* Personnage */}
                <circle cx="300" cy="210" r="12" fill="#fcd34d"/>
                <rect x="290" y="225" width="20" height="30" rx="4" fill="#1e3a5f"/>
                <rect x="285" y="255" width="8" height="15" rx="2" fill="#1e3a5f"/>
                <rect x="307" y="255" width="8" height="15" rx="2" fill="#1e3a5f"/>
                
                {/* Écran/Dashboard */}
                <rect x="240" y="220" width="45" height="50" rx="4" fill="white" stroke="#0ea5e9" strokeWidth="2"/>
                <rect x="248" y="228" width="12" height="8" fill="#22c55e" rx="1"/>
                <rect x="264" y="228" width="12" height="8" fill="#0ea5e9" rx="1"/>
                <rect x="248" y="240" width="28" height="3" fill="#cbd5e1" rx="1"/>
                <rect x="248" y="248" width="20" height="3" fill="#cbd5e1" rx="1"/>
                <rect x="248" y="256" width="24" height="3" fill="#cbd5e1" rx="1"/>
                
                {/* Plante décorative */}
                <rect x="110" y="245" width="15" height="20" rx="2" fill="#22c55e"/>
                <ellipse cx="117" cy="235" rx="12" ry="15" fill="#22c55e"/>
                <ellipse cx="110" cy="228" rx="8" ry="10" fill="#16a34a"/>
                <ellipse cx="125" cy="230" rx="7" ry="9" fill="#16a34a"/>
              </svg>
            </div>

            {/* Texte accrocheur */}
            <div className="relative z-10 text-center mt-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white italic leading-tight">
                Sécurisez vos opérations, simplifiez<br/>votre gestion.
              </h2>
            </div>

            {/* Indicateurs de pagination */}
            <div className="relative z-10 flex gap-2 mt-6">
              <div className="w-8 h-2 rounded-full bg-white/40"></div>
              <div className="w-8 h-2 rounded-full bg-white"></div>
              <div className="w-8 h-2 rounded-full bg-white/40"></div>
            </div>
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
            transform: translate(20px, -30px) scale(1.05);
          }
          66% {
            transform: translate(-15px, 15px) scale(0.95);
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
          animation: blob 12s infinite ease-in-out;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
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
