import { useState, useRef, useEffect } from 'react'
import { User, Mail, Phone, Lock, Camera, Upload, X, CheckCircle, AlertCircle, Eye, EyeOff, Loader2, ShieldCheck, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ChampTexte from '../../components/commun/ChampTexte'
import Bouton from '../../components/commun/Bouton'
import { formatPhoneNumber } from '../utils/phoneUtils'
import { changePassword, updateUser, getCurrentUser } from '../services/authService'
import api from '../services/api'
import PinManagement from '../components/pin/PinManagement'

const Profil = () => {
  const { utilisateur } = useAuth()
  const [ongletActif, setOngletActif] = useState('infos')
  const [photoProfil, setPhotoProfil] = useState(null)
  const [photoProfilSauvegardee, setPhotoProfilSauvegardee] = useState(null) // Photo déjà sauvegardée
  const [afficherModalPhoto, setAfficherModalPhoto] = useState(false)
  const [erreurPhoto, setErreurPhoto] = useState('')
  const [succesPhoto, setSuccesPhoto] = useState('')
  const fileInputRef = useRef(null)
  
  // États pour afficher/masquer les mots de passe
  const [afficherAncienMdp, setAfficherAncienMdp] = useState(false)
  const [afficherNouveauMdp, setAfficherNouveauMdp] = useState(false)
  const [afficherConfirmerMdp, setAfficherConfirmerMdp] = useState(false)
  
  // États pour la gestion des formulaires
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [erreursMdp, setErreursMdp] = useState({})
  
  const [formData, setFormData] = useState({
    nom: utilisateur?.nom || '',
    prenom: utilisateur?.prenom || '',
    email: utilisateur?.email || '',
    telephone: utilisateur?.telephone || '+261 ',
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
    confirmerMotDePasse: '',
  })

  // Initialiser les données du formulaire avec les données utilisateur
  useEffect(() => {
    if (utilisateur) {
      // Fonction pour formater le numéro de téléphone à l'affichage
      const formatTelephoneForDisplay = (phone) => {
        if (!phone) return '+261 '
        
        // Si le numéro commence déjà par +261, on le garde
        if (phone.startsWith('+261')) {
          // Nettoyer et reformater - format: +261 XX XXX XX (7 chiffres après +261)
          const cleaned = phone.replace(/\D/g, '') // Enlever tout sauf chiffres
          const digitsAfter261 = cleaned.startsWith('261') ? cleaned.substring(3) : cleaned // Retirer 261 si présent
          
          let formatted = '+261'
          if (digitsAfter261.length > 0) {
            formatted += ' ' + digitsAfter261.substring(0, 2) // 2 premiers chiffres
          }
          if (digitsAfter261.length > 2) {
            formatted += ' ' + digitsAfter261.substring(2, 5) // 3 suivants
          }
          if (digitsAfter261.length > 5) {
            formatted += ' ' + digitsAfter261.substring(5, 7) // 2 derniers
          }
          
          return formatted
        }
        
        return phone || '+261 '
      }
      
      setFormData(prev => ({
        ...prev,
        nom: utilisateur.nom || '',
        prenom: utilisateur.prenom || '',
        email: utilisateur.email || '',
        telephone: formatTelephoneForDisplay(utilisateur.telephone),
      }))

      // Charger la photo de profil si elle existe
      if (utilisateur.photo_profil) {
        // Construire l'URL complète de la photo
        const photoUrl = utilisateur.photo_profil.startsWith('http') 
          ? utilisateur.photo_profil 
          : `${window.location.origin}${utilisateur.photo_profil.startsWith('/') ? '' : '/'}${utilisateur.photo_profil}`
        
        const photoData = {
          url: photoUrl,
          nom: 'Photo de profil',
          taille: 0,
        }
        setPhotoProfil(photoData)
        setPhotoProfilSauvegardee(photoData) // Sauvegarder la photo actuelle
      } else {
        setPhotoProfil(null)
        setPhotoProfilSauvegardee(null)
      }
    }
  }, [utilisateur])

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'telephone') {
      // Formater le numéro avec préfixe +261 fixe
      const cleaned = value.replace(/\D/g, '') // Garder seulement les chiffres
      
      // Si l'utilisateur essaie de supprimer le préfixe, on le remet
      if (!value.startsWith('+261')) {
        setFormData(prev => ({ ...prev, [name]: '+261 ' }))
        return
      }
      
      // Extraire les chiffres après +261
      const digitsAfter261 = cleaned.startsWith('261') ? cleaned.substring(3) : cleaned // Retirer 261 si présent
      
      // Formater selon le pattern: +261 XX XXX XX (7 chiffres après +261)
      let formatted = '+261'
      if (digitsAfter261.length > 0) {
        formatted += ' ' + digitsAfter261.substring(0, 2) // 2 premiers chiffres
      }
      if (digitsAfter261.length > 2) {
        formatted += ' ' + digitsAfter261.substring(2, 5) // 3 suivants
      }
      if (digitsAfter261.length > 5) {
        formatted += ' ' + digitsAfter261.substring(5, 7) // 2 derniers
      }
      
      setFormData(prev => ({ ...prev, [name]: formatted }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // Fonction pour annuler les modifications du profil
  const handleAnnulerProfil = async () => {
    setErreur('')
    setSucces('')
    
    try {
      // Recharger les données depuis le serveur pour annuler les modifications
      await rechargerDonneesUtilisateur()
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error)
    }
  }

  // Fonction pour recharger les données utilisateur depuis le serveur
  const rechargerDonneesUtilisateur = async () => {
    try {
      const userData = await getCurrentUser()
      
      // Fonction pour formater le téléphone
      const formatTelephoneForDisplay = (phone) => {
        if (!phone) return '+261 '
        
        if (phone.startsWith('+261')) {
          const cleaned = phone.replace(/\D/g, '') // Enlever tout sauf chiffres
          const digitsAfter261 = cleaned.startsWith('261') ? cleaned.substring(3) : cleaned // Retirer 261 si présent
          let formatted = '+261'
          if (digitsAfter261.length > 0) formatted += ' ' + digitsAfter261.substring(0, 2) // 2 premiers
          if (digitsAfter261.length > 2) formatted += ' ' + digitsAfter261.substring(2, 5) // 3 suivants
          if (digitsAfter261.length > 5) formatted += ' ' + digitsAfter261.substring(5, 7) // 2 derniers
          return formatted
        }
        
        return phone || '+261 '
      }
      
      // Mettre à jour le formulaire avec les nouvelles données
      setFormData({
        nom: userData.nom || '',
        prenom: userData.prenom || '',
        email: userData.email || '',
        telephone: formatTelephoneForDisplay(userData.telephone),
        ancienMotDePasse: '',
        nouveauMotDePasse: '',
        confirmerMotDePasse: '',
      })
      
      // Mettre à jour la photo de profil si elle existe
      if (userData.photo_profil) {
        const photoUrl = userData.photo_profil.startsWith('http') 
          ? userData.photo_profil 
          : `${window.location.origin}${userData.photo_profil.startsWith('/') ? '' : '/'}${userData.photo_profil}`
        
        const photoData = {
          url: photoUrl,
          nom: 'Photo de profil',
          taille: 0,
        }
        setPhotoProfil(photoData)
        setPhotoProfilSauvegardee(photoData)
      } else {
        setPhotoProfil(null)
        setPhotoProfilSauvegardee(null)
      }
      
      return userData
    } catch (error) {
      console.error('Erreur lors du rechargement des données:', error)
      throw error
    }
  }

  // Fonction pour sauvegarder la photo de profil
  const handleSauvegarderPhoto = async () => {
    if (!photoProfil || !photoProfil.file) {
      setErreurPhoto('Aucune photo à sauvegarder')
      return
    }

    setChargement(true)
    setErreurPhoto('')
    setSuccesPhoto('')

    try {
      const formDataPhoto = new FormData()
      formDataPhoto.append('photo_profil_upload', photoProfil.file)

      // Ne pas définir Content-Type manuellement - l'intercepteur Axios le gère automatiquement pour FormData
      const response = await api.patch(`/utilisateur/utilisateurs/${utilisateur.id}/`, formDataPhoto)

      const data = response.data
      
      // Recharger les données utilisateur depuis le serveur
      await rechargerDonneesUtilisateur()
      
      // Mettre à jour la photo affichée
      if (data.photo_profil) {
        const photoData = {
          url: data.photo_profil,
          nom: 'Photo de profil',
          taille: photoProfil.taille || 0,
        }
        console.log('Photo sauvegardée avec succès:', photoData)
        setPhotoProfil(photoData)
        setPhotoProfilSauvegardee(photoData) // Mettre à jour la photo sauvegardée
      } else {
        // Si pas de photo retournée, recharger depuis le serveur
        const userData = await rechargerDonneesUtilisateur()
        if (userData && userData.photo_profil) {
          const photoUrl = userData.photo_profil.startsWith('http') 
            ? userData.photo_profil 
            : `${window.location.origin}${userData.photo_profil.startsWith('/') ? '' : '/'}${userData.photo_profil}`
          const photoData = {
            url: photoUrl,
            nom: 'Photo de profil',
            taille: 0,
          }
          setPhotoProfil(photoData)
          setPhotoProfilSauvegardee(photoData)
        }
      }

      setSuccesPhoto('Photo de profil sauvegardée avec succès !')
      
      setTimeout(() => {
        setAfficherModalPhoto(false)
        setSuccesPhoto('')
      }, 2000)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la photo:', error)
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail || 
                          error.message || 
                          'Erreur lors de la sauvegarde de la photo'
      setErreurPhoto(errorMessage)
    } finally {
      setChargement(false)
    }
  }

  // Fonction pour sauvegarder les informations du profil
  const handleSauvegarderProfil = async () => {
    setChargement(true)
    setErreur('')
    setSucces('')
    
    try {
      // Nettoyer le numéro de téléphone (enlever les espaces pour l'envoi)
      const telephoneCleaned = formData.telephone.replace(/\s/g, '')
      
      const dataToUpdate = {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: telephoneCleaned,
      }
      
      await updateUser(utilisateur.id, dataToUpdate)
      
      // Recharger les données utilisateur depuis le serveur
      await rechargerDonneesUtilisateur()
      
      setSucces('Profil mis à jour avec succès !')
      
      // Effacer le message de succès après 5 secondes
      setTimeout(() => setSucces(''), 5000)
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error)
      const messageErreur = error.message || 'Erreur lors de la mise à jour du profil'
      setErreur(messageErreur)
    } finally {
      setChargement(false)
    }
  }

  // Fonction pour annuler les modifications du mot de passe
  const handleAnnulerMotDePasse = () => {
    setFormData({
      ...formData,
      ancienMotDePasse: '',
      nouveauMotDePasse: '',
      confirmerMotDePasse: '',
    })
    
    setErreur('')
    setSucces('')
    setErreursMdp({})
    
    // Réinitialiser l'affichage des mots de passe
    setAfficherAncienMdp(false)
    setAfficherNouveauMdp(false)
    setAfficherConfirmerMdp(false)
  }

  // Fonction pour changer le mot de passe
  const handleChangerMotDePasse = async () => {
    setChargement(true)
    setErreur('')
    setSucces('')
    setErreursMdp({})
    
    // Validation côté client
    if (!formData.ancienMotDePasse) {
      setErreur('Veuillez entrer votre ancien mot de passe')
      setChargement(false)
      return
    }
    
    if (!formData.nouveauMotDePasse) {
      setErreur('Veuillez entrer un nouveau mot de passe')
      setChargement(false)
      return
    }
    
    if (!formData.confirmerMotDePasse) {
      setErreur('Veuillez confirmer votre nouveau mot de passe')
      setChargement(false)
      return
    }
    
    if (formData.nouveauMotDePasse !== formData.confirmerMotDePasse) {
      setErreur('Les mots de passe ne correspondent pas')
      setChargement(false)
      return
    }
    
    try {
      await changePassword({
        old_password: formData.ancienMotDePasse,
        new_password: formData.nouveauMotDePasse,
        confirm_password: formData.confirmerMotDePasse,
      })
      
      setSucces('Mot de passe modifié avec succès !')
      
      // Recharger les données utilisateur (pour rafraîchir toutes les infos)
      await rechargerDonneesUtilisateur()
      
      // Les champs de mot de passe sont déjà réinitialisés dans rechargerDonneesUtilisateur
      
      // Effacer le message de succès après 5 secondes
      setTimeout(() => setSucces(''), 5000)
      
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error)
      
      // Gérer les erreurs spécifiques aux champs
      if (error.errors) {
        setErreursMdp(error.errors)
      }
      
      const messageErreur = error.message || 'Erreur lors du changement de mot de passe'
      setErreur(messageErreur)
    } finally {
      setChargement(false)
    }
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setErreurPhoto('')
    setSuccesPhoto('')

    const formatsAcceptes = ['image/jpeg', 'image/png', 'image/jpg']
    if (!formatsAcceptes.includes(file.type)) {
      setErreurPhoto('Format non accepté. Utilisez JPG ou PNG.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErreurPhoto('La photo ne doit pas dépasser 5 MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoProfil({
        file: file,
        url: reader.result,
        nom: file.name,
        taille: file.size,
      })
      setSuccesPhoto('Photo sélectionnée avec succès !')
      // Ne pas fermer automatiquement la modal - laisser l'utilisateur décider de sauvegarder ou annuler
    }
    reader.readAsDataURL(file)
  }

  const supprimerPhoto = () => {
    setPhotoProfil(null)
    setErreurPhoto('')
    setSuccesPhoto('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Fonction pour annuler les modifications de la photo
  const handleAnnulerPhoto = () => {
    console.log('Annulation - photoProfilSauvegardee:', photoProfilSauvegardee)
    console.log('Annulation - photoProfil actuel:', photoProfil)
    
    // Restaurer la photo sauvegardée (ou null si aucune photo n'était sauvegardée)
    if (photoProfilSauvegardee) {
      // Créer une copie propre sans le fichier
      const photoRestoree = {
        url: photoProfilSauvegardee.url,
        nom: photoProfilSauvegardee.nom || 'Photo de profil',
        taille: photoProfilSauvegardee.taille || 0,
      }
      console.log('Restauration de la photo:', photoRestoree)
      setPhotoProfil(photoRestoree)
    } else {
      console.log('Aucune photo sauvegardée, suppression de la photo')
      setPhotoProfil(null)
    }
    setErreurPhoto('')
    setSuccesPhoto('')
    setAfficherModalPhoto(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatTaillePhoto = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
            <p className="text-gray-600 mt-1">Gérez vos informations personnelles</p>
          </div>
          <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 font-semibold text-sm">En ligne</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Carte profil */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                {photoProfil ? (
                  <img
                    src={photoProfil.url}
                    alt="Photo de profil"
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-600 shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {utilisateur?.nom?.charAt(0)}{utilisateur?.prenom?.charAt(0)}
                  </div>
                )}
                <button 
                  onClick={() => {
                    // Toujours restaurer la photo sauvegardée avant d'ouvrir la modal
                    // pour s'assurer qu'on part d'un état propre
                    if (photoProfilSauvegardee) {
                      setPhotoProfil({ 
                        url: photoProfilSauvegardee.url,
                        nom: photoProfilSauvegardee.nom || 'Photo de profil',
                        taille: photoProfilSauvegardee.taille || 0,
                      })
                    } else {
                      setPhotoProfil(null)
                    }
                    setErreurPhoto('')
                    setSuccesPhoto('')
                    setAfficherModalPhoto(true)
                  }}
                  className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2.5 hover:bg-blue-700 transition-colors shadow-lg border-2 border-white"
                  title="Modifier la photo de profil"
                >
                  <Camera size={16} className="text-white" />
                </button>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 text-center">
                {utilisateur?.nom} {utilisateur?.prenom}
              </h2>
              <div className="mt-2 px-3 py-1 bg-blue-100 rounded-full">
                <p className="text-blue-700 font-semibold text-sm">{utilisateur?.role}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Informations de contact</p>
                <div className="space-y-3">
                  <div className="flex items-start text-sm">
                    <Mail className="text-blue-600 mr-3 flex-shrink-0 mt-0.5" size={16} />
                    <span className="text-gray-700 break-all">{utilisateur?.email}</span>
                  </div>
                     {formData.telephone && formData.telephone !== '+261 ' && (
                       <div className="flex items-center text-sm">
                         <Phone className="text-green-600 mr-3 flex-shrink-0" size={16} />
                         <span className="text-gray-700">{formData.telephone}</span>
                       </div>
                     )}
                  <div className="flex items-center text-sm">
                    <ShieldCheck className="text-purple-600 mr-3 flex-shrink-0" size={16} />
                    <span className="text-gray-700">Gendarmerie Nationale</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaires */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-1 px-6">
                <button
                  onClick={() => setOngletActif('infos')}
                  className={`py-4 px-4 border-b-2 font-semibold text-sm transition-all flex items-center space-x-2 ${
                    ongletActif === 'infos'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User size={16} />
                  <span>Informations</span>
                </button>
                <button
                  onClick={() => setOngletActif('securite')}
                  className={`py-4 px-4 border-b-2 font-semibold text-sm transition-all flex items-center space-x-2 ${
                    ongletActif === 'securite'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Lock size={16} />
                  <span>Sécurité</span>
                </button>
              </nav>
            </div>

            <div className="p-8">
              {ongletActif === 'infos' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Informations personnelles
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Mettez à jour vos informations</p>
                    </div>
                  </div>

                  {/* Messages de succès/erreur */}
                  {succes && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r flex items-center">
                      <CheckCircle className="text-green-600 mr-3 flex-shrink-0" size={20} />
                      <p className="text-green-700 text-sm font-medium">{succes}</p>
                    </div>
                  )}

                  {erreur && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex items-center">
                      <AlertCircle className="text-red-600 mr-3 flex-shrink-0" size={20} />
                      <p className="text-red-700 text-sm font-medium">{erreur}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChampTexte
                      label="Nom"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      icone={User}
                    />
                    <ChampTexte
                      label="Prénom"
                      name="prenom"
                      value={formData.prenom}
                      onChange={handleChange}
                      icone={User}
                    />
                    <ChampTexte
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      icone={Mail}
                    />
                           <ChampTexte
                             label="Téléphone"
                             name="telephone"
                             value={formData.telephone}
                             onChange={handleChange}
                             icone={Phone}
                             placeholder="+261 __ ___ __"
                             maxLength={15}
                           />
                  </div>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      Les modifications seront enregistrées après validation
                    </p>
                    <div className="flex space-x-3">
                      <button 
                        onClick={handleAnnulerProfil}
                        className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                        disabled={chargement}
                      >
                        Annuler
                      </button>
                      <Bouton 
                        variant="primary" 
                        onClick={handleSauvegarderProfil}
                        disabled={chargement}
                      >
                        {chargement ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="animate-spin" size={16} />
                            <span>Enregistrement...</span>
                          </div>
                        ) : (
                          'Sauvegarder les modifications'
                        )}
                      </Bouton>
                    </div>
                  </div>
                </div>
              )}

              {ongletActif === 'securite' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Sécurité du compte
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Modifiez votre mot de passe</p>
                    </div>
                  </div>

                  {/* Messages de succès/erreur */}
                  {succes && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r flex items-center">
                      <CheckCircle className="text-green-600 mr-3 flex-shrink-0" size={20} />
                      <p className="text-green-700 text-sm font-medium">{succes}</p>
                    </div>
                  )}

                  {erreur && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex items-center">
                      <AlertCircle className="text-red-600 mr-3 flex-shrink-0" size={20} />
                      <p className="text-red-700 text-sm font-medium">{erreur}</p>
                    </div>
                  )}

                  <div className="space-y-5 max-w-2xl">
                    {/* Ancien mot de passe */}
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ancien mot de passe
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="text-gray-400" size={18} />
                        </div>
                        <input
                          type={afficherAncienMdp ? "text" : "password"}
                          name="ancienMotDePasse"
                          value={formData.ancienMotDePasse}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                            erreursMdp.old_password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setAfficherAncienMdp(!afficherAncienMdp)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {afficherAncienMdp ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {erreursMdp.old_password && (
                        <p className="mt-1 text-sm text-red-600">{erreursMdp.old_password}</p>
                      )}
                    </div>

                    {/* Nouveau mot de passe */}
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="text-gray-400" size={18} />
                        </div>
                        <input
                          type={afficherNouveauMdp ? "text" : "password"}
                          name="nouveauMotDePasse"
                          value={formData.nouveauMotDePasse}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                            erreursMdp.new_password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setAfficherNouveauMdp(!afficherNouveauMdp)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {afficherNouveauMdp ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {erreursMdp.new_password && (
                        <p className="mt-1 text-sm text-red-600">{erreursMdp.new_password}</p>
                      )}
                    </div>

                    {/* Confirmer mot de passe */}
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirmer le nouveau mot de passe
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="text-gray-400" size={18} />
                        </div>
                        <input
                          type={afficherConfirmerMdp ? "text" : "password"}
                          name="confirmerMotDePasse"
                          value={formData.confirmerMotDePasse}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                            erreursMdp.confirm_password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setAfficherConfirmerMdp(!afficherConfirmerMdp)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {afficherConfirmerMdp ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {erreursMdp.confirm_password && (
                        <p className="mt-1 text-sm text-red-600">{erreursMdp.confirm_password}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      Votre mot de passe doit être différent des précédents
                    </p>
                    <div className="flex space-x-3">
                      <button 
                        onClick={handleAnnulerMotDePasse}
                        className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                        disabled={chargement}
                      >
                        Annuler
                      </button>
                      <Bouton 
                        variant="primary" 
                        onClick={handleChangerMotDePasse}
                        disabled={chargement}
                      >
                        {chargement ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="animate-spin" size={16} />
                            <span>Changement...</span>
                          </div>
                        ) : (
                          'Changer le mot de passe'
                        )}
                      </Bouton>
                    </div>
                  </div>

                  {/* Section Gestion du PIN */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <PinManagement />
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Photo de Profil */}
      {afficherModalPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Camera className="text-white" size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Photo de profil</h2>
                    <p className="text-blue-100 text-xs">JPG ou PNG, max 5MB</p>
                  </div>
                </div>
                <button
                  onClick={handleAnnulerPhoto}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  title="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Corps */}
            <div className="p-6 space-y-4">
              {/* Messages */}
              {erreurPhoto && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex items-center">
                  <AlertCircle className="text-red-600 mr-3 flex-shrink-0" size={20} />
                  <p className="text-red-700 text-sm font-medium">{erreurPhoto}</p>
                </div>
              )}

              {succesPhoto && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r flex items-center">
                  <CheckCircle className="text-green-600 mr-3 flex-shrink-0" size={20} />
                  <p className="text-green-700 text-sm font-medium">{succesPhoto}</p>
                </div>
              )}

              {/* Aperçu actuel */}
              {photoProfil ? (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <img
                      src={photoProfil.url}
                      alt="Aperçu"
                      className="w-40 h-40 rounded-full object-cover mx-auto border-4 border-blue-600 shadow-lg"
                    />
                    <div className="mt-4 bg-gray-50 rounded-lg p-3 max-w-xs mx-auto">
                      <p className="text-xs text-gray-600 truncate font-medium">{photoProfil.nom}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatTaillePhoto(photoProfil.taille)}</p>
                    </div>
                  </div>
                  <button
                    onClick={supprimerPhoto}
                    className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg font-semibold hover:bg-red-100 transition-colors flex items-center justify-center space-x-2 border border-red-200"
                  >
                    <X size={18} />
                    <span>Supprimer la photo</span>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex flex-col items-center">
                    <div className="p-5 bg-blue-100 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="text-blue-600" size={28} />
                    </div>
                    <p className="text-blue-700 font-bold text-base mb-1">
                      Cliquez pour téléverser
                    </p>
                    <p className="text-gray-500 text-sm mb-4">
                      ou glissez-déposez votre photo ici
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className="px-3 py-1 bg-gray-100 rounded-full">JPG</span>
                      <span className="px-3 py-1 bg-gray-100 rounded-full">PNG</span>
                      <span className="px-3 py-1 bg-gray-100 rounded-full">Max 5MB</span>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Boutons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleAnnulerPhoto}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                {photoProfil && photoProfil.file && (
                  <button
                    onClick={handleSauvegarderPhoto}
                    disabled={chargement}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {chargement ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Sauvegarde...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        <span>Sauvegarder la photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profil
