import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Clock,
  UserCheck,
  Calendar,
  AlertTriangle,
  Pencil,
  Trash2,
  CheckCircle,
  Share2,
} from 'lucide-react'
import {
  fetchAssignations,
  createAssignation,
  updateAssignation,
  deleteAssignation,
  fetchDossiers,
  fetchEnqueteurs,
  confirmAssignation,
} from '../services/assignationEnqueteService'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import AssignmentFlowIcon from '../components/icons/AssignmentFlowIcon'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'on_hold', label: 'Suspendue' },
  { value: 'closed', label: 'Clôturée' },
  { value: 'overdue', label: 'Échéance dépassée' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Standard' },
  { value: 'haute', label: 'Haute priorité' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'basse', label: 'Basse priorité' },
]

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-slate-100 text-slate-600',
  closed: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
}

const getStatusLabel = (value) => STATUS_OPTIONS.find((status) => status.value === value)?.label || value

const defaultForm = {
  dossier_id: '',
  assigned_investigator_id: '',
  instructions: '',
  status: 'pending',
  due_date: '',
  priority: '',
}

const AssignmentStatsCard = ({ icon: Icon, label, value, subLabel, accentClass, iconBg }) => (
  <div className={`rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-xl hover:scale-105 ${accentClass || ''}`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold">{label}</p>
        <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
        {subLabel ? <p className="text-xs text-slate-500 mt-2">{subLabel}</p> : null}
      </div>
      <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${iconBg || 'bg-blue-50'}`} style={{ backgroundColor: iconBg || 'rgba(41, 132, 209, 0.1)' }}>
        <Icon className="h-6 w-6" style={{ color: iconBg ? undefined : '#2984D1' }} />
      </div>
    </div>
  </div>
)

const AdminActionButton = ({ icon: Icon, label, onClick, variant = 'default', disabled, title }) => {
  const baseClasses =
    'inline-flex h-8 w-8 items-center justify-center rounded-full p-0 text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1'
  const variants = {
    default:
      'border border-slate-200 text-slate-600 hover:scale-105 hover:bg-slate-50 focus:ring-slate-200',
    danger:
      'border border-red-200 text-red-500 hover:scale-105 hover:bg-red-50 focus:ring-red-200',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={title || label}
      className={`${baseClasses} ${variants[variant]} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}

const AssignmentMetaSummary = ({ assignment }) => {
  if (!assignment) return null

  const dossierLabel = assignment?.dossier?.numero_fiche || '—'
  const assignedInvestigator = assignment?.assigned_investigator?.full_name || '—'
  const assignedBy = assignment?.assigned_by?.full_name || '—'
  const formattedDueDate = assignment?.due_date
    ? new Date(assignment.due_date).toLocaleDateString()
    : 'Non définie'

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.3em] font-semibold text-slate-500">
            Dossier criminel
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="text-xl font-bold text-slate-900">{dossierLabel}</h3>
            <span className="text-sm text-slate-500">
              {[assignment?.dossier?.nom, assignment?.dossier?.prenom].filter(Boolean).join(' ') || '—'}
            </span>
          </div>
        </div>

        <div className="hidden h-16 w-px bg-slate-200 md:block" />

        <dl className="flex flex-1 flex-wrap gap-6 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Enquêteur
            </dt>
            <dd className="mt-1 font-semibold text-slate-900">{assignedInvestigator}</dd>
            <dd className="text-xs text-slate-500">
              {assignment?.assigned_investigator?.email || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Assigné par
            </dt>
            <dd className="mt-1 font-semibold text-slate-900">{assignedBy}</dd>
            <dd className="text-xs text-slate-500">
              {assignment?.assignment_date
                ? new Date(assignment.assignment_date).toLocaleString()
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Échéance
            </dt>
            <dd className="mt-1 flex items-center gap-2 font-semibold text-slate-900">
              <Calendar className="h-4 w-4 text-slate-400" />
              {formattedDueDate}
            </dd>
            <dd className="text-xs text-slate-500">
              Statut&nbsp;:&nbsp;
              <span className="font-semibold text-slate-800">{getStatusLabel(assignment.status)}</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

const EmptyState = ({ onCreate, isAdmin }) => (
  <div className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 py-20 text-center">
    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
      <AssignmentFlowIcon size={40} style={{ color: '#2984D1' }} />
    </div>
    <h3 className="mt-4 text-xl font-bold text-slate-900">Aucune assignation enregistrée</h3>
    <p className="mt-3 max-w-md text-sm text-slate-600">
      {isAdmin 
        ? "Créez une assignation pour informer automatiquement l'enquêteur concerné, lui partager les instructions et suivre l'avancement de la mission."
        : "Aucune assignation ne vous a été confiée pour le moment."}
    </p>
    {isAdmin && onCreate && (
      <button
        type="button"
        onClick={onCreate}
        className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        style={{ backgroundColor: '#2984D1' }}
      >
        <Plus className="h-4 w-4" />
        Assigner une enquête
      </button>
    )}
  </div>
)

const Assignments = () => {
  const { showSuccess, showError } = useToast()
  const { utilisateur } = useAuth()
  const { isAdmin } = usePermissions()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'all', search: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [formState, setFormState] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [dossiers, setDossiers] = useState([])
  const [investigators, setInvestigators] = useState([])
  const [currentAssignment, setCurrentAssignment] = useState(null)
  const [fetchingMeta, setFetchingMeta] = useState(false)
  const [confirming, setConfirming] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadAssignments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAssignations()
      const payload = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : data?.items || []
      setAssignments(payload)
    } catch (error) {
      console.error('Erreur chargement assignations', error)
      showError("Impossible de charger les assignations. Réessayez plus tard.")
    } finally {
      setLoading(false)
    }
  }, [showError])

  const hydrateMeta = useCallback(async () => {
    setFetchingMeta(true)
    try {
      const [dossiersData, investigatorsData] = await Promise.all([fetchDossiers(), fetchEnqueteurs()])
      setDossiers(Array.isArray(dossiersData) ? dossiersData : [])
      setInvestigators(Array.isArray(investigatorsData) ? investigatorsData : [])
    } catch (error) {
      console.error('Erreur chargement métadonnées assignations', error)
      showError("Impossible de récupérer les dossiers ou les enquêteurs.")
    } finally {
      setFetchingMeta(false)
    }
  }, [showError])

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((assignment) => {
        if (filters.status !== 'all' && assignment.status !== filters.status) {
          return false
        }
        if (filters.search) {
          const haystack = [
            assignment?.dossier?.numero_fiche,
            assignment?.dossier?.nom,
            assignment?.dossier?.prenom,
            assignment?.assigned_investigator?.full_name,
            assignment?.assigned_investigator?.email,
            assignment?.assigned_by?.full_name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(filters.search.toLowerCase())
        }
        return true
      })
      .sort((a, b) => new Date(b.assignment_date) - new Date(a.assignment_date))
  }, [assignments, filters])

  const stats = useMemo(() => {
    const total = assignments.length
    const pending = assignments.filter((a) => a.status === 'pending').length
    const inProgress = assignments.filter((a) => a.status === 'in_progress').length
    const overdue = assignments.filter((a) => {
      if (!a.due_date || a.status === 'closed') return false
      const dueDate = new Date(a.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < today || a.status === 'overdue'
    }).length
    return { total, pending, inProgress, overdue }
  }, [assignments])

  const openModal = (assignment = null) => {
    if (!dossiers.length || !investigators.length) {
      hydrateMeta()
    }
    if (assignment) {
      setCurrentAssignment(assignment)
      setFormState({
        dossier_id: assignment?.dossier?.id || assignment?.dossier_id || '',
        assigned_investigator_id:
          assignment?.assigned_investigator?.id || assignment?.assigned_investigator_id || '',
        instructions: assignment?.instructions || '',
        status: assignment?.status || 'pending',
        due_date: assignment?.due_date || '',
        priority: assignment?.priority || '',
      })
    } else {
      setCurrentAssignment(null)
      setFormState(defaultForm)
    }
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setCurrentAssignment(null)
    setFormState(defaultForm)
  }

  const handleChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!formState.dossier_id || !formState.assigned_investigator_id) {
      showError('Sélectionnez un dossier et un enquêteur avant de continuer.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        dossier_id: formState.dossier_id,
        assigned_investigator_id: formState.assigned_investigator_id,
        instructions: formState.instructions,
        status: formState.status,
        due_date: formState.due_date || null,
        priority: formState.priority || '',
      }

      if (currentAssignment) {
        const updated = await updateAssignation(currentAssignment.id, payload)
        setAssignments((prev) =>
          prev.map((item) => (item.id === currentAssignment.id ? updated : item))
        )
        showSuccess('Assignation mise à jour avec succès.')
      } else {
        const created = await createAssignation(payload)
        setAssignments((prev) => [created, ...prev])
        showSuccess("Assignation créée. L'enquêteur a reçu un e-mail interne automatique.")
      }
      closeModal()
    } catch (error) {
      console.error('Erreur sauvegarde assignation', error)
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Une erreur est survenue lors de l'enregistrement."
      showError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (assignment, newStatus) => {
    if (assignment.status === newStatus) return
    try {
      const updated = await updateAssignation(assignment.id, { status: newStatus })
      setAssignments((prev) => prev.map((item) => (item.id === assignment.id ? updated : item)))
      showSuccess(`Statut mis à jour sur « ${getStatusLabel(newStatus)} ».`)
    } catch (error) {
      console.error('Erreur mise à jour statut', error)
      showError('Impossible de mettre à jour le statut.')
    }
  }

  const handleDelete = async (assignment) => {
    try {
      setDeleting(true)
      await deleteAssignation(assignment.id)
      setAssignments((prev) => prev.filter((item) => item.id !== assignment.id))
      showSuccess("Assignation supprimée.")
    } catch (error) {
      console.error('Erreur suppression assignation', error)
      showError("Impossible de supprimer l'assignation.")
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const closeDeleteModal = () => {
    if (deleting) return
    setDeleteTarget(null)
  }

  const confirmDelete = () => {
    if (!deleteTarget || deleting) return
    handleDelete(deleteTarget)
  }

  const handleConfirm = async (assignment) => {
    if (!utilisateur) {
      showError("Vous devez être connecté pour confirmer une assignation.")
      return
    }
    
    const assignedUserId = assignment?.assigned_investigator?.id || assignment?.assigned_investigator_id
    if (assignedUserId !== utilisateur.id) {
      showError("Vous ne pouvez confirmer que vos propres assignations.")
      return
    }
    
    // Vérifier si l'échéance est dépassée avant de confirmer
    if (assignment.due_date) {
      const dueDate = new Date(assignment.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      dueDate.setHours(0, 0, 0, 0)
      
      if (dueDate < today && assignment.status !== 'overdue') {
        showError("L'échéance de cette assignation est dépassée. Veuillez contacter votre superviseur.")
        return
      }
    }
    
    if (assignment.status === 'in_progress') {
      showError("Cette assignation est déjà en cours.")
      return
    }
    
    if (assignment.status === 'closed') {
      showError("Cette assignation est déjà clôturée.")
      return
    }
    
    if (assignment.status === 'overdue') {
      showError("L'échéance de cette assignation est dépassée. Veuillez contacter votre superviseur.")
      return
    }
    
    setConfirming(assignment.id)
    try {
      // Utiliser le nouvel endpoint de confirmation qui vérifie automatiquement l'échéance
      const response = await confirmAssignation(assignment.id)
      const updated = response.assignment || response
      setAssignments((prev) => prev.map((item) => (item.id === assignment.id ? updated : item)))
      showSuccess(response.detail || "Assignation confirmée. Le statut est maintenant 'En cours'.")
    } catch (error) {
      console.error('Erreur confirmation assignation', error)
      
      // Gestion spécifique des erreurs HTTP
      if (error?.response?.status === 403) {
        const message = error?.response?.data?.detail || 
                       "Vous n'avez pas la permission de confirmer cette assignation."
        showError(message)
      } else if (error?.response?.status === 404) {
        const message = error?.response?.data?.detail || 
                       "Assignation introuvable."
        showError(message)
      } else if (error?.response?.status === 400) {
        const message = error?.response?.data?.detail || 
                       error?.response?.data?.message ||
                       "Cette assignation ne peut pas être confirmée."
        showError(message)
      } else {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "Une erreur est survenue lors de la confirmation. Veuillez réessayer."
        showError(message)
      }
    } finally {
      setConfirming(null)
    }
  }

  // Vérifier si l'utilisateur peut confirmer une assignation
  const canConfirm = (assignment) => {
    if (!utilisateur) return false
    const assignedUserId = assignment?.assigned_investigator?.id || assignment?.assigned_investigator_id
    if (assignedUserId !== utilisateur.id) return false
    
    // Ne peut pas confirmer si déjà en cours, clôturée ou échéance dépassée
    if (assignment.status === 'in_progress' || assignment.status === 'closed' || assignment.status === 'overdue') {
      return false
    }
    
    // Vérifier si l'échéance est dépassée
    if (assignment.due_date) {
      const dueDate = new Date(assignment.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      dueDate.setHours(0, 0, 0, 0)
      if (dueDate < today) {
        return false
      }
    }
    
    return assignment.status === 'pending'
  }
  
  // Vérifier et mettre à jour automatiquement les statuts lors du chargement
  // Note: La vérification côté serveur dans get_queryset met déjà à jour les statuts
  // Vérification et mise à jour automatique des statuts avec échéance dépassée
  // Note: Le backend met automatiquement à jour les statuts lors de chaque requête
  // Cette vérification côté client est uniquement pour l'affichage visuel immédiat
  useEffect(() => {
    if (assignments.length === 0 || loading) return
    
    // Vérifier chaque assignation pour voir si l'échéance est dépassée
    const updatedAssignments = assignments.map(assignment => {
      // Ne pas modifier les assignations déjà clôturées ou déjà marquées comme overdue
      if (!assignment.due_date || assignment.status === 'closed' || assignment.status === 'overdue') {
        return assignment
      }
      
      // Comparer les dates (sans l'heure)
      const dueDate = new Date(assignment.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      dueDate.setHours(0, 0, 0, 0)
      
      // Si l'échéance est dépassée, mettre à jour localement pour l'affichage
      // Le backend synchronisera lors de la prochaine requête
      if (dueDate < today && assignment.status !== 'overdue') {
        return { ...assignment, status: 'overdue' }
      }
      
      return assignment
    })
    
    // Mettre à jour seulement si des changements ont été détectés
    const hasChanges = updatedAssignments.some((updated, index) => 
      updated.status !== assignments[index].status
    )
    
    if (hasChanges) {
      setAssignments(updatedAssignments)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments.length, loading]) // Seulement lors du chargement initial ou changement de longueur

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] font-semibold" style={{ color: '#2984D1' }}>Assignations</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Gestion des enquêtes assignées</h1>
          <p className="mt-2 text-sm text-slate-600">
            {isAdmin 
              ? "Affectez rapidement les dossiers criminels et suivez l'avancement des missions des enquêteurs."
              : "Consultez vos assignations et confirmez-les pour commencer les enquêtes."}
          </p>
        </div>
        {/* Seuls les administrateurs peuvent créer des assignations */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            style={{ backgroundColor: '#2984D1' }}
          >
            <Plus className="h-4 w-4" />
            Assigner une enquête
          </button>
        )}
      </header>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <AssignmentStatsCard
          icon={Share2}
          label="Total assignations"
          value={stats.total}
          subLabel="Toutes les missions actives et clôturées"
          iconBg="rgba(41, 132, 209, 0.1)"
        />
        <AssignmentStatsCard
          icon={Clock}
          label="En attente"
          value={stats.pending}
          subLabel="Enquêteurs en attente de démarrage"
          iconBg="rgba(245, 158, 11, 0.1)"
        />
        <AssignmentStatsCard
          icon={UserCheck}
          label="En cours"
          value={stats.inProgress}
          subLabel="Dossiers actuellement traités"
          iconBg="rgba(16, 185, 129, 0.1)"
        />
        <AssignmentStatsCard
          icon={AlertTriangle}
          label="Échéance dépassée"
          value={stats.overdue}
          subLabel="Intervention requise rapidement"
          iconBg="rgba(239, 68, 68, 0.1)"
        />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Rechercher un dossier, un enquêteur ou un expéditeur…"
              className="flex-1 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 transition-all"
              style={{ '--tw-ring-color': '#2984D1' }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2984D1';
                e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '';
                e.target.style.boxShadow = '';
              }}
            >
              <option value="all">Tous les statuts</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadAssignments}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Actualiser
            </button>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 py-12 text-sm text-slate-500">
              Chargement des assignations…
            </div>
          ) : filteredAssignments.length === 0 ? (
            <EmptyState onCreate={openModal} isAdmin={isAdmin} />
          ) : (
            <div className="overflow-hidden rounded-2xl shadow-md">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                    <th className="px-5 py-4">Dossier</th>
                    <th className="px-5 py-4">Enquêteur</th>
                    <th className="px-5 py-4">Assigné par</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">Date limite</th>
                    <th className="px-5 py-4">Priorité</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {assignment?.dossier?.numero_fiche || '—'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {[assignment?.dossier?.nom, assignment?.dossier?.prenom]
                            .filter(Boolean)
                            .join(' ') || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {assignment?.assigned_investigator?.full_name || '—'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {assignment?.assigned_investigator?.email || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {assignment?.assigned_by?.full_name || '—'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(assignment.assignment_date).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            STATUS_STYLES[assignment.status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                          {getStatusLabel(assignment.status)}
                        </span>
                        {/* Seuls les administrateurs peuvent modifier le statut manuellement */}
                        {isAdmin && (
                          <select
                            value={assignment.status}
                            onChange={(event) => handleStatusChange(assignment, event.target.value)}
                            className="mt-2 w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 transition-all"
                            style={{ '--tw-ring-color': '#2984D1' }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#2984D1';
                              e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '';
                              e.target.style.boxShadow = '';
                            }}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {assignment.due_date ? (() => {
                          const dueDate = new Date(assignment.due_date)
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          dueDate.setHours(0, 0, 0, 0)
                          const isOverdue = dueDate < today && assignment.status !== 'closed'
                          return (
                            <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-700'}`}>
                              <Calendar className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
                              <span>
                                {new Date(assignment.due_date).toLocaleDateString()}
                                {isOverdue && <span className="ml-2 text-xs">Dépassée</span>}
                              </span>
                            </div>
                          )
                        })() : (
                          <span className="text-xs text-slate-400">Non définie</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {assignment.priority ? assignment.priority : 'Standard'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Actions administrateur */}
                          {isAdmin && (
                            <div className="flex items-center gap-1.5">
                              <AdminActionButton
                                icon={Pencil}
                                label="Modifier"
                                title="Mettre à jour cette assignation"
                                onClick={() => openModal(assignment)}
                              />
                              <AdminActionButton
                                icon={Trash2}
                                label="Supprimer"
                                title="Supprimer définitivement cette assignation"
                                variant="danger"
                                onClick={() => setDeleteTarget(assignment)}
                              />
                            </div>
                          )}

                          {/* Bouton Confirmer - visible uniquement pour l'enquêteur assigné */}
                          {canConfirm(assignment) && (
                            <button
                              type="button"
                              onClick={() => handleConfirm(assignment)}
                              disabled={confirming === assignment.id}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: '#10b981' }}
                            >
                              {confirming === assignment.id ? (
                                <>
                                  <Clock className="h-3.5 w-3.5 animate-spin" />
                                  Confirmation...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Confirmer
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] font-semibold" style={{ color: '#2984D1' }}>
                    {currentAssignment ? 'Modifier assignation' : 'Nouvelle assignation'}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {currentAssignment ? 'Mettre à jour la mission' : 'Assigner une enquête'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6 px-6 py-6">
                {currentAssignment && <AssignmentMetaSummary assignment={currentAssignment} />}

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Dossier criminel
                    </label>
                    <select
                      value={formState.dossier_id}
                      onChange={(event) => handleChange('dossier_id', event.target.value)}
                      disabled={fetchingMeta || saving}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': '#2984D1' }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2984D1';
                        e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                    >
                      <option value="">
                        {fetchingMeta ? 'Chargement…' : 'Sélectionnez un dossier'}
                      </option>
                      {dossiers.map((dossier) => (
                        <option key={dossier.id} value={dossier.id}>
                          {dossier.numero_fiche} — {[dossier.nom, dossier.prenom].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Enquêteur assigné
                    </label>
                    <select
                      value={formState.assigned_investigator_id}
                      onChange={(event) => handleChange('assigned_investigator_id', event.target.value)}
                      disabled={fetchingMeta || saving}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': '#2984D1' }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2984D1';
                        e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                    >
                      <option value="">
                        {fetchingMeta ? 'Chargement…' : 'Sélectionnez un enquêteur'}
                      </option>
                      {investigators.map((investigator) => (
                        <option key={investigator.id} value={investigator.id}>
                          {investigator.full_name} ({investigator.role || '—'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Statut
                    </label>
                    <select
                      value={formState.status}
                      onChange={(event) => handleChange('status', event.target.value)}
                      disabled={saving}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': '#2984D1' }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2984D1';
                        e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Priorité
                    </label>
                    <select
                      value={formState.priority}
                      onChange={(event) => handleChange('priority', event.target.value)}
                      disabled={saving}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': '#2984D1' }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2984D1';
                        e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Date limite (échéance)
                    </label>
                    <input
                      type="date"
                      value={formState.due_date || ''}
                      onChange={(event) => handleChange('due_date', event.target.value)}
                      disabled={saving}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': '#2984D1' }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2984D1';
                        e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Instructions
                    </label>
                    <textarea
                      rows={4}
                      value={formState.instructions}
                      onChange={(event) => handleChange('instructions', event.target.value)}
                      disabled={saving}
                      placeholder="Spécifiez les objectifs de la mission, les documents à consulter, les délais ou contraintes particulières."
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': '#2984D1' }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2984D1';
                        e.target.style.boxShadow = '0 0 0 2px rgba(41, 132, 209, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderTop: '1px solid #e5e7eb' }}>
                <p className="text-xs text-slate-600">
                  Un e-mail interne est envoyé automatiquement à l'enquêteur lors de la création d'une assignation.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-white hover:scale-105"
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-60"
                    style={{ backgroundColor: '#2984D1' }}
                  >
                    {saving ? 'Enregistrement…' : currentAssignment ? 'Mettre à jour' : 'Assigner'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/70 px-4 py-8 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100">
              <p className="text-xs uppercase tracking-[0.35em] font-semibold text-red-500">
                Suppression
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Confirmer la suppression</h2>
            </div>
            <div className="space-y-4 px-6 py-6 text-sm text-slate-600">
              <p>
                Vous êtes sur le point de supprimer définitivement l'assignation du dossier{' '}
                <span className="font-semibold text-slate-900">
                  {deleteTarget?.dossier?.numero_fiche || '—'}
                </span>{' '}
                assignée à{' '}
                <span className="font-semibold text-slate-900">
                  {deleteTarget?.assigned_investigator?.full_name || '—'}
                </span>
                .
              </p>
              <p className="text-slate-500">
                Cette action est irréversible. Les données liées à cette assignation seront
                supprimées.
              </p>
            </div>
            <div className="flex flex-col gap-3 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-white hover:scale-105 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-60"
                style={{ backgroundColor: '#dc2626' }}
              >
                {deleting ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Suppression…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Assignments


