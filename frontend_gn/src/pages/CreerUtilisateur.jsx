import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, Save, X,
  Eye, EyeOff, CheckCircle2, AlertCircle, Lock, UserPlus, ArrowLeft,
  ShieldCheck, UserCog,
} from 'lucide-react'
import { formatPhoneNumber } from '../utils/phoneUtils'
import { useNotification } from '../context/NotificationContext'


// Utiliser le service authService au lieu d'une URL hardcodée
import { createUser as createUserService } from '../services/authService'

const CreerUtilisateur = () => {
  const navigate = useNavigate()
  const notification = useNotification()
  const [chargement, setChargement] = useState(false)
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false)
  const [afficherConfirmation, setAfficherConfirmation] = useState(false)
  const [forceMotDePasse, setForceMotDePasse] = useState(0)
  const [motsDePasseCorrespondent, setMotsDePasseCorrespondent] = useState(true)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmMotDePasse: '',
    matricule: '',
    grade: '',
    nom: '',
    prenom: '',
    telephone: '',
    dateNaissance: '',  // format ISO
    adresse: "",
    role: 'Observateur',
    statut: 'inactif'
  })

  const grades = [
    { value: '', label: 'Sélectionner un grade' },
    { value: 'GCA', label: 'GCA' },
    { value: 'GD', label: 'GD' },
    { value: 'GB', label: 'GB' },
    { value: 'Col', label: 'Col' },
    { value: 'LtCol', label: 'LtCol' },
    { value: 'CEN', label: 'CEN' },
    { value: 'CNE', label: 'CNE' },
    { value: 'Ltn', label: 'Ltn' },
    { value: 'SLTN', label: 'SLTN' },
    { value: 'Gpce', label: 'Gpce' },
    { value: 'Ghpc', label: 'Ghpc' },
    { value: 'Gp1c', label: 'Gp1c' },
    { value: 'Gp2c', label: 'Gp2c' },
    { value: 'GHC', label: 'GHC' },
    { value: 'G1C', label: 'G1C' },
    { value: 'G2C', label: 'G2C' },
    { value: 'Gst', label: 'Gst' }
  ];


  // Fonction pour formater le matricule (XX XXX)
  const formatMatricule = (value) => {
    // Enlever tous les caractères non numériques
    const cleaned = value.replace(/\D/g, '')
    
    // Limiter à 5 chiffres maximum
    const limited = cleaned.substring(0, 5)
    
    // Formater: XX XXX
    if (limited.length <= 2) {
      return limited
    } else {
      return limited.substring(0, 2) + ' ' + limited.substring(2)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    let finalValue = value
    
    // Formater selon le type de champ
    if (name === 'telephone') {
      finalValue = formatPhoneNumber(value)
    } else if (name === 'matricule') {
      finalValue = formatMatricule(value)
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }))

    // Vérifier la force du mot de passe
    if (name === 'password') {
      calculerForceMotDePasse(value)
    }

    // Vérifier si les mots de passe correspondent
    if (name === 'password' || name === 'confirmMotDePasse') {
      if (name === 'password') {
        setMotsDePasseCorrespondent(value === formData.confirmMotDePasse || formData.confirmMotDePasse === '')
      } else {
        setMotsDePasseCorrespondent(value === formData.password)
      }
    }
  }

  const calculerForceMotDePasse = (password) => {
    let force = 0
    if (password.length >= 6) force++
    if (password.length >= 8) force++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) force++
    if (/\d/.test(password)) force++
    if (/[^a-zA-Z0-9]/.test(password)) force++
    setForceMotDePasse(force)
  }

  const getCouleurForce = () => {
    if (forceMotDePasse <= 1) return 'bg-red-500'
    if (forceMotDePasse <= 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTexteForce = () => {
    if (forceMotDePasse === 0) return ''
    if (forceMotDePasse <= 1) return 'Faible'
    if (forceMotDePasse <= 3) return 'Moyen'
    return 'Fort'
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation des champs requis
    if (!formData.nom || !formData.prenom) {
      notification.showError('Le nom et le prénom sont obligatoires');
      return;
    }

    if (!formData.email) {
      notification.showError('L\'email est obligatoire');
      return;
    }

    if (!formData.matricule || formData.matricule.replace(/\s/g, '').length < 5) {
      notification.showError('Le matricule doit contenir 5 chiffres');
      return;
    }

    if (!formData.grade || formData.grade === '') {
      notification.showError('Le grade est obligatoire');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      notification.showError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    // Vérification que le mot de passe et sa confirmation correspondent
    if (formData.password !== formData.confirmMotDePasse) {
      notification.showError('Les deux mots de passe ne correspondent pas');
      return;
    }

    setChargement(true);

    const username = (formData.nom + formData.prenom)
      .replace(/\s+/g, '')
      .trim();

    try {
      // Préparer les données en nettoyant les champs formatés
      const dataToSend = {
        ...formData,
        username,
        matricule: formData.matricule.replace(/\s/g, ''), // Enlever les espaces
        telephone: formData.telephone.replace(/\s/g, ''), // Enlever les espaces
      }

      console.log('Données envoyées:', dataToSend)

      // Envoi de la requête POST vers le backend
      await createUserService(dataToSend);

      // Notification succès avec le nouveau type "create"
      notification.showCreate('Utilisateur créé avec succès');

      // Redirection après 1.5 secondes
      setTimeout(() => navigate('/utilisateurs'), 1500);
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      console.error('Réponse du serveur:', err.response?.data);
      console.error('Status:', err.response?.status);

      // Gérer les erreurs avec le gestionnaire centralisé
      const { getErrorMessage, isNetworkError } = await import('../utils/errorHandler')
      if (isNetworkError(err)) {
        const errorInfo = getErrorMessage(err)
        notification.showError(errorInfo.message)
        return;
      }

      if (err.response?.data) {
        const data = err.response.data;
        console.log('Données d\'erreur:', data);

        if (typeof data === 'object') {
          // Afficher chaque erreur de champ
          let erreurAffichee = false;
          Object.keys(data).forEach(field => {
            const messages = Array.isArray(data[field]) ? data[field].join(' ') : data[field];

            // Messages personnalisés selon le champ
            let messagePerso = '';
            switch (field) {
              case 'username':
                messagePerso = "Ce nom d'utilisateur existe déjà.";
                break;
              case 'email':
                messagePerso = "Cet email est déjà utilisé.";
                break;
              case 'contact':
                messagePerso = "Ce contact existe déjà.";
                break;
              case 'matricule':
                messagePerso = "Ce matricule existe déjà.";
                break;
              case 'password':
                messagePerso = `Mot de passe : ${messages}`;
                break;
              case 'non_field_errors':
                messagePerso = messages;
                break;
              default:
                messagePerso = `${field} : ${messages}`;
            }

            console.log(`Erreur champ [${field}]:`, messagePerso);
            notification.showError(messagePerso);
            erreurAffichee = true;
          });

          if (erreurAffichee) return;
        }
      }

      notification.showError("Impossible de créer l'utilisateur. Vérifiez les champs.");
    } finally {
      setChargement(false);
    }
  };



  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto px-4 py-6">
      {/* En-tête Amélioré */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 shadow-2xl" style={{ background: 'linear-gradient(to bottom right, #2984D1, #2984D1, #2984D1)' }}>
        {/* Pattern de fond */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="p-3 md:p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30">
              <UserPlus className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Nouveau Compte Utilisateur</h1>
              <p className="flex items-center space-x-2 text-sm md:text-base" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <ShieldCheck size={16} />
                <span className="hidden sm:inline">Création d'un compte sécurisé pour la Gendarmerie Nationale Malagasy</span>
                <span className="sm:hidden">Compte sécurisé</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/utilisateurs')}
            className="w-full md:w-auto px-5 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center space-x-2 border border-white/30"
          >
            <ArrowLeft size={20} />
            <span>Retour</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations personnelles */}
        <div className="relative bg-white rounded-2xl shadow-lg transition-all p-6 md:p-8">
          <div className="flex items-center space-x-3 mb-6 pb-4">
            <div className="p-3 rounded-xl shadow-lg" style={{ background: 'linear-gradient(to bottom right, #2984D1, #2984D1)' }}>
              <User className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Informations Personnelles</h2>
              <p className="text-xs md:text-sm text-gray-500">Identité et coordonnées de l'agent</p>
            </div>
          </div>

          {/* Ligne 1 : 3 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Matricule */}
            <div className="group">
              <label className="flex text-sm font-bold text-gray-700 mb-2 items-center space-x-2">
                <ShieldCheck size={16} style={{ color: '#2984D1' }} />
                <span>Matricule *</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="matricule"
                  value={formData.matricule}
                  onChange={handleChange}
                  placeholder="12 345"
                  maxLength={6}
                  className="input-pro w-full pl-4 pr-10 focus:ring-2"
                  style={{ '--tw-ring-color': '#2984D1', '--tw-border-color': '#2984D1' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2984D1';
                    e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '';
                    e.target.style.boxShadow = '';
                  }}
                  required
                />
                {formData.matricule && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={20} />
                )}
                <p className="text-xs text-gray-500 mt-1">Format: XX XXX (5 chiffres)</p>
              </div>
            </div>

            {/* Grade */}
            <div className="group">
              <label className="flex text-sm font-bold text-gray-700 mb-2 items-center space-x-2">
                <ShieldCheck size={16} style={{ color: '#2984D1' }} />
                <span>Grade *</span>
              </label>
              <select
                className="input-pro w-full focus:ring-2"
                style={{ '--tw-ring-color': '#2984D1', '--tw-border-color': '#2984D1' }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2984D1';
                  e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '';
                  e.target.style.boxShadow = '';
                }}
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                required
              >
                {grades.map((grade) => (
                  <option key={grade.value} value={grade.value}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Téléphone */}
            <div className="group">
              <label className="flex text-sm font-bold text-gray-700 mb-2 items-center space-x-2">
                <Phone size={16} className="text-green-600" />
                <span>Téléphone</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="+261 __ ___ __"
                  className="input-pro w-full pl-4 pr-10 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                {formData.telephone && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={20} />
                )}
              </div>
            </div>
          </div>

          {/* Ligne 2 et suivantes : 2 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Nom */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Nom de famille"
                className="input-pro w-full"
                required
              />
            </div>

            {/* Prénom */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                placeholder="Prénom"
                className="input-pro w-full"
                required
              />
            </div>

            {/* Date de naissance */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Date de naissance
              </label>
              <input
                type="date"
                name="dateNaissance"
                value={formData.dateNaissance}
                onChange={handleChange}
                className="input-pro w-full"
              />
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Adresse
              </label>
              <input
                type="text"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                placeholder="Adresse complète"
                className="input-pro w-full"
              />
            </div>
          </div>
        </div>


        {/* Informations de compte */}
        <div className="relative bg-white rounded-2xl shadow-lg transition-all p-6 md:p-8">
          <div className="flex items-center space-x-3 mb-6 pb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Lock className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Informations de Compte</h2>
              <p className="text-xs md:text-sm text-gray-500">Accès et permissions système</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="group">
              <label className="flex text-sm font-bold text-gray-700 mb-2 items-center space-x-2">
                <Mail size={16} style={{ color: '#2984D1' }} />
                <span>Email *</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="utilisateur@gendarmerie.mg"
                  className="input-pro w-full pl-4 pr-10 focus:ring-2"
                  style={{ '--tw-ring-color': '#2984D1', '--tw-border-color': '#2984D1' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2984D1';
                    e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '';
                    e.target.style.boxShadow = '';
                  }}
                  required
                />
                {formData.email && formData.email.includes('@') && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={20} />
                )}
              </div>
            </div>

            {/* Rôle */}
            <div className="group">
              <label className="flex text-sm font-bold text-gray-700 mb-2 items-center space-x-2">
                <UserCog size={16} style={{ color: '#2984D1' }} />
                <span>Rôle *</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input-pro w-full focus:ring-2"
                style={{ '--tw-ring-color': '#2984D1', '--tw-border-color': '#2984D1' }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2984D1';
                  e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '';
                  e.target.style.boxShadow = '';
                }}
                required
              >
                <option value="Observateur">Observateur</option>
                <option value="Analyste">Analyste</option>
                <option value="Enquêteur">Enquêteur</option>
                <option value="Administrateur">Administrateur</option>
              </select>
            </div>

            {/* Mot de passe */}
            <div className="group">
              <label className="flex text-sm font-bold text-gray-700 mb-2 items-center space-x-2">
                <Lock className="h-4 w-4 text-red-600" />
                <span>Mot de passe *</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                </div>
                <input
                  type={afficherMotDePasse ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-pro w-full pl-12 pr-12 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={() => setAfficherMotDePasse(!afficherMotDePasse)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                  aria-label={afficherMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {afficherMotDePasse ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {/* Indicateur de force */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Force du mot de passe</span>
                    <span className={`text-xs font-bold ${forceMotDePasse <= 1 ? 'text-red-600' : forceMotDePasse <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {getTexteForce()}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${i < forceMotDePasse ? getCouleurForce() : 'bg-gray-200'
                          }`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Utilisez 8+ caractères, majuscules, chiffres et symboles
                  </p>
                </div>
              )}
            </div>

            {/* Confirmer mot de passe */}
            <div className="group">
              <label className="flex text-sm font-bold text-gray-700 mb-2 items-center space-x-2">
                <Lock size={16} className="text-orange-600" />
                <span>Confirmer mot de passe *</span>
              </label>
              <div className="relative">
                <input
                  type={afficherConfirmation ? "text" : "password"}
                  name="confirmMotDePasse"
                  value={formData.confirmMotDePasse}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`input-pro w-full pl-4 pr-10 focus:ring-2 transition-all ${!motsDePasseCorrespondent && formData.confirmMotDePasse
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'focus:ring-orange-500 focus:border-orange-500'
                    }`}
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={() => setAfficherConfirmation(!afficherConfirmation)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {afficherConfirmation ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {formData.confirmMotDePasse && (
                <div className={`mt-2 flex items-center space-x-2 text-xs ${motsDePasseCorrespondent ? 'text-green-600' : 'text-red-600'}`}>
                  {motsDePasseCorrespondent ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Les mots de passe correspondent</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} />
                      <span>Les mots de passe ne correspondent pas</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/utilisateurs')}
            className="w-full sm:w-auto px-6 py-3 bg-white rounded-xl font-semibold text-gray-700 transition-all flex items-center justify-center space-x-2"
          >
            <X size={20} />
            <span>Annuler</span>
          </button>
          <button
            type="submit"
            disabled={chargement}
            className={`w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg ${
              chargement 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:from-emerald-700 hover:to-emerald-800 hover:scale-105'
            }`}
          >
            <Save size={20} />
            <span>{chargement ? 'Création en cours...' : 'Créer l\'utilisateur'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreerUtilisateur

