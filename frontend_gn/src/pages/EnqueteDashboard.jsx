import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlusCircle,
  RefreshCw,
  NotepadText,
  Pencil,
  Trash2,
  FileText,
  FileSignature,
  StickyNote,
  Activity,
  Loader2,
  Search,
  X,
  ChevronDown,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { fetchAssignations } from '../services/assignationEnqueteService'
import {
  fetchEnquetes,
  fetchPreuves,
  fetchRapports,
  fetchObservations,
  fetchAvancement,
  deletePreuve,
  deleteRapport,
  deleteObservation,
  deleteAvancementEntry,
} from '../services/enqueteService'
import PreuveCard from '../components/PreuveCard'
import RapportCard from '../components/RapportCard'
import ObservationItem from '../components/ObservationItem'
import AvancementBar from '../components/AvancementBar'
import ModalConfirmation from '../components/commun/ModalConfirmation'
import UploadDocumentModal from '../components/UploadDocumentModal'
import RechercheFichiersEnquete from '../components/RechercheFichiersEnquete'

const asArray = (payload) => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (payload.results && Array.isArray(payload.results)) return payload.results
  if (payload.data && Array.isArray(payload.data)) return payload.data
  return []
}

const EnqueteDashboard = () => {
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const { utilisateur } = useAuth()

  const [assignations, setAssignations] = useState([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null)
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)

  // États pour les enquêtes
  const [enquetes, setEnquetes] = useState([])
  const [loadingEnquetes, setLoadingEnquetes] = useState(false)
  const [statsEnquetes, setStatsEnquetes] = useState({
    total: 0,
    en_cours: 0,
    cloturee: 0,
    suspendue: 0,
  })

  const [preuves, setPreuves] = useState([])
  const [rapports, setRapports] = useState([])
  const [observations, setObservations] = useState([])
  const [avancement, setAvancement] = useState([])
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    showCancel: true,
    onConfirm: null,
  })
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const selectedAssignment = useMemo(
    () => assignations.find((assignment) => assignment.id === selectedAssignmentId),
    [assignations, selectedAssignmentId],
  )

  const dossierId = selectedAssignment?.dossier?.id

  // Filtrer les assignations par nom et numéro de fiche
  const filteredAssignments = useMemo(() => {
    if (!searchQuery.trim()) {
      return assignations
    }

    const rawQuery = searchQuery.trim()
    const query = rawQuery.toLowerCase()

    return assignations.filter((assignment) => {
      if (!assignment?.dossier) {
        const assignmentId = String(assignment.id || '').toLowerCase()
        return assignmentId.includes(query)
      }

      const dossier = assignment.dossier
      const numeroFiche = (dossier.numero_fiche || '').toLowerCase()
      const nom = (dossier.nom || '').toLowerCase()
      const prenom = (dossier.prenom || '').toLowerCase()
      const nomComplet = `${nom} ${prenom}`.trim()

      const matches =
        numeroFiche.includes(query) ||
        nom.includes(query) ||
        prenom.includes(query) ||
        nomComplet.includes(query)

      if (rawQuery.includes('•')) {
        const parts = rawQuery.split('•').map((p) => p.trim().toLowerCase())
        if (parts.length >= 2) {
          const searchNumero = parts[0]
          const searchNomPrenom = parts[1]
          return (
            matches ||
            numeroFiche.includes(searchNumero) ||
            nomComplet.includes(searchNomPrenom) ||
            nom.includes(searchNomPrenom) ||
            prenom.includes(searchNomPrenom)
          )
        }
      }

      return matches
    })
  }, [assignations, searchQuery])

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Mettre à jour le champ de recherche quand une assignation est sélectionnée
  useEffect(() => {
    if (selectedAssignment && !isDropdownOpen && !searchInputRef.current?.matches(':focus')) {
      const displayText = `${selectedAssignment?.dossier?.numero_fiche || selectedAssignment.id} • ${[selectedAssignment?.dossier?.nom, selectedAssignment?.dossier?.prenom].filter(Boolean).join(' ')}`
      setSearchQuery(displayText)
    } else if (assignations.length === 0 && !isDropdownOpen) {
      setSearchQuery('')
    }
  }, [selectedAssignmentId, assignations.length, isDropdownOpen, selectedAssignment])

  const openConfirmDialog = ({
    title,
    message,
    onConfirm,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    type = 'warning',
    showCancel = true,
  }) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      type,
      showCancel,
    })
  }

  const closeConfirmDialog = () =>
    setConfirmDialog((prev) => ({
      ...prev,
      open: false,
    }))

  const handleConfirmDialog = async () => {
    try {
      if (confirmDialog.onConfirm) {
        await confirmDialog.onConfirm()
      }
    } finally {
      closeConfirmDialog()
    }
  }

  const loadAssignments = async () => {
    setLoadingAssignments(true)
    try {
      const data = await fetchAssignations({ status: 'in_progress' })
      const list = asArray(data)
      setAssignations(list)
      if (!selectedAssignmentId && list.length > 0) {
        setSelectedAssignmentId(list[0].id)
      }
    } catch (error) {
      console.error(error)
      showError('Impossible de charger vos assignations actives.')
    } finally {
      setLoadingAssignments(false)
    }
  }

  const loadEnquetes = async () => {
    setLoadingEnquetes(true)
    try {
      const data = await fetchEnquetes({ page_size: 5 })
      const enquetesList = Array.isArray(data) ? data : data.results || []
      setEnquetes(enquetesList)

      const stats = {
        total: data.count || enquetesList.length,
        en_cours: enquetesList.filter((e) => e.statut === 'en_cours').length,
        cloturee: enquetesList.filter((e) => e.statut === 'cloturee').length,
        suspendue: enquetesList.filter((e) => e.statut === 'suspendue').length,
      }
      setStatsEnquetes(stats)
    } catch (error) {
      console.error('Erreur chargement enquêtes:', error)
    } finally {
      setLoadingEnquetes(false)
    }
  }

  useEffect(() => {
    loadAssignments()
    loadEnquetes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDossierData = async () => {
    if (!dossierId) {
      setPreuves([])
      setRapports([])
      setObservations([])
      setAvancement([])
      return
    }
    setLoadingData(true)
    try {
      const [preuvesData, rapportsData, observationsData, avancementData] = await Promise.all([
        fetchPreuves(dossierId),
        fetchRapports(dossierId),
        fetchObservations(dossierId),
        fetchAvancement(dossierId),
      ])
      setPreuves(asArray(preuvesData))
      setRapports(asArray(rapportsData))
      setObservations(asArray(observationsData))
      setAvancement(asArray(avancementData))
    } catch (error) {
      console.error(error)
      showError("Erreur lors du chargement des données d'enquête.")
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    loadDossierData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId])

  const handleCreateNavigation = (path) => {
    if (!dossierId) {
      showError("Sélectionnez d'abord un dossier actif.")
      return
    }
    navigate(`${path}?dossier=${dossierId}`)
  }

  const handleEditPreuve = (preuveId) => {
    if (!dossierId) {
      showError("Sélectionnez d'abord un dossier actif.")
      return
    }
    navigate(`/enquete/preuves/ajouter?dossier=${dossierId}&preuve=${preuveId}`)
  }

  const handleDeletePreuve = (preuveId) => {
    openConfirmDialog({
      title: 'Supprimer cette preuve ?',
      message: 'Cette action est irréversible. La pièce sera retirée du dossier.',
      confirmText: 'Supprimer',
      type: 'warning',
      onConfirm: async () => {
        try {
          await deletePreuve(preuveId)
          showSuccess('Preuve supprimée.')
          loadDossierData()
        } catch (error) {
          console.error(error)
          showError(
            error.response?.data?.detail ||
              error.response?.data?.non_field_errors?.[0] ||
              'Impossible de supprimer la preuve.',
          )
        }
      },
    })
  }

  const handleEditRapport = (rapportId) => {
    if (!dossierId) {
      showError("Sélectionnez d'abord un dossier actif.")
      return
    }
    navigate(`/enquete/rapports/ajouter?dossier=${dossierId}&rapport=${rapportId}`)
  }

  const handleDeleteRapport = (rapportId) => {
    openConfirmDialog({
      title: 'Supprimer ce rapport ?',
      message: 'Le rapport et son historique seront supprimés.',
      confirmText: 'Supprimer',
      type: 'warning',
      onConfirm: async () => {
        try {
          await deleteRapport(rapportId)
          showSuccess('Rapport supprimé.')
          loadDossierData()
        } catch (error) {
          console.error(error)
          showError(
            error.response?.data?.detail ||
              error.response?.data?.non_field_errors?.[0] ||
              'Impossible de supprimer le rapport.',
          )
        }
      },
    })
  }

  const handleEditObservation = (observationId) => {
    if (!dossierId) {
      showError("Sélectionnez d'abord un dossier actif.")
      return
    }
    navigate(`/enquete/observations/ajouter?dossier=${dossierId}&observation=${observationId}`)
  }

  const handleDeleteObservation = (observationId) => {
    openConfirmDialog({
      title: 'Supprimer cette observation ?',
      message: 'Cette note interne sera définitivement effacée.',
      confirmText: 'Supprimer',
      type: 'warning',
      onConfirm: async () => {
        try {
          await deleteObservation(observationId)
          showSuccess('Observation supprimée.')
          loadDossierData()
        } catch (error) {
          console.error(error)
          showError(
            error.response?.data?.detail ||
              error.response?.data?.non_field_errors?.[0] ||
              'Impossible de supprimer cette observation.',
          )
        }
      },
    })
  }

  const handleEditAvancement = (avancementId) => {
    if (!dossierId) {
      showError("Sélectionnez d'abord un dossier actif.")
      return
    }
    navigate(`/enquete/avancement?dossier=${dossierId}&avancement=${avancementId}`)
  }

  const handleDeleteAvancement = (avancementId) => {
    openConfirmDialog({
      title: 'Supprimer cet avancement ?',
      message: 'La progression associée sera retirée du suivi.',
      confirmText: 'Supprimer',
      type: 'warning',
      onConfirm: async () => {
        try {
          await deleteAvancementEntry(avancementId)
          showSuccess('Avancement supprimé.')
          loadDossierData()
        } catch (error) {
          console.error(error)
          showError(
            error.response?.data?.detail ||
              error.response?.data?.non_field_errors?.[0] ||
              "Impossible de supprimer l'avancement.",
          )
        }
      },
    })
  }

  const headerStats = [
    {
      label: 'Preuves',
      value: preuves.length,
      accent: 'bg-white',
      icon: FileText,
      description: 'Pièces ajoutées au dossier',
    },
    {
      label: 'Rapports',
      value: rapports.length,
      accent: 'bg-white',
      icon: FileSignature,
      description: 'Analyses et synthèses rédigées',
    },
    {
      label: 'Observations',
      value: observations.length,
      accent: 'bg-white',
      icon: StickyNote,
      description: 'Notes stratégiques et terrain',
    },
  ]

  const getStatutColor = (statut) => {
    const colors = {
      en_cours: 'bg-blue-100 text-blue-700 border-blue-200',
      cloturee: 'bg-green-100 text-green-700 border-green-200',
      suspendue: 'bg-orange-100 text-orange-700 border-orange-200',
      classee: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colors[statut] || colors.en_cours
  }

  const getPrioriteColor = (priorite) => {
    const colors = {
      faible: 'bg-gray-100 text-gray-700',
      normale: 'bg-blue-100 text-blue-700',
      elevee: 'bg-orange-100 text-orange-700',
      urgente: 'bg-red-100 text-red-700',
    }
    return colors[priorite] || colors.normale
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500 font-semibold">
                MODULE ENQUÊTE
              </p>
              <h1 className="mt-2 text-4xl font-bold text-slate-900">
                Tableau de bord des enquêtes
              </h1>
              <p className="mt-2 text-base text-slate-600">
                {utilisateur?.prenom ? `${utilisateur.prenom}, ` : ''}
                gérez et suivez toutes vos enquêtes en cours
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/enquetes')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 shadow-sm"
              >
                <Eye className="h-4 w-4" />
                Voir toutes les enquêtes
              </button>
              <button
                type="button"
                onClick={() => {
                  loadAssignments()
                  loadEnquetes()
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                disabled={loadingAssignments || loadingEnquetes}
              >
                {(loadingAssignments || loadingEnquetes) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Rafraîchir
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Total
                </p>
                <p className="mt-2 text-3xl font-bold text-blue-900">{statsEnquetes.total}</p>
                <p className="mt-1 text-xs text-blue-700">Enquêtes enregistrées</p>
              </div>
              <div className="rounded-xl bg-blue-200/50 p-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-yellow-600">
                  En cours
                </p>
                <p className="mt-2 text-3xl font-bold text-yellow-900">
                  {statsEnquetes.en_cours}
                </p>
                <p className="mt-1 text-xs text-yellow-700">Enquêtes actives</p>
              </div>
              <div className="rounded-xl bg-yellow-200/50 p-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-600">
                  Clôturées
                </p>
                <p className="mt-2 text-3xl font-bold text-green-900">
                  {statsEnquetes.cloturee}
                </p>
                <p className="mt-1 text-xs text-green-700">Enquêtes terminées</p>
              </div>
              <div className="rounded-xl bg-green-200/50 p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                  Suspendues
                </p>
                <p className="mt-2 text-3xl font-bold text-orange-900">
                  {statsEnquetes.suspendue}
                </p>
                <p className="mt-1 text-xs text-orange-700">Enquêtes en pause</p>
              </div>
              <div className="rounded-xl bg-orange-200/50 p-3">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Grille principale */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Colonne gauche - Enquêtes récentes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enquêtes récentes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Enquêtes récentes</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Dernières enquêtes créées ou modifiées
                  </p>
                </div>
                <button
                  onClick={() => navigate('/enquetes')}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Voir tout
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {loadingEnquetes ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : enquetes.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Aucune enquête pour le moment</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Créez votre première enquête pour commencer
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enquetes.map((enquete) => (
                    <div
                      key={enquete.id}
                      onClick={() => navigate(`/enquetes/${enquete.id}`)}
                      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition">
                              {enquete.titre}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">{enquete.numero_enquete}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatutColor(enquete.statut)}`}
                            >
                              {enquete.statut_display || enquete.statut}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getPrioriteColor(enquete.priorite)}`}
                            >
                              {enquete.priorite_display || enquete.priorite}
                            </span>
                          </div>
                          {enquete.enqueteur_responsable_detail && (
                            <div className="flex items-center gap-1 mt-3 text-xs text-slate-500">
                              <Users className="h-3 w-3" />
                              <span>{enquete.enqueteur_responsable_detail.full_name}</span>
                            </div>
                          )}
                        </div>
                        <Eye className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition flex-shrink-0 ml-3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite - Actions rapides */}
          <div className="space-y-6">
            {/* Actions rapides */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Actions rapides</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/enquetes/create')}
                  className="w-full flex items-center gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-100"
                >
                  <div className="rounded-lg bg-blue-600 p-2">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Créer une enquête</p>
                    <p className="text-xs text-slate-600">Nouvelle enquête</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/enquetes')}
                  className="w-full flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-slate-100"
                >
                  <div className="rounded-lg bg-slate-600 p-2">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Liste des enquêtes</p>
                    <p className="text-xs text-slate-600">Voir toutes les enquêtes</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Statistiques assignations */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Mes assignations</h2>
              {loadingAssignments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              ) : assignations.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Aucune assignation</p>
                  <p className="text-xs text-slate-500 mt-1">Aucun dossier actif assigné</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-slate-900">{assignations.length}</p>
                  <p className="text-sm text-slate-600">
                    Dossier{assignations.length > 1 ? 's' : ''} actif{assignations.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section Assignations */}
        {assignations.length > 0 && (
          <div id="assignations-section" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Dossiers actifs assignés</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {assignations.length} assignation{assignations.length > 1 ? 's' : ''} confirmée{assignations.length > 1 ? 's' : ''}
                </p>
              </div>
              {/* Composant de recherche avec autocomplete */}
              <div className="relative w-full md:w-80" ref={dropdownRef}>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value
                      setSearchQuery(value)
                      if (value.trim().length > 0) {
                        setIsDropdownOpen(true)
                      } else {
                        setSelectedAssignmentId(null)
                        setIsDropdownOpen(false)
                      }
                    }}
                    onFocus={() => {
                      if (searchQuery.trim().length > 0) {
                        setIsDropdownOpen(true)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsDropdownOpen(false)
                      }
                    }}
                    placeholder="Rechercher par nom ou numéro de fiche..."
                    disabled={loadingAssignments}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-10 pr-10 text-sm font-semibold text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  {searchQuery ? (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedAssignmentId(null)
                        setIsDropdownOpen(false)
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-slate-600"
                      title="Effacer la recherche"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  )}
                </div>

                {/* Dropdown avec résultats filtrés */}
                {isDropdownOpen && searchQuery.trim().length > 0 && assignations.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {filteredAssignments.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">
                        Aucun résultat trouvé pour "{searchQuery}"
                      </div>
                    ) : (
                      <>
                        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          {filteredAssignments.length} résultat{filteredAssignments.length > 1 ? 's' : ''}
                        </div>
                        {filteredAssignments.map((assignment) => {
                          const isSelected = selectedAssignmentId === assignment.id
                          const dossier = assignment?.dossier
                          const displayText = dossier
                            ? `${dossier.numero_fiche || assignment.id} • ${[dossier.nom, dossier.prenom].filter(Boolean).join(' ')}`
                            : `Assignation #${assignment.id}`

                          return (
                            <button
                              key={assignment.id}
                              type="button"
                              onClick={() => {
                                setSelectedAssignmentId(assignment.id)
                                setSearchQuery(displayText)
                                setIsDropdownOpen(false)
                                setTimeout(() => {
                                  searchInputRef.current?.blur()
                                }, 100)
                              }}
                              className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {displayText}
                            </button>
                          )
                        })}
                        {selectedAssignmentId && (
                          <div className="border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAssignmentId(null)
                                setSearchQuery('')
                                setIsDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                              <X className="h-4 w-4" />
                              Effacer la sélection
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section détails du dossier (si un dossier est sélectionné) */}
        {dossierId && (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {headerStats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl border border-slate-100 ${stat.accent} p-6 shadow-sm`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-3 text-3xl font-black text-slate-900">{stat.value}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{stat.description}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-slate-600">
                      {stat.icon ? <stat.icon className="h-5 w-5" strokeWidth={1.5} /> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <FileText className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                        Preuves
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-slate-900">
                        Recherche et gestion des fichiers
                      </h3>
                      <p className="text-sm text-slate-500">
                        Recherchez et modifiez les documents, photos, éléments audio/vidéo.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="self-start inline-flex items-center justify-center rounded-full border-2 border-white bg-[#00B870] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00a664] focus:outline-none focus:ring-2 focus:ring-[#00B870]/40"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <PlusCircle className="h-4 w-4" strokeWidth={2.5} />
                      Ajouter
                    </span>
                  </button>
                </div>

                {/* Composant de recherche de fichiers */}
                <RechercheFichiersEnquete
                  dossierId={dossierId}
                  onFileSelect={(preuve) => {
                    // Optionnel : action supplémentaire lors de la sélection
                  }}
                />
              </section>

              <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <FileSignature className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                        Rapports
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-slate-900">Analyses d'enquête</h3>
                      <p className="text-sm text-slate-500">
                        Synthèses opérationnelles, comptes rendus et recommandations.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="self-start inline-flex items-center justify-center rounded-full border-2 border-white bg-[#00B870] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00a664] focus:outline-none focus:ring-2 focus:ring-[#00B870]/40"
                    onClick={() => handleCreateNavigation('/enquete/rapports/ajouter')}
                  >
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <PlusCircle className="h-4 w-4" strokeWidth={2.5} />
                      Ajouter
                    </span>
                  </button>
                </div>
                {rapports.length > 0 ? (
                  <div className="space-y-4">
                    {rapports.map((rapport) => (
                      <RapportCard
                        key={rapport.id}
                        rapport={rapport}
                        onEdit={() => handleEditRapport(rapport.id)}
                        onDelete={() => handleDeleteRapport(rapport.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
                    Aucun rapport enregistré pour ce dossier.
                  </div>
                )}
              </section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <StickyNote className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                        Observations
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-slate-900">Notes stratégiques</h3>
                      <p className="text-sm text-slate-500">
                        Hypothèses, retours terrain, briefing rapides à partager.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="self-start inline-flex items-center justify-center rounded-full border-2 border-white bg-[#00B870] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00a664] focus:outline-none focus:ring-2 focus:ring-[#00B870]/40"
                    onClick={() => handleCreateNavigation('/enquete/observations/ajouter')}
                  >
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <NotepadText className="h-4 w-4" strokeWidth={2.5} />
                      Noter
                    </span>
                  </button>
                </div>
                {observations.length > 0 ? (
                  <div className="space-y-3">
                    {observations.map((observation) => (
                      <ObservationItem
                        key={observation.id}
                        observation={observation}
                        onEdit={() => handleEditObservation(observation.id)}
                        onDelete={() => handleDeleteObservation(observation.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
                    Aucune observation enregistrée.
                  </div>
                )}
              </section>

              <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <Activity className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                        Avancement
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-slate-900">Progression du dossier</h3>
                      <p className="text-sm text-slate-500">
                        Historique des mises à jour et pourcentage consolidé.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="self-start inline-flex items-center justify-center rounded-full border-2 border-white bg-[#00B870] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00a664] focus:outline-none focus:ring-2 focus:ring-[#00B870]/40"
                    onClick={() => handleCreateNavigation('/enquete/avancement')}
                  >
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <PlusCircle className="h-4 w-4" strokeWidth={2.5} />
                      Mettre à jour
                    </span>
                  </button>
                </div>
                {avancement.length > 0 && (
                  <AvancementBar avancement={avancement[0]} />
                )}
                {avancement.length > 0 ? (
                  <div className="space-y-3">
                    {avancement.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.pourcentage}% •{' '}
                            {new Date(item.date_mise_a_jour).toLocaleString()}
                          </p>
                          {item.commentaire ? (
                            <p className="text-xs text-slate-500 line-clamp-2">
                              {item.commentaire}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditAvancement(item.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAvancement(item.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-500 transition hover:border-red-300 hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-4 text-center text-sm text-slate-500">
                    Aucun avancement enregistré pour ce dossier.
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmation */}
      <ModalConfirmation
        isOpen={confirmDialog.open}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmDialog}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        showCancel={confirmDialog.showCancel}
      />

      {/* Modal d'upload de documents */}
      <UploadDocumentModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        dossierId={dossierId}
        onSuccess={() => {
          loadDossierData()
        }}
      />
    </div>
  )
}

export default EnqueteDashboard
