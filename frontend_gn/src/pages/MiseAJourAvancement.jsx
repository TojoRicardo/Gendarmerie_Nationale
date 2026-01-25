import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useNotification } from '../context/NotificationContext'
import { fetchAssignations } from '../services/assignationEnqueteService'
import {
  updateAvancement,
  fetchAvancementDetail,
  editAvancementEntry,
  deleteAvancementEntry,
} from '../services/enqueteService'

const MiseAJourAvancement = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showSuccess, showError } = useToast()
  const notification = useNotification()

  const [assignations, setAssignations] = useState([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    dossier: '',
    pourcentage: 0,
    commentaire: '',
  })
  const [editingId, setEditingId] = useState(null)
  const isEditing = Boolean(editingId)

  const selectedAssignment = useMemo(
    () => assignations.find((assignment) => assignment?.dossier?.id === Number(form.dossier)),
    [assignations, form.dossier],
  )

  useEffect(() => {
    const dossier = Number(searchParams.get('dossier'))
    if (dossier) {
      setForm((prev) => ({ ...prev, dossier }))
    }
  }, [searchParams])

  useEffect(() => {
    const avancementId = Number(searchParams.get('avancement'))
    if (avancementId) {
      loadAvancementDetail(avancementId)
    } else {
      setEditingId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const data = await fetchAssignations({ status: 'in_progress' })
        const list = data?.results || data || []
        setAssignations(list)
        if (!form.dossier && list.length > 0) {
          setForm((prev) => ({ ...prev, dossier: list[0]?.dossier?.id || '' }))
        }
      } catch (error) {
        console.error(error)
        showError('Impossible de charger vos assignations.')
      }
    }
    loadAssignments()
  }, [])

  const loadAvancementDetail = async (avancementId) => {
    try {
      const data = await fetchAvancementDetail(avancementId)
      setEditingId(avancementId)
      setForm({
        dossier: data.dossier,
        pourcentage: data.pourcentage,
        commentaire: data.commentaire || '',
      })
    } catch (error) {
      console.error(error)
      showError(
        error.response?.data?.detail ||
          error.response?.data?.non_field_errors?.[0] ||
          "Impossible de charger cet enregistrement d'avancement.",
      )
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.dossier) {
      showError('Sélectionnez un dossier.')
      return
    }
    setLoading(true)
    try {
      if (isEditing) {
        await editAvancementEntry(editingId, form)
        showSuccess('Progression modifiée.')
      } else {
        await updateAvancement(form)
        showSuccess('Progression mise à jour.')
      }
      navigate('/enquete')
    } catch (error) {
      console.error(error)
      showError(error.response?.data?.detail || 'Erreur lors de la mise à jour.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          {isEditing ? "Modifier l'avancement" : 'Suivi d’avancement'}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {isEditing ? 'Éditer la progression' : 'Mettre à jour la progression'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Évaluez l’état d’avancement du dossier et commentez les actions restantes.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-lg"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Dossier</label>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              value={form.dossier}
              onChange={(event) => handleChange('dossier', Number(event.target.value) || '')}
            >
              <option value="">Sélectionnez un dossier</option>
              {assignations.map((assignment) => (
                <option key={assignment.id} value={assignment?.dossier?.id}>
                  {assignment?.dossier?.numero_fiche} •{' '}
                  {[assignment?.dossier?.nom, assignment?.dossier?.prenom].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
            {selectedAssignment?.due_date ? (
              <p className="mt-2 text-xs text-slate-500">
                Date limite: {new Date(selectedAssignment.due_date).toLocaleDateString()}
              </p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Pourcentage</label>
            <div className="mt-4">
              <input
                type="range"
                min="0"
                max="100"
                value={form.pourcentage}
                onChange={(event) => handleChange('pourcentage', Number(event.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="mt-2 text-sm font-semibold text-slate-900">{form.pourcentage}%</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">Commentaire</label>
          <textarea
            rows={6}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            placeholder="Précisez les actions réalisées, blocages ou prochaines étapes..."
            value={form.commentaire}
            onChange={(event) => handleChange('commentaire', event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:border-red-300"
                onClick={async () => {
                  if (!editingId) return
                  const confirmed = await notification.showConfirm({
                    title: 'Supprimer cet avancement',
                    message:
                      "L’enregistrement sélectionné sera définitivement supprimé du dossier.\n\nSouhaitez-vous continuer ?",
                    confirmText: 'Supprimer',
                    cancelText: 'Annuler',
                  })
                  if (!confirmed) return
                  try {
                    await deleteAvancementEntry(editingId)
                    showSuccess('Avancement supprimé.')
                    navigate('/enquete')
                  } catch (error) {
                    console.error(error)
                    showError(
                      error.response?.data?.detail ||
                        error.response?.data?.non_field_errors?.[0] ||
                        "Impossible de supprimer cet avancement.",
                    )
                  }
                }}
              >
                Supprimer
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300"
              onClick={() => navigate('/enquete')}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white bg-[#5B4BFF] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(91,75,255,0.3)] transition hover:-translate-y-0.5 hover:bg-[#4a3fe0] focus:outline-none focus:ring-2 focus:ring-[#5B4BFF]/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              {isEditing ? 'Enregistrer les modifications' : 'Mettre à jour'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default MiseAJourAvancement

