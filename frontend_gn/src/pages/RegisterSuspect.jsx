import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCriminalFile } from '../services/criminalFilesService'
import { getNationalities, getCountries } from '../services/criminalFilesService'
import { 
  User, 
  Save, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle,
  Camera,
  Fingerprint,
  MapPin,
  Phone,
  Mail,
  Calendar,
  FileText
} from 'lucide-react'

const RegisterSuspect = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    nom_jeune_fille: '',
    surnom: '',
    alias: '',
    date_naissance: '',
    lieu_naissance: '',
    nationalite: '',
    cin: '',
    contact: '',
    sexe: '',
    situation_familiale: '',
    nombre_enfants: 0,
    adresse_actuelle: '',
    ville_actuelle: '',
    code_postal_actuel: '',
    pays_actuel: '',
    profession: '',
    employeur: '',
    taille: '',
    poids: '',
    couleur_yeux: '',
    couleur_cheveux: '',
    signes_particuliers: '',
    tatouages: '',
    cicatrices: '',
    niveau_danger: 1,
    confidentiel: false,
    niveau_confidentialite: 'STANDARD'
  })
  const [nationalities, setNationalities] = useState([])
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [fingerprintFile, setFingerprintFile] = useState(null)

  // Charger les données de référence
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [nationalitiesData, countriesData] = await Promise.all([
          getNationalities(),
          getCountries()
        ])
        setNationalities(nationalitiesData.data || nationalitiesData)
        setCountries(countriesData.data || countriesData)
      } catch (error) {
        console.error('Erreur chargement données de référence:', error)
      }
    }
    loadReferenceData()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files[0]
    if (type === 'photo') {
      setPhotoFile(file)
    } else if (type === 'fingerprint') {
      setFingerprintFile(file)
    }
  }

  const formatCIN = (value) => {
    // Supprimer tous les espaces et caractères non numériques
    const cleanValue = value.replace(/\D/g, '')
    // Limiter à 12 chiffres
    const limitedValue = cleanValue.slice(0, 12)
    // Formater avec des espaces tous les 3 chiffres
    return limitedValue.replace(/(\d{3})(?=\d)/g, '$1 ')
  }

  const formatContact = (value) => {
    // Supprimer tous les espaces et caractères non numériques sauf le +
    let cleanValue = value.replace(/[^\d+]/g, '')
    
    // S'assurer que ça commence par +
    if (!cleanValue.startsWith('+')) {
      cleanValue = '+' + cleanValue.replace(/\+/g, '')
    }
    
    // Supprimer le + pour le traitement
    const digits = cleanValue.slice(1)
    
    // Limiter à 12 chiffres après le +
    const limitedDigits = digits.slice(0, 12)
    
    if (limitedDigits.length === 0) return ''
    
    // Formater : +261 32 55 867 98
    if (limitedDigits.length <= 3) {
      return '+' + limitedDigits
    } else if (limitedDigits.length <= 5) {
      return '+' + limitedDigits.slice(0, 3) + ' ' + limitedDigits.slice(3)
    } else if (limitedDigits.length <= 7) {
      return '+' + limitedDigits.slice(0, 3) + ' ' + limitedDigits.slice(3, 5) + ' ' + limitedDigits.slice(5)
    } else if (limitedDigits.length <= 10) {
      return '+' + limitedDigits.slice(0, 3) + ' ' + limitedDigits.slice(3, 5) + ' ' + limitedDigits.slice(5, 7) + ' ' + limitedDigits.slice(7)
    } else {
      return '+' + limitedDigits.slice(0, 3) + ' ' + limitedDigits.slice(3, 5) + ' ' + limitedDigits.slice(5, 7) + ' ' + limitedDigits.slice(7, 10) + ' ' + limitedDigits.slice(10)
    }
  }

  const handleCINChange = (e) => {
    const formatted = formatCIN(e.target.value)
    setFormData(prev => ({ ...prev, cin: formatted }))
  }

  const handleContactChange = (e) => {
    const formatted = formatContact(e.target.value)
    setFormData(prev => ({ ...prev, contact: formatted }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createCriminalFile(formData)
      if (result.success) {
        setSuccess(true)
        console.log(` Suspect ${formData.prenom} ${formData.nom} added to case ${result.data.numero_fiche}`)
        
        // Rediriger vers la liste des suspects après 2 secondes
        setTimeout(() => {
          navigate('/suspects')
        }, 2000)
      }
    } catch (error) {
      setError(error.message || 'Erreur lors de l\'enregistrement du suspect')
      console.error('Erreur enregistrement suspect:', error)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Suspect enregistré !
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Le suspect a été enregistré avec succès. Vous allez être redirigé vers la liste des suspects.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <User className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Enregistrer un suspect
                </h1>
                <p className="text-gray-600">
                  Créer une nouvelle fiche criminelle
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* Informations personnelles */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Informations personnelles
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="prenom" className="block text-sm font-medium text-gray-700">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    id="prenom"
                    name="prenom"
                    required
                    value={formData.prenom}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="nom" className="block text-sm font-medium text-gray-700">
                    Nom *
                  </label>
                  <input
                    type="text"
                    id="nom"
                    name="nom"
                    required
                    value={formData.nom}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="nom_jeune_fille" className="block text-sm font-medium text-gray-700">
                    Nom de jeune fille
                  </label>
                  <input
                    type="text"
                    id="nom_jeune_fille"
                    name="nom_jeune_fille"
                    value={formData.nom_jeune_fille}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="surnom" className="block text-sm font-medium text-gray-700">
                    Surnom
                  </label>
                  <input
                    type="text"
                    id="surnom"
                    name="surnom"
                    value={formData.surnom}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="date_naissance" className="block text-sm font-medium text-gray-700">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    id="date_naissance"
                    name="date_naissance"
                    value={formData.date_naissance}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="lieu_naissance" className="block text-sm font-medium text-gray-700">
                    Lieu de naissance
                  </label>
                  <input
                    type="text"
                    id="lieu_naissance"
                    name="lieu_naissance"
                    value={formData.lieu_naissance}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Identification */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Identification
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="cin" className="block text-sm font-medium text-gray-700">
                    CIN (Format: 501 031 032 108)
                  </label>
                  <input
                    type="text"
                    id="cin"
                    name="cin"
                    value={formData.cin}
                    onChange={handleCINChange}
                    placeholder="501 031 032 108"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="nationalite" className="block text-sm font-medium text-gray-700">
                    Nationalité
                  </label>
                  <select
                    id="nationalite"
                    name="nationalite"
                    value={formData.nationalite}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Sélectionner une nationalité</option>
                    {nationalities.map(nationality => (
                      <option key={nationality.id} value={nationality.id}>
                        {nationality.nom_francais}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact" className="block text-sm font-medium text-gray-700">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Contact (Format: +261 32 55 867 98)
                  </label>
                  <input
                    type="tel"
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleContactChange}
                    placeholder="+261 __ ___ __"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="sexe" className="block text-sm font-medium text-gray-700">
                    Sexe
                  </label>
                  <select
                    id="sexe"
                    name="sexe"
                    value={formData.sexe}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Sélectionner</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Adresse */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Adresse actuelle
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="adresse_actuelle" className="block text-sm font-medium text-gray-700">
                    Adresse complète
                  </label>
                  <textarea
                    id="adresse_actuelle"
                    name="adresse_actuelle"
                    rows={2}
                    value={formData.adresse_actuelle}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="ville_actuelle" className="block text-sm font-medium text-gray-700">
                    Ville
                  </label>
                  <input
                    type="text"
                    id="ville_actuelle"
                    name="ville_actuelle"
                    value={formData.ville_actuelle}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="pays_actuel" className="block text-sm font-medium text-gray-700">
                    Pays
                  </label>
                  <select
                    id="pays_actuel"
                    name="pays_actuel"
                    value={formData.pays_actuel}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Sélectionner un pays</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.nom_francais}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Description physique */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Description physique
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="taille" className="block text-sm font-medium text-gray-700">
                    Taille (cm)
                  </label>
                  <input
                    type="number"
                    id="taille"
                    name="taille"
                    value={formData.taille}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="poids" className="block text-sm font-medium text-gray-700">
                    Poids (kg)
                  </label>
                  <input
                    type="number"
                    id="poids"
                    name="poids"
                    value={formData.poids}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="couleur_yeux" className="block text-sm font-medium text-gray-700">
                    Couleur des yeux
                  </label>
                  <input
                    type="text"
                    id="couleur_yeux"
                    name="couleur_yeux"
                    value={formData.couleur_yeux}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="couleur_cheveux" className="block text-sm font-medium text-gray-700">
                    Couleur des cheveux
                  </label>
                  <input
                    type="text"
                    id="couleur_cheveux"
                    name="couleur_cheveux"
                    value={formData.couleur_cheveux}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="niveau_danger" className="block text-sm font-medium text-gray-700">
                    Niveau de danger
                  </label>
                  <select
                    id="niveau_danger"
                    name="niveau_danger"
                    value={formData.niveau_danger}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value={1}>Faible</option>
                    <option value={2}>Moyen</option>
                    <option value={3}>Élevé</option>
                    <option value={4}>Critique</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="signes_particuliers" className="block text-sm font-medium text-gray-700">
                    Signes particuliers
                  </label>
                  <textarea
                    id="signes_particuliers"
                    name="signes_particuliers"
                    rows={2}
                    value={formData.signes_particuliers}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="tatouages" className="block text-sm font-medium text-gray-700">
                    Tatouages
                  </label>
                  <textarea
                    id="tatouages"
                    name="tatouages"
                    rows={2}
                    value={formData.tatouages}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="cicatrices" className="block text-sm font-medium text-gray-700">
                    Cicatrices
                  </label>
                  <textarea
                    id="cicatrices"
                    name="cicatrices"
                    rows={2}
                    value={formData.cicatrices}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Biométrie */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Données biométriques
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="photo" className="block text-sm font-medium text-gray-700">
                    <Camera className="inline h-4 w-4 mr-1" />
                    Photo du suspect
                  </label>
                  <input
                    type="file"
                    id="photo"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'photo')}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {photoFile && (
                    <p className="mt-1 text-sm text-green-600">
                      Fichier sélectionné: {photoFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="fingerprint" className="block text-sm font-medium text-gray-700">
                    <Fingerprint className="inline h-4 w-4 mr-1" />
                    Empreinte digitale
                  </label>
                  <input
                    type="file"
                    id="fingerprint"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'fingerprint')}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {fingerprintFile && (
                    <p className="mt-1 text-sm text-green-600">
                      Fichier sélectionné: {fingerprintFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Confidentialité */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confidentialité
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="niveau_confidentialite" className="block text-sm font-medium text-gray-700">
                    Niveau de confidentialité
                  </label>
                  <select
                    id="niveau_confidentialite"
                    name="niveau_confidentialite"
                    value={formData.niveau_confidentialite}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="STANDARD">Standard</option>
                    <option value="CONFIDENTIEL">Confidentiel</option>
                    <option value="SECRET">Secret</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="confidentiel"
                    name="confidentiel"
                    checked={formData.confidentiel}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="confidentiel" className="ml-2 block text-sm text-gray-900">
                    Marquer comme confidentiel
                  </label>
                </div>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Erreur d'enregistrement
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Enregistrement...' : 'Enregistrer le suspect'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterSuspect
