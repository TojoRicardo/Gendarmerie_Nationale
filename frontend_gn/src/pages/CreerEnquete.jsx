import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { createEnquete } from '../services/enqueteEnhancedService'
import { fetchTypesEnquete } from '../services/enqueteService'

const STATUT_OPTIONS = [
  { value: 'ouverte', label: 'Ouverte' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'suspendue', label: 'Suspendue' },
]

const PRIORITE_OPTIONS = [
  { value: 'faible', label: 'Faible' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'elevee', label: 'Élevée' },
  { value: 'critique', label: 'Critique' },
]

const CreerEnquete = () => {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  const [loading, setLoading] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [typesEnquete, setTypesEnquete] = useState([])
  const [typesGroupes, setTypesGroupes] = useState({})
  const [form, setForm] = useState({
    titre: '',
    type_enquete: '',
    niveau_priorite: 'moyen',
    statut: 'ouverte',
    date_ouverture: new Date().toISOString().split('T')[0],
    lieu_faits: '',
    description: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadTypesEnquete()
  }, [])

  const loadTypesEnquete = async () => {
    try {
      setLoadingTypes(true)
      const data = await fetchTypesEnquete()
      const typesArray = Array.isArray(data) ? data : data.results || []
      setTypesEnquete(typesArray)
      
      // Grouper les types par catégorie principale et sous-catégorie
      const groupes = {}
      
      typesArray.forEach((type) => {
        const ordre = type.ordre || 0
        
        // Extraire la sous-catégorie depuis la description
        let sousCategorie = 'Autres'
        let categoriePrincipale = 'autre'
        
        if (type.description && type.description.includes('Sous-catégorie:')) {
          const match = type.description.match(/Sous-catégorie:\s*([^\n]+)/)
          if (match) {
            sousCategorie = match[1].trim()
          }
        }
        
        // Déterminer la catégorie principale basée sur l'ordre
        if (ordre >= 10 && ordre < 20) {
          categoriePrincipale = 'judiciaire'
          sousCategorie = sousCategorie !== 'Autres' ? sousCategorie : 'Ouvertes sous l\'autorité judiciaire'
        } else if (ordre >= 200 && ordre < 300) {
          categoriePrincipale = 'administrative'
          sousCategorie = sousCategorie !== 'Autres' ? sousCategorie : 'Internes à l\'administration ou forces de sécurité'
        } else if (ordre >= 300 && ordre < 400) {
          categoriePrincipale = 'criminelle'
        } else if (ordre >= 400 && ordre < 500) {
          categoriePrincipale = 'technique'
        } else if (ordre >= 500 && ordre < 600) {
          categoriePrincipale = 'renseignement'
        } else if (ordre >= 600 && ordre < 700) {
          categoriePrincipale = 'protection'
        } else if (ordre >= 700 && ordre < 800) {
          categoriePrincipale = 'urgence'
        } else if (ordre >= 800) {
          categoriePrincipale = 'ia'
        }
        
        // Créer la structure de groupes
        if (!groupes[categoriePrincipale]) {
          groupes[categoriePrincipale] = {}
        }
        if (!groupes[categoriePrincipale][sousCategorie]) {
          groupes[categoriePrincipale][sousCategorie] = []
        }
        groupes[categoriePrincipale][sousCategorie].push(type)
      })
      
      // Supprimer les groupes vides
      Object.keys(groupes).forEach((key) => {
        const sousGroupes = groupes[key]
        Object.keys(sousGroupes).forEach((sousKey) => {
          if (sousGroupes[sousKey].length === 0) {
            delete sousGroupes[sousKey]
          }
        })
        if (Object.keys(sousGroupes).length === 0) {
          delete groupes[key]
        }
      })
      
      setTypesGroupes(groupes)
    } catch (error) {
      console.error('Erreur chargement types enquête:', error)
      showError("Erreur lors du chargement des types d'enquête.")
    } finally {
      setLoadingTypes(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!form.titre.trim()) {
      newErrors.titre = 'Le titre est requis'
    }

    if (!form.type_enquete) {
      newErrors.type_enquete = "Le type d'enquête est requis"
    }

    if (!form.niveau_priorite) {
      newErrors.niveau_priorite = 'La priorité est requise'
    }

    if (!form.date_ouverture) {
      newErrors.date_ouverture = "La date d'ouverture est requise"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      showError('Veuillez corriger les erreurs du formulaire.')
      return
    }

    setLoading(true)
    try {
      // Préparer les données pour l'API
      // Mapper les valeurs du frontend vers les valeurs attendues par le backend
      const statutMapping = {
        'ouverte': 'en_cours',
        'en_cours': 'en_cours',
        'suspendue': 'suspendue',
      }
      
      const prioriteMapping = {
        'faible': 'faible',
        'moyen': 'normale',
        'elevee': 'elevee',
        'critique': 'urgente',
      }
      
      const payload = {
        titre: form.titre,
        type_enquete: form.type_enquete || null, // ID de TypeEnquete (peut être null)
        type_enquete_code: 'plainte', // Valeur par défaut pour type_enquete_code (obligatoire dans le modèle: 'plainte', 'denonciation', 'constatation_directe')
        statut: statutMapping[form.statut] || 'en_cours', // Mapper vers les valeurs valides: 'en_cours', 'suspendue', 'cloturee', 'classee'
        priorite: prioriteMapping[form.niveau_priorite] || 'normale', // Le backend attend 'priorite' avec valeurs: 'faible', 'normale', 'elevee', 'urgente'
        date_ouverture: form.date_ouverture,
        lieu: form.lieu_faits || '',
        description: form.description || '',
      }

      const data = await createEnquete(payload)
      showSuccess('Enquête créée avec succès.')
      setTimeout(() => {
        navigate(`/enquetes/${data.id || data.uuid}`)
      }, 1000)
    } catch (error) {
      console.error('Erreur création enquête:', error)
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        "Impossible de créer l'enquête."
      showError(errorMessage)

      // Afficher les erreurs de validation
      if (error.response?.data) {
        const validationErrors = {}
        Object.keys(error.response.data).forEach((key) => {
          if (Array.isArray(error.response.data[key])) {
            validationErrors[key] = error.response.data[key][0]
          } else if (typeof error.response.data[key] === 'string') {
            validationErrors[key] = error.response.data[key]
          }
        })
        setErrors(validationErrors)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500 font-semibold">
              MODULE ENQUÊTE
            </p>
            <h1 className="mt-2 text-4xl font-bold text-slate-900">Créer une nouvelle enquête</h1>
            <p className="mt-2 text-base text-slate-600">
              Remplissez le formulaire pour créer une nouvelle enquête
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-6">
              {/* Titre */}
              <div>
                <label htmlFor="titre" className="block text-sm font-semibold text-slate-900 mb-2">
                  Titre de l'enquête <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="titre"
                  name="titre"
                  value={form.titre}
                  onChange={handleChange}
                  className={`w-full rounded-xl border ${
                    errors.titre ? 'border-red-300' : 'border-slate-200'
                  } bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100`}
                  placeholder="Ex: Affaire de vol à main armée"
                />
                {errors.titre && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.titre}
                  </p>
                )}
              </div>

              {/* Type d'enquête */}
              <div>
                <label
                  htmlFor="type_enquete"
                  className="block text-xs font-medium text-gray-700 mb-0.5"
                >
                  Type d'enquête <span className="text-red-500">*</span>
                </label>
                {loadingTypes ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Chargement des types...
                  </div>
                ) : (
                  <select
                    id="type_enquete"
                    name="type_enquete"
                    value={form.type_enquete}
                    onChange={handleChange}
                    className={`w-full px-2 py-1 text-xs border ${
                      errors.type_enquete ? 'border-red-300' : 'border-gray-300'
                    } rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white`}
                  >
                    <option value="">-- Sélectionner un type d'enquête --</option>
                    {Object.keys(typesGroupes).length > 0 ? (
                      Object.entries(typesGroupes).map(([categorie, sousGroupes]) => {
                        const labelsCategorie = {
                          'judiciaire': '🟦 Enquêtes judiciaires',
                          'administrative': '🟩 Enquêtes administratives',
                          'criminelle': '🟥 Enquêtes criminelles',
                          'technique': '🟨 Enquêtes spéciales / techniques',
                          'renseignement': '🟪 Enquêtes de renseignement',
                          'protection': '🟫 Enquêtes de protection et assistance',
                          'urgence': '⬛ Enquêtes d\'urgence et situations particulières',
                          'ia': '🧠 Enquêtes assistées par IA (moderne)',
                          'autre': 'Autres',
                        }
                        return Object.entries(sousGroupes).map(([sousCategorie, types]) => (
                          <optgroup key={`${categorie}-${sousCategorie}`} label={`${labelsCategorie[categorie] || categorie} - ${sousCategorie}`}>
                            {types.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.libelle}
                              </option>
                            ))}
                          </optgroup>
                        ))
                      }).flat()
                    ) : (
                      typesEnquete.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.libelle}
                        </option>
                      ))
                    )}
                  </select>
                )}
                {errors.type_enquete && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.type_enquete}
                  </p>
                )}
              </div>

              {/* Priorité et Statut */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="niveau_priorite"
                    className="block text-sm font-semibold text-slate-900 mb-2"
                  >
                    Niveau de priorité <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="niveau_priorite"
                    name="niveau_priorite"
                    value={form.niveau_priorite}
                    onChange={handleChange}
                    className={`w-full rounded-xl border ${
                      errors.niveau_priorite ? 'border-red-300' : 'border-slate-200'
                    } bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100`}
                  >
                    {PRIORITE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.niveau_priorite && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.niveau_priorite}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="statut" className="block text-sm font-semibold text-slate-900 mb-2">
                    Statut <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="statut"
                    name="statut"
                    value={form.statut}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  >
                    {STATUT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date d'ouverture */}
              <div>
                <label
                  htmlFor="date_ouverture"
                  className="block text-sm font-semibold text-slate-900 mb-2"
                >
                  Date d'ouverture <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date_ouverture"
                  name="date_ouverture"
                  value={form.date_ouverture}
                  onChange={handleChange}
                  className={`w-full rounded-xl border ${
                    errors.date_ouverture ? 'border-red-300' : 'border-slate-200'
                  } bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100`}
                />
                {errors.date_ouverture && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.date_ouverture}
                  </p>
                )}
              </div>

              {/* Lieu des faits */}
              <div>
                <label htmlFor="lieu_faits" className="block text-sm font-semibold text-slate-900 mb-2">
                  Lieu des faits
                </label>
                <input
                  type="text"
                  id="lieu_faits"
                  name="lieu_faits"
                  value={form.lieu_faits}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  placeholder="Ex: Casablanca, Hay Hassani"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-900 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 resize-none"
                  placeholder="Décrivez les faits, les circonstances et les éléments connus..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Créer l'enquête
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreerEnquete

