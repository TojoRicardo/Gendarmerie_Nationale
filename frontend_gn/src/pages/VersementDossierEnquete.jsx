import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Users,
  Scale,
  Shield,
  FileCheck,
  Activity,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { verserDossierEnquete } from '../services/dossierEnqueteService'
import { fetchTypesEnquete } from '../services/enqueteService'

const VersementDossierEnquete = () => {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [typesEnquete, setTypesEnquete] = useState([])
  const [typesGroupes, setTypesGroupes] = useState({})
  const [activeSection, setActiveSection] = useState('general')

  // Formulaire principal
  const [form, setForm] = useState({
    // Informations générales
    titre: '',
    type_enquete: '',
    date_ouverture: new Date().toISOString().split('T')[0],
    statut: 'ouverte',
    niveau_priorite: 'moyen',
    lieu_faits: '',
    description: '',
    // Personnes
    personnes: [],
    // Infractions
    infractions: [],
    // Preuves
    preuves: [],
    // Rapports
    rapports: [],
    // Biométrie
    donnees_biometriques: [],
  })

  const [errors, setErrors] = useState({})

  React.useEffect(() => {
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
    } finally {
      setLoadingTypes(false)
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = await verserDossierEnquete(form)
      showSuccess("Dossier d'enquête versé avec succès")
      navigate(`/enquetes/${data.id || data.uuid}`)
    } catch (error) {
      console.error('Erreur versement dossier:', error)
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        "Impossible de verser le dossier d'enquête."
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const sections = [
    { id: 'general', label: 'Informations générales', icon: FileText },
    { id: 'personnes', label: 'Personnes concernées', icon: Users },
    { id: 'infractions', label: 'Infractions', icon: Scale },
    { id: 'preuves', label: 'Preuves', icon: Shield },
    { id: 'rapports', label: 'Rapports & PV', icon: FileCheck },
    { id: 'biometrie', label: 'Données biométriques', icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
            <h1 className="mt-2 text-4xl font-bold text-slate-900">
              Versement d'un dossier d'enquête
            </h1>
            <p className="mt-2 text-base text-slate-600">
              Remplissez toutes les sections pour verser un dossier complet
            </p>
          </div>
        </div>

        {/* Navigation des sections */}
        <div className="mb-8 flex flex-wrap gap-2">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            )
          })}
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Informations générales */}
          {activeSection === 'general' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Informations générales
              </h2>
              <div className="space-y-6">
                {/* Titre */}
                <div>
                  <label htmlFor="titre" className="block text-sm font-semibold text-slate-900 mb-2">
                    Titre de l'enquête <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="titre"
                    value={form.titre}
                    onChange={(e) => handleChange('titre', e.target.value)}
                    className={`w-full rounded-xl border ${
                      errors.titre ? 'border-red-300' : 'border-slate-200'
                    } bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100`}
                    placeholder="Ex: Affaire de vol à main armée"
                  />
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
                      Chargement...
                    </div>
                  ) : (
                    <select
                      id="type_enquete"
                      value={form.type_enquete}
                      onChange={(e) => handleChange('type_enquete', e.target.value)}
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
                </div>

                {/* Date, Statut, Priorité */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      value={form.date_ouverture}
                      onChange={(e) => handleChange('date_ouverture', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label htmlFor="statut" className="block text-sm font-semibold text-slate-900 mb-2">
                      Statut <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="statut"
                      value={form.statut}
                      onChange={(e) => handleChange('statut', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    >
                      <option value="ouverte">Ouverte</option>
                      <option value="en_cours">En cours</option>
                      <option value="suspendue">Suspendue</option>
                      <option value="cloturee">Clôturée</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="niveau_priorite"
                      className="block text-sm font-semibold text-slate-900 mb-2"
                    >
                      Priorité <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="niveau_priorite"
                      value={form.niveau_priorite}
                      onChange={(e) => handleChange('niveau_priorite', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    >
                      <option value="faible">Faible</option>
                      <option value="moyen">Moyen</option>
                      <option value="elevee">Élevée</option>
                      <option value="critique">Critique</option>
                    </select>
                  </div>
                </div>

                {/* Lieu des faits */}
                <div>
                  <label htmlFor="lieu_faits" className="block text-sm font-semibold text-slate-900 mb-2">
                    Lieu des faits
                  </label>
                  <input
                    type="text"
                    id="lieu_faits"
                    value={form.lieu_faits}
                    onChange={(e) => handleChange('lieu_faits', e.target.value)}
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
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={6}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 resize-none"
                    placeholder="Décrivez les faits, les circonstances et les éléments connus..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Personnes concernées */}
          {activeSection === 'personnes' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Personnes concernées</h2>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      personnes: [
                        ...prev.personnes,
                        {
                          role: 'suspect',
                          nom: '',
                          prenom: '',
                          fiche_criminelle: null,
                          upr: null,
                        },
                      ],
                    }))
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une personne
                </button>
              </div>

              <div className="space-y-4">
                {form.personnes.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Aucune personne ajoutée</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Ajoutez les suspects, victimes, témoins, etc.
                    </p>
                  </div>
                ) : (
                  form.personnes.map((personne, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">
                          Personne #{index + 1}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              personnes: prev.personnes.filter((_, i) => i !== index),
                            }))
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Rôle <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={personne.role}
                            onChange={(e) => {
                              const newPersonnes = [...form.personnes]
                              newPersonnes[index].role = e.target.value
                              setForm((prev) => ({ ...prev, personnes: newPersonnes }))
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                          >
                            <option value="suspect">Suspect</option>
                            <option value="victime">Victime</option>
                            <option value="temoin">Témoin</option>
                            <option value="plaignant">Plaignant</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Nom
                          </label>
                          <input
                            type="text"
                            value={personne.nom}
                            onChange={(e) => {
                              const newPersonnes = [...form.personnes]
                              newPersonnes[index].nom = e.target.value
                              setForm((prev) => ({ ...prev, personnes: newPersonnes }))
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Sections autres (à compléter de la même manière) */}
          {activeSection !== 'general' && activeSection !== 'personnes' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {sections.find((s) => s.id === activeSection)?.label}
              </h2>
              <div className="text-center py-12">
                <p className="text-slate-600">Section en cours de développement</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
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
                  Versement en cours...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Verser le dossier
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VersementDossierEnquete

