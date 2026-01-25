import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileSignature, ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useNotification } from '../context/NotificationContext'
import { fetchAssignations } from '../services/assignationEnqueteService'
import { createRapport, fetchRapportDetail, updateRapport, deleteRapport } from '../services/enqueteService'

const STATUT_OPTIONS = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'soumis', label: 'Soumis' },
  { value: 'valide', label: 'Validé' },
]

const AjouterRapport = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showSuccess, showError } = useToast()
  const notification = useNotification()

  const [assignations, setAssignations] = useState([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    dossier: '',
    titre: '',
    contenu: '',
    statut: 'brouillon',
  })
  const [editingId, setEditingId] = useState(null)
  const isEditing = Boolean(editingId)

  const selectedAssignment = useMemo(
    () => assignations.find((assignment) => assignment?.dossier?.id === Number(form.dossier)),
    [assignations, form.dossier],
  )

  useEffect(() => {
    const dossierQuery = Number(searchParams.get('dossier'))
    if (dossierQuery) {
      setForm((prev) => ({ ...prev, dossier: dossierQuery }))
    }
  }, [searchParams])

  useEffect(() => {
    const rapportId = Number(searchParams.get('rapport'))
    if (rapportId) {
      loadRapportDetail(rapportId)
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

  const loadRapportDetail = async (rapportId) => {
    try {
      const data = await fetchRapportDetail(rapportId)
      setEditingId(rapportId)
      setForm({
        dossier: data.dossier,
        titre: data.titre,
        contenu: data.contenu,
        statut: data.statut,
      })
    } catch (error) {
      console.error(error)
      showError(
        error.response?.data?.detail ||
          error.response?.data?.non_field_errors?.[0] ||
          'Impossible de charger ce rapport.',
      )
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.dossier || !form.titre || !form.contenu) {
      showError('Complétez tous les champs requis.')
      return
    }
    setLoading(true)
    try {
      if (isEditing) {
        await updateRapport(editingId, form)
        showSuccess('Rapport mis à jour.')
      } else {
        await createRapport(form)
        showSuccess('Rapport enregistré avec succès.')
      }
      navigate('/enquete')
    } catch (error) {
      console.error(error)
      showError(error.response?.data?.detail || 'Erreur lors de la création du rapport.')
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
          {isEditing ? 'Modifier un rapport' : 'Rapport d’enquête'}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {isEditing ? 'Mise à jour du rapport' : 'Nouvelle rédaction'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Documentez vos analyses, conclusions et recommandations opérationnelles.
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
            {selectedAssignment?.instructions ? (
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                Instructions: {selectedAssignment.instructions}
              </p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Statut</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handleChange('statut', option.value)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    form.statut === option.value
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">Titre</label>
          <input
            type="text"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            placeholder="Ex: Rapport d’analyse des communications interceptées"
            value={form.titre}
            onChange={(event) => handleChange('titre', event.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700">Contenu détaillé</label>
          <textarea
            rows={8}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            placeholder="Résumez les éléments, analyses, risques, actions recommandées..."
            value={form.contenu}
            onChange={(event) => handleChange('contenu', event.target.value)}
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
                    title: 'Supprimer le rapport',
                    message:
                      'Ce rapport et son historique seront définitivement supprimés du dossier.\n\nSouhaitez-vous confirmer ?',
                    confirmText: 'Supprimer',
                    cancelText: 'Annuler',
                  })
                  if (!confirmed) return
                  try {
                    await deleteRapport(editingId)
                    showSuccess('Rapport supprimé.')
                    navigate('/enquete')
                  } catch (error) {
                    console.error(error)
                    showError(
                      error.response?.data?.detail ||
                        error.response?.data?.non_field_errors?.[0] ||
                        'Impossible de supprimer ce rapport.',
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              {isEditing ? 'Mettre à jour le rapport' : 'Sauvegarder le rapport'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default AjouterRapport

