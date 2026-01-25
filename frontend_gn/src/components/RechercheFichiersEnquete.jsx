/**
 * Composant de recherche de fichiers avec affichage direct
 * Affiche les fichiers et permet de les éditer au clic
 */
import React, { useState, useEffect, useMemo } from 'react'
import { Search, FileText, Image as ImageIcon, Video, Music, File, X, Edit2, Loader2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { fetchPreuves } from '../services/enqueteService'
import UploadDocumentModal from './UploadDocumentModal'

const TYPE_ICONS = {
  photo: ImageIcon,
  document: FileText,
  video: Video,
  audio: Music,
  autre: File,
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

const RechercheFichiersEnquete = ({ dossierId, onFileSelect }) => {
  const { showError } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [preuves, setPreuves] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPreuve, setSelectedPreuve] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Charger les preuves quand le dossier change
  useEffect(() => {
    if (dossierId) {
      loadPreuves()
    } else {
      setPreuves([])
    }
  }, [dossierId])

  const loadPreuves = async () => {
    if (!dossierId) return
    
    setLoading(true)
    try {
      const data = await fetchPreuves(dossierId)
      const list = Array.isArray(data) ? data : (data?.results || [])
      setPreuves(list)
    } catch (error) {
      console.error('Erreur chargement preuves:', error)
      showError('Impossible de charger les fichiers.')
    } finally {
      setLoading(false)
    }
  }

  // Filtrer les preuves selon la recherche
  const filteredPreuves = useMemo(() => {
    if (!searchQuery.trim()) {
      return preuves
    }

    const query = searchQuery.toLowerCase().trim()
    
    return preuves.filter((preuve) => {
      const description = (preuve.description || '').toLowerCase()
      const type = (preuve.type_preuve || '').toLowerCase()
      const fileName = (preuve.fichier || '').toLowerCase()
      
      return (
        description.includes(query) ||
        type.includes(query) ||
        fileName.includes(query)
      )
    })
  }, [preuves, searchQuery])

  const handleFileClick = (preuve) => {
    setSelectedPreuve(preuve)
    setEditModalOpen(true)
    if (onFileSelect) {
      onFileSelect(preuve)
    }
  }

  const handleEditSuccess = () => {
    loadPreuves()
    setEditModalOpen(false)
    setSelectedPreuve(null)
  }

  if (!dossierId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
        Sélectionnez un dossier pour voir les fichiers
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un fichier par nom, description ou type..."
          className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Résultats de recherche */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : filteredPreuves.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
          {searchQuery ? (
            <>
              <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p>Aucun fichier trouvé pour "{searchQuery}"</p>
            </>
          ) : (
            <>
              <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p>Aucun fichier dans ce dossier</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPreuves.map((preuve) => {
            const Icon = TYPE_ICONS[preuve.type_preuve] || FileText
            const fileUrl = preuve.fichier
            
            return (
              <div
                key={preuve.id}
                onClick={() => handleFileClick(preuve)}
                className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              >
                {/* Icône et type */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        {preuve.type_preuve || 'Document'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFileClick(preuve)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Modifier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                    {preuve.description && (
                      <p className="text-sm font-medium text-slate-900 mt-1 line-clamp-2">
                        {preuve.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Aperçu pour les images */}
                {preuve.type_preuve === 'photo' && fileUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={fileUrl}
                      alt={preuve.description || 'Photo'}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                )}

                {/* Informations */}
                <div className="space-y-1 text-xs text-slate-500">
                  {preuve.date_ajout && (
                    <p>Ajouté le {formatDate(preuve.date_ajout)}</p>
                  )}
                  {preuve.enqueteur?.full_name && (
                    <p>Par {preuve.enqueteur.full_name}</p>
                  )}
                </div>

                {/* Badge cliquable */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                    <Edit2 className="h-3 w-3" />
                    Cliquer pour modifier
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal d'édition */}
      {selectedPreuve && (
        <EditPreuveModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedPreuve(null)
          }}
          preuve={selectedPreuve}
          dossierId={dossierId}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}

/**
 * Modal pour éditer une preuve existante
 */
const EditPreuveModal = ({ isOpen, onClose, preuve, dossierId, onSuccess }) => {
  const { showSuccess, showError } = useToast()
  const [form, setForm] = useState({
    description: preuve?.description || '',
    type_preuve: preuve?.type_preuve || 'photo',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (preuve) {
      setForm({
        description: preuve.description || '',
        type_preuve: preuve.type_preuve || 'photo',
      })
    }
  }, [preuve])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!dossierId) {
      showError('Aucun dossier sélectionné.')
      return
    }

    setLoading(true)
    try {
      const { updatePreuve } = await import('../services/enqueteService')
      await updatePreuve(preuve.id, {
        dossier: dossierId,
        type_preuve: form.type_preuve,
        description: form.description,
        // Ne pas envoyer fichier si on ne le modifie pas
      })
      
      showSuccess('Fichier mis à jour avec succès.')
      onSuccess?.()
    } catch (error) {
      console.error('Erreur mise à jour:', error)
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        'Erreur lors de la mise à jour du fichier.'
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !preuve) return null

  const TYPE_OPTIONS = [
    { value: 'photo', label: 'Photo' },
    { value: 'document', label: 'Document' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Modifier le fichier</h2>
            <p className="text-sm text-slate-500 mt-1">Mettez à jour les informations du fichier</p>
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
          {/* Aperçu du fichier */}
          {preuve.fichier && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-4">
                {preuve.type_preuve === 'photo' ? (
                  <img
                    src={preuve.fichier}
                    alt={preuve.description || 'Fichier'}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center bg-slate-200 rounded-lg">
                    <FileText className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {preuve.fichier.split('/').pop()}
                  </p>
                  <p className="text-sm text-slate-500">
                    Fichier existant
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Type de preuve */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Type de document
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((option) => {
                const Icon = TYPE_ICONS[option.value] || FileText
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, type_preuve: option.value }))}
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

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
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
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#00B870] rounded-lg hover:bg-[#00a664] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RechercheFichiersEnquete

