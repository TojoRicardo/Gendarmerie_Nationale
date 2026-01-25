import { useMemo, useState, useRef, useEffect } from 'react'
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Camera,
  ChevronDown,
  ChevronUp,
  Clock,
  Image as ImageIcon,
  MonitorPlay,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react'
import { rechercherCorrespondance } from './services/arcfaceService'
import ReconnaissanceTempsReelStandalone from './ReconnaissanceTempsReel.jsx'
import api from '../../services/api'

const MODES = [
  {
    id: 'photo',
    label: 'Recherche par Photo',
    description: 'Upload d’une image pour identification',
    icon: ImageIcon,
  },
  {
    id: 'stream',
    label: 'Streaming Temps Réel',
    description: 'Reconnaissance via webcam en direct',
    icon: MonitorPlay,
  },
]

const formatBytes = (bytes) => {
  if (!bytes) return '0 Ko'
  return `${(bytes / 1024).toFixed(1)} Ko`
}

const ReconnaissanceDashboard = () => {
  const [mode, setMode] = useState('photo')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [threshold, setThreshold] = useState(0.7) // 70%
  const [uploadedFile, setUploadedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState([])
  const [statusMessage, setStatusMessage] = useState('Aucune correspondance trouvée dans la base de données')
  const [elapsed, setElapsed] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)
  const [history, setHistory] = useState([])
  const [landmarks106, setLandmarks106] = useState(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  const activeResults = mode === 'photo' ? results : []

  const thresholdPercent = useMemo(() => Math.round(threshold * 100), [threshold])
  const FACE_NOT_DETECTED_MESSAGE =
    "Aucun visage humain détecté dans l’image. Veuillez importer une photo valide."
  const NO_MATCH_MESSAGE = 'Aucun individu correspondant trouvé dans la base de données.'

  const resetPhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setUploadedFile(null)
    setPreviewUrl(null)
    setResults([])
    setLandmarks106(null)
    setStatusMessage('Importez une photo puis lancez la reconnaissance ArcFace.')
    setElapsed(0)
    setErrorMessage(null)
    
    // Nettoyer le canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  // Fonction pour obtenir les connexions du maillage facial (106 landmarks)
  const getFaceMeshConnections = () => {
    // Connexions pour créer un maillage facial
    // Basé sur la structure standard des 106 landmarks
    const connections = []
    
    // Contour du visage (jawline) - points 0-16
    for (let i = 0; i < 16; i++) {
      connections.push([i, i + 1])
    }
    
    // Sourcil droit - points 17-21
    for (let i = 17; i < 21; i++) {
      connections.push([i, i + 1])
    }
    
    // Sourcil gauche - points 22-26
    for (let i = 22; i < 26; i++) {
      connections.push([i, i + 1])
    }
    
    // Nez - points 27-35
    for (let i = 27; i < 35; i++) {
      connections.push([i, i + 1])
    }
    
    // Œil droit - points 36-41
    for (let i = 36; i < 41; i++) {
      connections.push([i, i + 1])
    }
    connections.push([41, 36]) // Fermer l'œil
    
    // Œil gauche - points 42-47
    for (let i = 42; i < 47; i++) {
      connections.push([i, i + 1])
    }
    connections.push([47, 42]) // Fermer l'œil
    
    // Bouche extérieure - points 48-59
    for (let i = 48; i < 59; i++) {
      connections.push([i, i + 1])
    }
    connections.push([59, 48]) // Fermer la bouche
    
    // Bouche intérieure - points 60-67
    for (let i = 60; i < 67; i++) {
      connections.push([i, i + 1])
    }
    connections.push([67, 60]) // Fermer la bouche intérieure
    
    // Lignes verticales pour créer un maillage
    // Ligne centrale verticale
    connections.push([27, 30]) // Nez
    connections.push([30, 33]) // Nez
    connections.push([33, 51]) // Vers la bouche
    connections.push([51, 57]) // Vers la bouche
    
    // Lignes horizontales pour créer un maillage
    // Entre les yeux
    connections.push([36, 42]) // Coin œil droit vers coin œil gauche
    connections.push([39, 45]) // Autre coin
    
    // Lignes diagonales pour le maillage
    // Contours du visage vers les yeux
    connections.push([0, 36]) // Mâchoire vers œil droit
    connections.push([16, 45]) // Mâchoire vers œil gauche
    
    // Lignes supplémentaires pour densifier le maillage
    // Entre les points du visage
    for (let i = 0; i < 16; i += 2) {
      if (i + 2 <= 16) {
        connections.push([i, i + 2])
      }
    }
    
    // Maillage autour des yeux
    for (let i = 36; i < 48; i++) {
      if (i < 42) {
        // Œil droit
        if (i % 2 === 0 && i + 2 < 42) {
          connections.push([i, i + 2])
        }
      } else {
        // Œil gauche
        if (i % 2 === 0 && i + 2 < 48) {
          connections.push([i, i + 2])
        }
      }
    }
    
    return connections
  }

  // Fonction pour dessiner les landmarks et le bounding box sur le canvas
  const dessinerLandmarks = (landmarks, bbox) => {
    const canvas = canvasRef.current
    const imageElement = imageRef.current
    
    if (!canvas || !imageElement || !landmarks || landmarks.length === 0) {
      return
    }

    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      const displayedWidth = imageElement.offsetWidth || imageElement.clientWidth
      const displayedHeight = imageElement.offsetHeight || imageElement.clientHeight
      const scaleX = displayedWidth / img.width
      const scaleY = displayedHeight / img.height

      canvas.width = displayedWidth
      canvas.height = displayedHeight

      // Convertir les landmarks en coordonnées affichées
      const scaledLandmarks = landmarks.map((point) => {
        if (point && point.length === 2) {
          return {
            x: point[0] * scaleX,
            y: point[1] * scaleY
          }
        }
        return null
      }).filter(p => p !== null)

      // Dessiner les 106 landmarks (points sur le visage)
      ctx.fillStyle = '#ff0000' // Rouge pour les landmarks
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 0.5
      scaledLandmarks.forEach((point) => {
        if (point) {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
          ctx.fill()
          ctx.stroke()
        }
      })
    }
    
    if (previewUrl) {
      img.src = previewUrl
    }
  }

  // Redessiner les landmarks automatiquement quand landmarks106 ou previewUrl change
  useEffect(() => {
    if (landmarks106 && landmarks106.landmarks && previewUrl) {
      const drawLandmarksWithRetry = (attempts = 0) => {
        if (attempts > 5) return // Maximum 5 tentatives
        
        setTimeout(() => {
          const canvas = canvasRef.current
          const imageElement = imageRef.current
          
          if (canvas && imageElement && imageElement.complete && imageElement.naturalWidth > 0) {
            dessinerLandmarks(landmarks106.landmarks, landmarks106.bbox)
          } else {
            drawLandmarksWithRetry(attempts + 1)
          }
        }, 50 * (attempts + 1))
      }
      
      drawLandmarksWithRetry()
    }
  }, [landmarks106, previewUrl])

  // Redessiner les landmarks lors du redimensionnement
  useEffect(() => {
    const handleResize = () => {
      if (landmarks106 && landmarks106.landmarks) {
        dessinerLandmarks(landmarks106.landmarks, landmarks106.bbox)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [landmarks106, previewUrl])

  const handleFileSelect = async (event) => {
    const file = Array.from(event.target.files || []).find((f) => f.type.startsWith('image/'))
    if (!file) {
      setErrorMessage('Veuillez sélectionner une image valide.')
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setUploadedFile(file)
    const newPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(newPreviewUrl)
    setStatusMessage('Photo prête. Analyse des landmarks en cours…')
    setErrorMessage(null)
    setLandmarks106(null) // Réinitialiser les landmarks précédents

    // Analyser automatiquement les 106 landmarks dès qu'une photo est ajoutée
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await api.post('/biometrie/landmarks106/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success && response.data.landmarks) {
        setLandmarks106(response.data)
        setStatusMessage('Photo prête. Lancez la reconnaissance ArcFace.')
        
        // Dessiner les landmarks sur le canvas - utiliser plusieurs tentatives
        const drawLandmarksWithRetry = (attempts = 0) => {
          if (attempts > 5) return // Maximum 5 tentatives
          
          setTimeout(() => {
            const canvas = canvasRef.current
            const imageElement = imageRef.current
            
            if (canvas && imageElement && imageElement.complete && imageElement.naturalWidth > 0) {
              dessinerLandmarks(response.data.landmarks, response.data.bbox)
            } else {
              drawLandmarksWithRetry(attempts + 1)
            }
          }, 50 * (attempts + 1))
        }
        
        drawLandmarksWithRetry()
      } else {
        setStatusMessage('Photo prête. Lancez la reconnaissance ArcFace.')
      }
    } catch (error) {
      // Si l'analyse landmarks échoue, on continue quand même
      console.warn('Erreur analyse 106 landmarks:', error)
      setStatusMessage('Photo prête. Lancez la reconnaissance ArcFace.')
    }
  }

  const searchPhoto = async () => {
    if (!uploadedFile) {
      setErrorMessage('Ajoutez une photo avant de lancer la reconnaissance.')
      return
    }

    setProcessing(true)
    setErrorMessage(null)

    const start = performance.now()
    
    try {
      setStatusMessage('Recherche en cours dans la base de données…')

      // Lancer uniquement la recherche ArcFace (les landmarks sont déjà analysés lors de l'ajout de la photo)
      const analysis = await rechercherCorrespondance(uploadedFile, { threshold })

      const end = performance.now()
      setElapsed(analysis.searchTime || (end - start) / 1000)

      // Traiter les résultats de la recherche
      const matches = analysis.matches || []
      if (matches.length === 0) {
        setResults([])
        setStatusMessage('Aucun criminel trouvé dans la base de données.')
      } else {
        setResults(matches)
        setStatusMessage(
          analysis.message || `${matches.length} criminel(s) trouvé(s) dans la base de données.`
        )
      }

      setHistory((prev) => [
        {
          id: `photo-${Date.now()}`,
          time: new Date(),
          mode: 'photo',
          matches: matches.length,
          threshold: analysis.thresholdPercent ?? thresholdPercent,
        },
        ...prev,
      ])
    } catch (error) {
      console.error('Erreur recherche photo ArcFace:', error)
      const end = performance.now()
      setElapsed((end - start) / 1000)
      const status = error?.response?.status ?? error?.status
      const backendMessage = error?.response?.data?.message

      if (status === 400) {
        const message = FACE_NOT_DETECTED_MESSAGE
        setErrorMessage(message)
        setStatusMessage(message)
      } else if (status === 404) {
        setResults([])
        setStatusMessage('Aucun criminel trouvé dans la base de données.')
        setErrorMessage(null)
      } else {
        const fallbackMessage =
          backendMessage || error?.userMessage || error?.message || 'Erreur inattendue durant l\'analyse.'
        setErrorMessage(fallbackMessage)
        setStatusMessage(fallbackMessage)
      }
      setResults([])
    } finally {
      setProcessing(false)
    }
  }

  const renderModeButtons = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      {MODES.map((entry) => {
        const Icon = entry.icon
        const isActive = mode === entry.id
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              setMode(entry.id)
              setErrorMessage(null)
            }}
            className={`flex flex-col items-start rounded-2xl border px-5 py-4 text-left transition ${
              isActive
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            <span
              className={`mb-3 inline-flex items-center justify-center rounded-full border p-3 ${
                isActive ? 'border-blue-200 bg-white text-blue-600' : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              <Icon size={22} />
            </span>
            <span className={`text-base font-semibold ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
              {entry.label}
            </span>
            <span className="mt-1 text-xs text-gray-600">{entry.description}</span>
          </button>
        )
      })}
    </div>
  )

  const renderAdvancedSettings = () => (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setAdvancedOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold text-gray-800"
      >
        Paramètres Avancés
        {advancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {advancedOpen && (
        <div className="border-t border-gray-100 px-6 py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Seuil ArcFace</span>
              <span className="font-semibold text-gray-900">{thresholdPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={thresholdPercent}
              onChange={(event) => setThreshold(Number(event.target.value) / 100)}
              className="mt-3 w-full accent-blue-600"
            />
            <p className="mt-2 text-xs text-gray-500">
              Ajustez le seuil de similarité. Un seuil plus faible détecte davantage de correspondances mais augmente le bruit.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const renderPhotoPanel = () => (
    <div className="rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-6 py-8">
      {previewUrl ? (
        <div className="mx-auto flex max-w-md flex-col items-center space-y-4">
          <div className="relative w-full overflow-hidden rounded-3xl border border-white shadow-lg">
            <div className="relative">
              <img 
                ref={imageRef}
                src={previewUrl} 
                alt="Photo sélectionnée" 
                className="w-full object-cover" 
              />
              {/* Canvas superposé pour les 106 landmarks */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
            </div>
            {/* Badge landmarks si analysé */}
            {landmarks106 && (
              <div className="absolute top-4 right-14 px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-lg">
                ✓ 106 pts
              </div>
            )}
            <button
              type="button"
              onClick={resetPhoto}
              className="absolute right-4 top-4 rounded-full bg-red-500/90 p-2 text-white shadow-lg hover:bg-red-600"
              aria-label="Supprimer la photo"
            >
              <X size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={searchPhoto}
            disabled={processing}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? (
              <Activity className="mr-2 animate-spin" size={18} />
            ) : (
              <span role="img" aria-hidden className="mr-2">
                🔍
              </span>
            )}
            Lancer Reconnaissance ArcFace
          </button>

          <label
            htmlFor="change-photo"
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50"
          >
            <RefreshCw className="mr-2" size={16} />
            Changer de Photo
            <input id="change-photo" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </label>
        </div>
      ) : (
        <label
          htmlFor="photo-upload"
          className="mx-auto flex max-w-lg cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-300 bg-white/60 px-6 py-14 text-center transition hover:border-blue-400 hover:bg-white"
        >
          <Upload className="mb-4 text-blue-500" size={36} />
          <p className="text-sm font-semibold text-gray-800">Déposez une photo ou cliquez pour parcourir</p>
          <p className="mt-1 text-xs text-gray-500">
            Formats acceptés : JPG, PNG, WebP — Taille maximale recommandée 5 Mo.
          </p>
          <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </label>
      )}
    </div>
  )

  const renderStreamPanel = () => (
    <div className="rounded-3xl border border-blue-100 bg-white/80 px-6 py-6 shadow-sm">
      <ReconnaissanceTempsReelStandalone />
    </div>
  )

  const renderMetrics = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5">
        <p className="text-xs font-semibold uppercase text-emerald-700">Correspondances</p>
        <p className="mt-3 text-3xl font-bold text-emerald-900">{activeResults.length}</p>
      </div>
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-5">
        <p className="text-xs font-semibold uppercase text-blue-700">Temps</p>
        <p className="mt-3 text-3xl font-bold text-blue-900">{elapsed.toFixed(2)}s</p>
      </div>
      <div className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-5">
        <p className="text-xs font-semibold uppercase text-purple-700">Seuil</p>
        <p className="mt-3 text-3xl font-bold text-purple-900">{thresholdPercent}%</p>
      </div>
      <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-5">
        <p className="text-xs font-semibold uppercase text-orange-700">Modèle</p>
        <p className="mt-3 text-lg font-semibold text-orange-900">ArcFace</p>
      </div>
    </div>
  )

  const renderResults = () => (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-6">
      <div className="flex items-center justify-between text-xs text-emerald-700">
        <div className="inline-flex items-center space-x-2 font-semibold uppercase">
          <BadgeCheck size={16} />
          <span>Résultats ArcFace</span>
        </div>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>

      <div className="mt-6 space-y-6">
        {renderMetrics()}

        <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-6 text-center text-sm text-gray-600">
          {statusMessage}
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-4 text-xs text-gray-500">
          <p>
            Modèle&nbsp;: ArcFace (ResNet-100) | Version&nbsp;: 2.0 | Précision&nbsp;: 99.83% (LFW) | Norme&nbsp;:
            ISO/IEC 30107-3:2017 (PAD)
          </p>
        </div>

        {activeResults.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeResults.map((match, index) => {
              const displayName =
                match.label || `${match.nom || ''} ${match.prenom || ''}`.trim() || `Correspondance #${index + 1}`
              const similarityText =
                match.similarityText ||
                match.confidenceText ||
                `${(match.similarityPercent ?? match.confidencePercent ?? 0).toFixed(1)}%`

              return (
                <article
                  key={match.id ?? index}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                    {match.verified && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Seuil atteint
                      </span>
                    )}
                  </div>

                  {(match.photoUrl || match.photo_url) && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-gray-100">
                      <img
                        src={match.photoUrl || match.photo_url}
                        alt={displayName}
                        className="h-32 w-full object-cover"
                      />
                    </div>
                  )}

                  <p className="mt-3 text-sm text-gray-700">
                    Similarité&nbsp;:{' '}
                    <span className="font-semibold text-green-600">{similarityText}</span>
                  </p>

                  {match.ficheUrl && (
                    <a
                      href={match.ficheUrl}
                      className="mt-3 inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Voir la fiche complète
                    </a>
                  )}
                </article>
              )
            })}
          </div>
        ) : !processing && statusMessage.includes('Aucun criminel') ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-gray-700">Aucun criminel trouvé dans la base de données.</p>
          </div>
        ) : null}
      </div>
    </div>
  )

  const renderHistory = () => (
    <div className="rounded-3xl border border-gray-200 bg-white px-6 py-5">
      <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
        <span>Historique Récent</span>
        <span className="text-xs text-gray-500">{history.length} résultat(s)</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-gray-700">
        {history.length === 0 && <li>Aucun historique pour le moment.</li>}
        {history.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
            <div className="flex items-center space-x-3 text-sm">
              <Clock size={16} className="text-gray-500" />
              <div>
                <p className="font-semibold text-gray-900">
                  {entry.mode === 'photo' ? 'Recherche photo' : 'Streaming temps réel'}
                </p>
                <p className="text-xs text-gray-500">{entry.time.toLocaleTimeString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{entry.matches} correspondance(s)</p>
              <p className="text-xs text-gray-500">Seuil&nbsp;: {entry.threshold}%</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase text-gray-500">Mode de Reconnaissance</h2>
        <p className="mt-1 mb-5 text-lg font-semibold text-gray-900">Choisissez la méthode d’analyse souhaitée</p>
        {renderModeButtons()}
      </section>

      {renderAdvancedSettings()}

      {mode === 'photo' ? renderPhotoPanel() : renderStreamPanel()}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mr-2 inline-block" size={16} />
          {errorMessage}
        </div>
      )}

      {renderResults()}

      {mode === 'photo' && uploadedFile && (
        <div className="rounded-3xl border border-gray-200 bg-white px-6 py-4 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">Détails du fichier</p>
          <p className="mt-1 text-xs">
            Nom&nbsp;: {uploadedFile.name} — Taille&nbsp;: {formatBytes(uploadedFile.size)}
          </p>
        </div>
      )}

      {renderHistory()}

      <footer className="rounded-3xl border border-gray-200 bg-white px-6 py-4 text-center text-xs text-gray-500">
        Support Technique — SGIC Gendarmerie Nationale • Pour toute question sur ArcFace, contactez l’administrateur système.
      </footer>
    </div>
  )
}

export default ReconnaissanceDashboard


