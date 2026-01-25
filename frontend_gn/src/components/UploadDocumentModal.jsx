/**
 * Modal pour l'upload de documents/preuves
 * S'intègre dans le dashboard des enquêtes
 */
import React, { useState, useRef } from 'react'
import { X, Upload, FileText, Image as ImageIcon, Video, Music, File, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { createPreuve } from '../services/enqueteService'

const TYPE_OPTIONS = [
  { value: 'photo', label: 'Photo', icon: ImageIcon },
  { value: 'document', label: 'Document', icon: FileText },
]

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`
}

const UploadDocumentModal = ({ isOpen, onClose, dossierId, onSuccess }) => {
  const { showSuccess, showError } = useToast()
  const fileInputRef = useRef(null)
  
  const [form, setForm] = useState({
    type_preuve: 'photo',
    description: '',
    fichier: null,
  })
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Réinitialiser le formulaire quand le modal s'ouvre/ferme
  React.useEffect(() => {
    if (!isOpen) {
      setForm({
        type_preuve: 'photo',
        description: '',
        fichier: null,
      })
      setPreviewUrl(null)
      setDragActive(false)
    }
  }, [isOpen])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (file) => {
    if (!file) return

    // Vérifier la taille (max 10 MB)
    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (file.size > maxSize) {
      showError(`Le fichier est trop volumineux. Taille maximum : 10 MB`)
      return
    }

    // Vérifier le type de fichier
    const fileName = file.name.toLowerCase()
    const fileExtension = fileName.split('.').pop()
    const allowedExtensions = {
      // Images
      images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      // Documents Word
      word: ['doc', 'docx'],
      // PDF
      pdf: ['pdf'],
    }
    
    const allAllowed = [
      ...allowedExtensions.images,
      ...allowedExtensions.word,
      ...allowedExtensions.pdf,
    ]

    if (!allAllowed.includes(fileExtension)) {
      showError(
        `Type de fichier non autorisé. Formats acceptés : ` +
        `Photos (JPG, PNG, GIF, BMP, WEBP), ` +
        `Word (DOC, DOCX), PDF`
      )
      return
    }

    // Déterminer le type de preuve
    const isImage = allowedExtensions.images.includes(fileExtension)
    const isWord = allowedExtensions.word.includes(fileExtension)
    const isPdf = allowedExtensions.pdf.includes(fileExtension)

    setForm((prev) => ({
      ...prev,
      fichier: file,
      type_preuve: isImage ? 'photo' : 'document',
    }))

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
  }

  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileChange(file)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const removeFile = () => {
    setForm((prev) => ({ ...prev, fichier: null }))
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!dossierId) {
      showError('Aucun dossier sélectionné.')
      return
    }

    if (!form.fichier) {
      showError('Veuillez sélectionner un fichier.')
      return
    }

    setLoading(true)
    try {
      await createPreuve({
        dossier: dossierId,
        type_preuve: form.type_preuve,
        description: form.description,
        fichier: form.fichier,
      })
      
      showSuccess('Document ajouté avec succès.')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Erreur upload:', error)
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.fichier?.[0] ||
        "Erreur lors de l'ajout du document."
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Ajouter un document</h2>
            <p className="text-sm text-slate-500 mt-1">Téléversez une preuve ou un document</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            disabled={loading}
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type de preuve */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Type de document
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange('type_preuve', option.value)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                      form.type_preuve === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${
                      form.type_preuve === option.value ? 'text-blue-600' : 'text-slate-400'
                    }`} />
                    <span className={`font-medium ${
                      form.type_preuve === option.value ? 'text-blue-700' : 'text-slate-700'
                    }`}>
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Upload de fichier */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Fichier
            </label>
            {form.fichier ? (
              <div className="relative rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Aperçu"
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center bg-slate-200 rounded-lg">
                      <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{form.fichier.name}</p>
                    <p className="text-sm text-slate-500">{formatFileSize(form.fichier.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative rounded-xl border-2 border-dashed transition ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                }`}
              >
                <label className="flex flex-col items-center justify-center p-10 cursor-pointer">
                  <Upload className={`h-12 w-12 mb-4 ${
                    dragActive ? 'text-blue-600' : 'text-slate-400'
                  }`} />
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    {dragActive ? 'Déposez le fichier ici' : 'Déposez un fichier ou cliquez pour sélectionner'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Photos (JPG, PNG, GIF, BMP, WEBP) • Word (DOC, DOCX) • PDF
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Taille max 10 MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileInputChange}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp,image/webp,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description <span className="text-slate-400">(optionnel)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Décrivez le document ou la preuve..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !form.fichier}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#00B870] rounded-lg hover:bg-[#00a664] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Ajouter le document
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadDocumentModal

