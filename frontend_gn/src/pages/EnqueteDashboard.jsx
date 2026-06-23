import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Presentation,
  Archive,
  Trash2,
  Download,
  Loader2,
  Search,
  X,
  Filter,
  ArrowLeft,
  Scale,
  Fingerprint,
  Brain,
  Monitor,
  Shield,
  MapPin,
  FlaskConical,
  Banknote,
  Layers,
  FolderOpen,
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import {
  fetchDocumentsEnquete,
  fetchDocumentsStats,
  uploadDocumentEnquete,
  deleteDocumentEnquete,
  getDocumentDownloadUrl,
} from '../services/enqueteService'
import { get } from '../services/apiGlobal'
import ModalConfirmation from '../components/commun/ModalConfirmation'

// ── Categories d'enquete ───────────────────────────────────────────────
const CATEGORIES = [
  { key: 'judiciaire', label: 'Enquete judiciaire', icon: Scale, gradient: 'from-blue-600 to-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', ring: 'ring-blue-400' },
  { key: 'criminelle', label: 'Enquete criminelle', icon: Fingerprint, gradient: 'from-red-600 to-red-700', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-400' },
  { key: 'criminologique', label: 'Enquete criminologique', icon: Brain, gradient: 'from-purple-600 to-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', ring: 'ring-purple-400' },
  { key: 'numerique', label: 'Enquete numerique', icon: Monitor, gradient: 'from-cyan-600 to-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', ring: 'ring-cyan-400' },
  { key: 'renseignement', label: 'Enquete de renseignement', icon: Shield, gradient: 'from-slate-600 to-slate-700', bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', ring: 'ring-slate-400' },
  { key: 'terrain', label: 'Enquete de terrain', icon: MapPin, gradient: 'from-green-600 to-green-700', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', ring: 'ring-green-400' },
  { key: 'scientifique', label: 'Enquete scientifique', icon: FlaskConical, gradient: 'from-indigo-600 to-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', ring: 'ring-indigo-400' },
  { key: 'financiere', label: 'Enquete financiere', icon: Banknote, gradient: 'from-amber-600 to-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-400' },
  { key: 'mixte', label: 'Enquete mixte', icon: Layers, gradient: 'from-teal-600 to-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', ring: 'ring-teal-400' },
]

// ── Constantes fichiers ────────────────────────────────────────────────
const TYPE_ICONS = {
  excel: FileSpreadsheet, word: FileText, pdf: FileText, powerpoint: Presentation,
  image: FileImage, csv: FileSpreadsheet, archive: Archive, autre: File,
}
const TYPE_COLORS = {
  excel: 'bg-green-100 text-green-700 border-green-200',
  word: 'bg-blue-100 text-blue-700 border-blue-200',
  pdf: 'bg-red-100 text-red-700 border-red-200',
  powerpoint: 'bg-orange-100 text-orange-700 border-orange-200',
  image: 'bg-purple-100 text-purple-700 border-purple-200',
  csv: 'bg-teal-100 text-teal-700 border-teal-200',
  archive: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  autre: 'bg-slate-100 text-slate-700 border-slate-200',
}
const TYPE_LABELS = {
  excel: 'Excel', word: 'Word', pdf: 'PDF', powerpoint: 'PowerPoint',
  image: 'Image', csv: 'CSV', archive: 'Archive', autre: 'Autre',
}

const ACCEPTED_EXTENSIONS =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.csv,.txt,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.zip,.rar,.7z'

function getTypeFromExt(ext) {
  const map = {
    xls: 'excel', xlsx: 'excel', doc: 'word', docx: 'word', odt: 'word',
    pdf: 'pdf', ppt: 'powerpoint', pptx: 'powerpoint', odp: 'powerpoint',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', bmp: 'image', webp: 'image',
    csv: 'csv', ods: 'csv', zip: 'archive', rar: 'archive', '7z': 'archive',
  }
  return map[ext] || 'autre'
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

const formatDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Composant principal ────────────────────────────────────────────────
const EnqueteDashboard = () => {
  const { showSuccess, showError } = useToast()
  const { utilisateur } = useAuth()
  const fileInputRef = useRef(null)

  const [activeCategory, setActiveCategory] = useState(null)
  const [stats, setStats] = useState({})
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [fichiers, setFichiers] = useState([])
  const [description, setDescription] = useState('')

  const [confirmDialog, setConfirmDialog] = useState({
    open: false, title: '', message: '', onConfirm: null,
  })

  // Charger les stats au montage
  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true)
      try {
        const data = await fetchDocumentsStats()
        setStats(data || {})
      } catch {
        // silencieux
      } finally {
        setLoadingStats(false)
      }
    }
    loadStats()
  }, [])

  // Charger les documents quand la categorie change
  const loadDocuments = useCallback(async () => {
    if (!activeCategory) { setDocuments([]); return }
    setLoading(true)
    try {
      const data = await fetchDocumentsEnquete({
        categorie: activeCategory,
        search: searchQuery || undefined,
        type_document: filterType || undefined,
      })
      setDocuments(Array.isArray(data) ? data : data.results || [])
    } catch {
      showError('Impossible de charger les documents.')
    } finally {
      setLoading(false)
    }
  }, [activeCategory, searchQuery, filterType, showError])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  const handleSelectCategory = (key) => {
    if (activeCategory === key) {
      setActiveCategory(null)
    } else {
      setActiveCategory(key)
      setFichiers([])
      setDescription('')
      setSearchQuery('')
      setFilterType('')
    }
  }

  // ── Upload logic ───────────────────────────────────────────────────
  const handleFileSelect = (files) => {
    const maxSize = 50 * 1024 * 1024
    const valid = Array.from(files).filter((f) => {
      if (f.size > maxSize) { showError(`${f.name} depasse 50 MB.`); return false }
      return true
    })
    if (valid.length) setFichiers((prev) => [...prev, ...valid])
  }

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    if (e.dataTransfer.files?.length) handleFileSelect(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (!activeCategory) return
    if (fichiers.length === 0) { showError('Ajoutez au moins un fichier.'); return }
    setUploading(true)
    let ok = 0
    try {
      for (const f of fichiers) {
        try {
          await uploadDocumentEnquete({
            categorie: activeCategory,
            nom: f.name.replace(/\.[^/.]+$/, ''),
            type_document: 'autre',
            description,
            fichier: f,
          })
          ok++
        } catch (err) {
          showError(err.response?.data?.fichier?.[0] || err.response?.data?.detail || `Erreur: ${f.name}`)
        }
      }
      if (ok > 0) {
        showSuccess(`${ok} document${ok > 1 ? 's' : ''} enregistre${ok > 1 ? 's' : ''}.`)
        setFichiers([]); setDescription('')
        loadDocuments()
        setStats((prev) => ({ ...prev, [activeCategory]: (prev[activeCategory] || 0) + ok }))
      }
    } finally { setUploading(false) }
  }

  const handleDelete = (doc) => {
    setConfirmDialog({
      open: true,
      title: 'Supprimer ce document ?',
      message: `"${doc.nom}" sera definitivement supprime.`,
      onConfirm: async () => {
        try {
          await deleteDocumentEnquete(doc.id)
          showSuccess('Document supprime.')
          loadDocuments()
          setStats((prev) => ({
            ...prev,
            [activeCategory]: Math.max(0, (prev[activeCategory] || 1) - 1),
          }))
        } catch { showError('Impossible de supprimer.') }
        setConfirmDialog((p) => ({ ...p, open: false }))
      },
    })
  }

  const handleDownload = async (doc) => {
    try {
      if (doc.fichier_url) {
        const link = document.createElement('a')
        link.href = doc.fichier_url
        link.download = doc.nom_fichier_original || doc.nom
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }
      const url = getDocumentDownloadUrl(doc.id)
      const resp = await get(url, { responseType: 'blob' })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(new Blob([resp.data]))
      link.download = doc.nom_fichier_original || doc.nom
      link.click()
      window.URL.revokeObjectURL(link.href)
    } catch { showError('Impossible de telecharger.') }
  }

  const activeCatObj = CATEGORIES.find((c) => c.key === activeCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500 font-semibold">
            MODULE ENQUETE
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Gestion des documents
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {utilisateur?.prenom ? `${utilisateur.prenom}, ` : ''}
            selectionnez une categorie pour ajouter et gerer vos fichiers
          </p>
        </div>

        {/* ── Grille des 9 panneaux ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.key
            const count = stats[cat.key] || 0
            return (
              <button
                key={cat.key}
                onClick={() => handleSelectCategory(cat.key)}
                className={`relative group text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                  isActive
                    ? `${cat.border} ${cat.bg} ring-2 ${cat.ring} shadow-lg scale-[1.02]`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`rounded-xl p-3 bg-gradient-to-br ${cat.gradient} shadow-md`}>
                    <Icon className="h-6 w-6 text-white" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-bold ${isActive ? cat.text : 'text-slate-900'}`}>
                      {cat.label}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {loadingStats ? '...' : `${count} document${count !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {isActive && (
                    <div className={`rounded-full p-1 ${cat.bg}`}>
                      <FolderOpen className={`h-4 w-4 ${cat.text}`} />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Contenu de la categorie selectionnee ──────────────────── */}
        {activeCategory && activeCatObj && (
          <div className="space-y-5">
            {/* Titre section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveCategory(null)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-500"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className={`rounded-xl p-2.5 bg-gradient-to-br ${activeCatObj.gradient}`}>
                  <activeCatObj.icon className="h-5 w-5 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{activeCatObj.label}</h2>
                  <p className="text-xs text-slate-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Zone d'upload compacte */}
            <div className={`rounded-2xl border ${activeCatObj.border} ${activeCatObj.bg} p-4`}>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-lg border-2 border-dashed transition cursor-pointer ${
                  dragActive
                    ? `${activeCatObj.border} bg-white/80`
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-center gap-3 py-4 px-4">
                  <Upload className={`h-5 w-5 ${dragActive ? activeCatObj.text : 'text-slate-400'}`} />
                  <p className="text-sm text-slate-600">
                    Glissez vos fichiers ici ou <span className="font-semibold text-slate-800">cliquez pour parcourir</span>
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept={ACCEPTED_EXTENSIONS}
                  onChange={(e) => {
                    if (e.target.files?.length) handleFileSelect(e.target.files)
                    e.target.value = ''
                  }}
                />
              </div>

              {fichiers.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {fichiers.map((file, idx) => {
                      const ext = file.name.split('.').pop()?.toLowerCase() || ''
                      const tk = getTypeFromExt(ext)
                      const FIcon = TYPE_ICONS[tk] || File
                      return (
                        <div key={`${file.name}-${idx}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <div className={`rounded p-1 ${TYPE_COLORS[tk]}`}><FIcon className="h-3.5 w-3.5" /></div>
                          <p className="flex-1 text-sm text-slate-800 truncate">{file.name}</p>
                          <span className="text-xs text-slate-400 whitespace-nowrap">{formatFileSize(file.size)}</span>
                          <button onClick={() => setFichiers((p) => p.filter((_, i) => i !== idx))} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => { setFichiers([]); setDescription('') }}
                      disabled={uploading}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition disabled:opacity-50 bg-gradient-to-r ${activeCatObj.gradient} hover:opacity-90`}
                    >
                      {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement...</> : <>Enregistrer{fichiers.length > 1 ? ` (${fichiers.length})` : ''}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Barre de recherche */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-500 appearance-none cursor-pointer"
                >
                  <option value="">Tous</option>
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Liste des documents */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className={`rounded-2xl p-4 mb-4 bg-gradient-to-br ${activeCatObj.gradient}`}>
                    <activeCatObj.icon className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-slate-700 font-semibold">Aucun document</p>
                  <p className="text-sm text-slate-500 mt-1 text-center max-w-sm">
                    Glissez-deposez des fichiers dans la zone ci-dessus pour commencer.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {documents.map((doc) => {
                    const tk = doc.type_document || 'autre'
                    const FIcon = TYPE_ICONS[tk] || File
                    return (
                      <div key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition group">
                        <div className={`flex-shrink-0 rounded-xl p-3 border ${TYPE_COLORS[tk]}`}>
                          <FIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{doc.nom}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                            <span className={`inline-flex px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[tk]}`}>
                              {TYPE_LABELS[tk] || 'Autre'}
                            </span>
                            <span>{formatFileSize(doc.taille_fichier)}</span>
                            <span>{formatDate(doc.date_ajout)}</span>
                            {doc.ajoute_par_detail && <span>par {doc.ajoute_par_detail.full_name}</span>}
                          </div>
                          {doc.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{doc.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => handleDownload(doc)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Telecharger">
                            <Download className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(doc)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ModalConfirmation
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog((p) => ({ ...p, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="warning"
        confirmText="Supprimer"
        cancelText="Annuler"
        showCancel
      />
    </div>
  )
}

export default EnqueteDashboard
