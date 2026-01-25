import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Upload, ArrowLeft, Loader2, FileText, Trash2, Image as ImageIcon } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useNotification } from '../context/NotificationContext'
import { fetchAssignations } from '../services/assignationEnqueteService'
import {
  createPreuve,
  fetchPreuves,
  fetchPreuveDetail,
  updatePreuve,
  deletePreuve,
} from '../services/enqueteService'
import PreuveCard from '../components/PreuveCard'

const TYPE_OPTIONS = [
  { value: 'photo', label: 'Photo' },
  { value: 'document', label: 'Document' },
]

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`
}

const AjouterPreuve = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showSuccess, showError } = useToast()
  const notification = useNotification()

  const [assignations, setAssignations] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [preuves, setPreuves] = useState([])
  const [loadingPreuves, setLoadingPreuves] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)

  const [form, setForm] = useState({
    dossier: '',
    type_preuve: 'photo',
    description: '',
    fichier: null,
  })
  const [editingId, setEditingId] = useState(null)
  const [existingFile, setExistingFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const isEditing = Boolean(editingId)

  const selectedAssignment = useMemo(
    () => assignations.find((assignment) => assignment?.dossier?.id === Number(form.dossier)),
    [assignations, form.dossier],
  )

  useEffect(() => {
    const preselectedDossier = Number(searchParams.get('dossier'))
    if (preselectedDossier) {
      setForm((prev) => ({ ...prev, dossier: preselectedDossier }))
    }
  }, [searchParams])

  useEffect(() => {
    const preuveParam = Number(searchParams.get('preuve'))
    if (preuveParam) {
      loadPreuveDetail(preuveParam)
    } else {
      setEditingId(null)
      setExistingFile(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const loadAssignments = async () => {
      setLoadingAssignments(true)
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
      } finally {
        setLoadingAssignments(false)
      }
    }
    loadAssignments()
  }, [])

  const loadPreuveDetail = async (preuveId) => {
    try {
      setLoading(true)
      const data = await fetchPreuveDetail(preuveId)
      setEditingId(preuveId)
      const allowedTypes = TYPE_OPTIONS.map((option) => option.value)
      const nextType = allowedTypes.includes(data.type_preuve) ? data.type_preuve : allowedTypes[0]
      setForm((prev) => ({
        ...prev,
        dossier: data.dossier,
        type_preuve: nextType,
        description: data.description || '',
        fichier: null,
      }))
      setExistingFile(data.fichier || null)
    } catch (error) {
      console.error(error)
      showError(
        error.response?.data?.detail ||
          error.response?.data?.non_field_errors?.[0] ||
          "Impossible de charger cette preuve.",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      // Vérifier la taille (max 10 MB)
      const maxSize = 10 * 1024 * 1024 // 10 MB
      if (file.size > maxSize) {
        showError(`Le fichier est trop volumineux. Taille maximum : 10 MB`)
        return
      }

      // Vérifier le type de fichier
      const fileName = file.name.toLowerCase()
      const fileExtension = fileName.split('.').pop()
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'doc', 'docx', 'pdf']

      if (!allowedExtensions.includes(fileExtension)) {
        showError(
          `Type de fichier non autorisé. Formats acceptés : ` +
          `Photos (JPG, PNG, GIF, BMP, WEBP), Word (DOC, DOCX), PDF`
        )
        return
      }

      const isImage = file.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)
      setForm((prev) => ({
        ...prev,
        fichier: file,
        type_preuve: isImage ? 'photo' : 'document',
      }))
      setExistingFile(null)
      
      // Créer un aperçu pour les images
      if (isImage) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result)
        }
        reader.readAsDataURL(file)
      } else {
        setPreviewUrl(null)
      }
    } else {
      handleChange('fichier', null)
      setPreviewUrl(null)
    }
  }

  const removeSelectedFile = () => {
    setForm((prev) => ({ ...prev, fichier: null }))
    setFileInputKey((prev) => prev + 1)
    setExistingFile(null)
    setPreviewUrl(null)
  }

  const refreshPreuves = async (dossierId) => {
    if (!dossierId) {
      setPreuves([])
      return
    }
    setLoadingPreuves(true)
    try {
      const response = await fetchPreuves(dossierId)
      const list = response?.results || response || []
      setPreuves(list)
    } catch (error) {
      console.error(error)
      showError("Impossible de charger les preuves existantes.")
    } finally {
      setLoadingPreuves(false)
    }
  }

  useEffect(() => {
    if (form.dossier) {
      refreshPreuves(form.dossier)
    } else {
      setPreuves([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.dossier])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.dossier) {
      showError('Sélectionnez un dossier.')
      return
    }
    if (!form.fichier && !existingFile) {
      showError('Ajoutez un fichier de preuve.')
      return
    }
    setLoading(true)
    try {
      if (isEditing) {
        await updatePreuve(editingId, {
          dossier: form.dossier,
          type_preuve: form.type_preuve,
          description: form.description,
          fichier: form.fichier,
        })
        showSuccess('Preuve mise à jour.')
        navigate('/enquete')
      } else {
        await createPreuve(form)
        showSuccess('Preuve ajoutée avec succès.')
        setForm((prev) => ({
          ...prev,
          description: '',
          fichier: null,
        }))
        setFileInputKey((prev) => prev + 1)
        setPreviewUrl(null)
        refreshPreuves(form.dossier)
      }
    } catch (error) {
      console.error(error)
      const serverError =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.type_preuve?.[0] ||
        error.message
      showError(serverError || "Erreur lors de l'enregistrement de la preuve.")
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
          {isEditing ? 'Modifier une preuve' : 'Ajouter une preuve'}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {isEditing ? 'Mise à jour de la pièce' : 'Versement au dossier'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Seuls les dossiers disposant d’une assignation confirmée apparaissent ici.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-lg"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Dossier criminel</label>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              value={form.dossier}
              onChange={(event) => handleChange('dossier', Number(event.target.value) || '')}
              disabled={loadingAssignments}
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
              <p className="mt-1 text-xs text-slate-500">
                Échéance: {new Date(selectedAssignment.due_date).toLocaleDateString()}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Type de preuve</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handleChange('type_preuve', option.value)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    form.type_preuve === option.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              rows={6}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              value={form.description}
              onChange={(event) => handleChange('description', event.target.value)}
              placeholder="Détails importants concernant la pièce jointe..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Fichier à verser</label>
            {form.fichier ? (
              <div className="mt-2 space-y-3">
                {/* Aperçu pour les images */}
                {previewUrl && form.type_preuve === 'photo' ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Aperçu"
                        className="w-full rounded-xl object-cover max-h-64"
                      />
                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="absolute top-2 right-2 rounded-full bg-red-500 p-2 text-white shadow-lg transition hover:bg-red-600"
                        title="Supprimer cette image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-inner">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{form.fichier.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(form.fichier.size)}</p>
                        <p className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {form.fichier.type || 'application/octet-stream'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="rounded-full bg-red-50 p-2 text-red-500 transition hover:bg-red-100"
                        title="Supprimer ce fichier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : existingFile ? (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-inner">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Fichier actuel</p>
                    <a
                      href={existingFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-slate-600 underline"
                    >
                      Consulter
                    </a>
                    <p className="mt-2 text-xs text-slate-500">
                      Ajoutez un nouveau fichier pour le remplacer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExistingFile(null)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
                  >
                    Remplacer
                  </button>
                </div>
              </div>
            ) : (
              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-10 text-center text-slate-500 transition hover:border-slate-300 hover:bg-slate-50">
                <Upload className="h-10 w-10 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Déposez un fichier ou cliquez pour sélectionner
                </p>
                  <p className="mt-1 text-xs text-slate-500">
                  Photos (JPG, PNG, GIF, BMP, WEBP) • Word (DOC, DOCX) • PDF
                </p>
                <p className="mt-1 text-xs text-slate-400">Taille max 10 MB</p>
                <input 
                  key={fileInputKey} 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp,image/webp,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
              </label>
            )}
          </div>
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
                    title: 'Supprimer la preuve',
                    message:
                      "Cette pièce sera définitivement retirée du dossier.\n\nSouhaitez-vous confirmer cette suppression ?",
                    confirmText: 'Supprimer',
                    cancelText: 'Annuler',
                  })
                  if (!confirmed) return
                  try {
                    await deletePreuve(editingId)
                    showSuccess('Preuve supprimée.')
                    navigate('/enquete')
                  } catch (error) {
                    console.error(error)
                    showError(
                      error.response?.data?.detail ||
                        error.response?.data?.non_field_errors?.[0] ||
                        "Impossible de supprimer la preuve.",
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isEditing ? 'Mettre à jour la preuve' : 'Enregistrer la preuve'}
            </button>
          </div>
        </div>
      </form>

      <section className="space-y-4 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Pièces enregistrées
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">Aperçu immédiat</h2>
            <p className="text-sm text-slate-500">
              Toute nouvelle preuve ajoutée apparaît ci-dessous automatiquement.
            </p>
          </div>
          {form.dossier ? (
            <button
              type="button"
              onClick={() => refreshPreuves(form.dossier)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
            >
              Actualiser
            </button>
          ) : null}
        </div>

        {!form.dossier ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Sélectionnez un dossier pour afficher ses preuves.
          </div>
        ) : loadingPreuves ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : preuves.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Aucune preuve enregistrée pour ce dossier.
          </div>
        ) : (
          <div className="space-y-4">
            {preuves.map((preuve) => (
              <PreuveCard
                key={preuve.id}
                preuve={preuve}
                onEdit={() => navigate(`/enquete/preuves/ajouter?dossier=${form.dossier}&preuve=${preuve.id}`)}
                onDelete={async () => {
                  const proofLabel = preuve.description?.trim()
                    ? `"${preuve.description.trim().slice(0, 80)}"`
                    : `#${preuve.id}`
                  const confirmed = await notification.showConfirm({
                    title: 'Supprimer cette preuve',
                    message: `La preuve ${proofLabel} sera définitivement supprimée.\n\nConfirmer l'opération ?`,
                    confirmText: 'Supprimer',
                    cancelText: 'Annuler',
                  })
                  if (!confirmed) return
                  try {
                    await deletePreuve(preuve.id)
                    showSuccess('Preuve supprimée.')
                    refreshPreuves(form.dossier)
                  } catch (error) {
                    console.error(error)
                    showError(
                      error.response?.data?.detail ||
                        error.response?.data?.non_field_errors?.[0] ||
                        "Impossible de supprimer cette preuve.",
                    )
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default AjouterPreuve

