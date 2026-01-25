import { useEffect, useMemo, useState, useRef } from 'react'
import { BadgeCheck, Image as ImageIcon, Loader2, Upload, Eye, CheckCircle2 } from 'lucide-react'
import { rechercherCorrespondancesMultiples } from './services/arcfaceService'
import api from '../../services/api'

/**
 * Interface de recherche biométrique par photo (ou tapissage).
 * Permet de téléverser une ou plusieurs images puis d’interroger ArcFace pour obtenir les correspondances.
 */

const isImageFile = (file) => file && file.type.startsWith('image/')

const RechercheParPhoto = () => {
  const [threshold, setThreshold] = useState('0.6')
  const [topK, setTopK] = useState('3')
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Importez une ou plusieurs photos pour lancer une recherche.')
  const [results, setResults] = useState([])
  const [errorMessage, setErrorMessage] = useState(null)
  const [landmarks106, setLandmarks106] = useState({}) // { [resultId]: { landmarks, confidence, bbox } }
  const [analysing106, setAnalysing106] = useState({}) // { [resultId]: boolean }
  const canvasRefs = useRef({})
  const imageRefs = useRef({})

  const sanitizeThreshold = () => {
    const numeric = Number(threshold)
    if (Number.isNaN(numeric)) {
      return 0.6
    }
    if (numeric < 0) {
      return 0
    }
    if (numeric > 1) {
      return 1
    }
    return numeric
  }

  const sanitizeTopK = () => {
    const numeric = Number(topK)
    if (Number.isNaN(numeric) || numeric < 1) {
      return 3
    }
    if (numeric > 50) {
      return 50
    }
    return Math.round(numeric)
  }

  // Nettoyage des URLs blobs générées pour les aperçus.
  useEffect(() => {
    return () => {
      results.forEach((entry) => {
        if (entry.previewUrl) {
          URL.revokeObjectURL(entry.previewUrl)
        }
      })
    }
  }, [results])

  const handleFilesSelection = async (event) => {
    const files = Array.from(event.target.files || []).filter(isImageFile)

    if (!files.length) {
      setErrorMessage('Veuillez sélectionner au moins une image (PNG, JPG, WebP, etc.).')
      setStatusMessage('Aucune photo analysée.')
      event.target.value = ''
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)
    setStatusMessage(`Analyse de ${files.length} photo(s) en cours…`)
    setResults([])

    try {
      const analyses = await rechercherCorrespondancesMultiples(files, {
        threshold: sanitizeThreshold(),
        topK: sanitizeTopK(),
      })

      const enrichedResults = analyses.map(({ file, analysis }) => {
        const previewUrl = URL.createObjectURL(file)

        return {
          id: `${file.name}-${file.size}-${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          previewUrl,
          analysis,
          matches: analysis.matches || [],
          success: (analysis.matches?.length || 0) > 0,
          message: analysis.message,
          invalidIds: analysis.raw?.invalidIds || [],
        }
      })

      setResults(enrichedResults)
      const successes = enrichedResults.filter((item) => item.success).length
      setStatusMessage(`Analyses terminées : ${successes}/${enrichedResults.length} photo(s) avec succès.`)
    } catch (error) {
      setErrorMessage(error.message || 'Erreur durant l’analyse des photos.')
      setStatusMessage('Aucune analyse réalisée.')
    } finally {
      setIsProcessing(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const clearResults = () => {
    results.forEach((entry) => {
      if (entry.previewUrl) {
        URL.revokeObjectURL(entry.previewUrl)
      }
    })
    setResults([])
    setLandmarks106({})
    setAnalysing106({})
    setErrorMessage(null)
    setStatusMessage('Importez une ou plusieurs photos pour lancer une recherche.')
  }

  // Fonction pour analyser les 106 landmarks d'une photo
  const analyserLandmarks106 = async (resultId, file) => {
    if (!file || analysing106[resultId]) {
      return
    }

    setAnalysing106(prev => ({ ...prev, [resultId]: true }))
    setErrorMessage(null)

    try {
      setStatusMessage('Analyse biométrique en cours…')

      const formData = new FormData()
      formData.append('image', file)

      const response = await api.post('/biometrie/landmarks106/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success && response.data.landmarks) {
        console.log('Landmarks106 reçus pour', resultId, ':', response.data.landmarks.length, 'points')
        setLandmarks106(prev => ({
          ...prev,
          [resultId]: response.data
        }))
        
        // Dessiner les landmarks et le bounding box sur le canvas
        // Utiliser plusieurs tentatives avec délai pour s'assurer que l'image est chargée
        setTimeout(() => {
          dessinerLandmarks(resultId, response.data.landmarks, response.data.bbox)
        }, 200)
        setTimeout(() => {
          dessinerLandmarks(resultId, response.data.landmarks, response.data.bbox)
        }, 500)
      } else {
        const errorMsg = response.data.error || 'Aucun visage détecté. Réessayer.'
        setErrorMessage(errorMsg)
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de l\'analyse biométrique'
      setErrorMessage(errorMessage)
    } finally {
      setAnalysing106(prev => ({ ...prev, [resultId]: false }))
    }
  }

  // Fonction pour obtenir les connexions du maillage facial (106 landmarks)
  const getFaceMeshConnections = () => {
    const connections = []
    // Contour du visage
    for (let i = 0; i < 16; i++) connections.push([i, i + 1])
    // Sourcils
    for (let i = 17; i < 21; i++) connections.push([i, i + 1])
    for (let i = 22; i < 26; i++) connections.push([i, i + 1])
    // Nez
    for (let i = 27; i < 35; i++) connections.push([i, i + 1])
    // Yeux
    for (let i = 36; i < 41; i++) connections.push([i, i + 1])
    connections.push([41, 36])
    for (let i = 42; i < 47; i++) connections.push([i, i + 1])
    connections.push([47, 42])
    // Bouche
    for (let i = 48; i < 59; i++) connections.push([i, i + 1])
    connections.push([59, 48])
    for (let i = 60; i < 67; i++) connections.push([i, i + 1])
    connections.push([67, 60])
    // Maillage supplémentaire
    connections.push([27, 30], [30, 33], [33, 51], [51, 57])
    connections.push([36, 42], [39, 45], [0, 36], [16, 45])
    for (let i = 0; i < 16; i += 2) {
      if (i + 2 <= 16) connections.push([i, i + 2])
    }
    return connections
  }

  // Fonction pour obtenir la couleur d'une zone selon l'index du point
  const getLandmarkColor = (index) => {
    // Contour du visage (0-16) - Bleu
    if (index >= 0 && index <= 16) return { fill: '#3b82f6', stroke: '#1e40af', size: 2.5 }
    // Sourcils (17-26) - Vert
    if (index >= 17 && index <= 26) return { fill: '#10b981', stroke: '#047857', size: 2 }
    // Nez (27-35) - Orange
    if (index >= 27 && index <= 35) return { fill: '#f97316', stroke: '#c2410c', size: 2.5 }
    // Yeux (36-47) - Violet
    if (index >= 36 && index <= 47) return { fill: '#8b5cf6', stroke: '#6d28d9', size: 3 }
    // Bouche extérieure (48-59) - Rose
    if (index >= 48 && index <= 59) return { fill: '#ec4899', stroke: '#be185d', size: 2.5 }
    // Bouche intérieure (60-67) - Rouge
    if (index >= 60 && index <= 67) return { fill: '#ef4444', stroke: '#b91c1c', size: 2 }
    // Autres points (68-105) - Jaune
    return { fill: '#eab308', stroke: '#a16207', size: 2 }
  }

  // Fonction pour dessiner les landmarks et le bounding box sur le canvas
  const dessinerLandmarks = (resultId, landmarks, bbox) => {
    const canvas = canvasRefs.current[resultId]
    const imageElement = imageRefs.current[resultId]
    
    if (!canvas || !imageElement || !landmarks || landmarks.length === 0) {
      console.warn('dessinerLandmarks: conditions non remplies', { canvas: !!canvas, imageElement: !!imageElement, landmarks: landmarks?.length })
      return
    }

    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Attendre que l'image soit complètement chargée et affichée
      setTimeout(() => {
        const displayedWidth = imageElement.offsetWidth || imageElement.clientWidth || imageElement.naturalWidth
        const displayedHeight = imageElement.offsetHeight || imageElement.clientHeight || imageElement.naturalHeight
        
        if (displayedWidth === 0 || displayedHeight === 0) {
          console.warn('dessinerLandmarks: dimensions invalides', { displayedWidth, displayedHeight })
          return
        }

        const scaleX = displayedWidth / img.naturalWidth
        const scaleY = displayedHeight / img.naturalHeight

        canvas.width = displayedWidth
        canvas.height = displayedHeight

        // Convertir les landmarks avec leurs index
        const scaledLandmarks = landmarks.map((point, index) => {
          if (point && point.length === 2) {
            return {
              x: point[0] * scaleX,
              y: point[1] * scaleY,
              index: index
            }
          }
          return null
        }).filter(p => p !== null)

        console.log('dessinerLandmarks: dessin de', scaledLandmarks.length, 'points sur canvas', { width: displayedWidth, height: displayedHeight })

        // Dessiner tous les points avec une seule couleur uniforme (bleu)
        ctx.fillStyle = '#3b82f6' // Bleu uniforme
        scaledLandmarks.forEach((point) => {
          if (point) {
            ctx.beginPath()
            ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
            ctx.fill()
          }
        })
      }, 100) // Petit délai pour s'assurer que l'image est rendue
    }
    
    img.onerror = () => {
      console.error('dessinerLandmarks: erreur de chargement de l\'image')
    }
    
    const result = results.find(r => r.id === resultId)
    if (result && result.previewUrl) {
      img.src = result.previewUrl
    } else {
      console.warn('dessinerLandmarks: previewUrl non trouvé pour', resultId)
    }
  }

  const hasResults = useMemo(() => results.length > 0, [results])

  return (
    <section className="space-y-6">
      <header>
        <h2 className="flex items-center text-xl font-bold text-gray-900">
          <ImageIcon className="mr-2 text-gendarme-light" size={22} />
          Recherche par photo / Tapissage
        </h2>
        <p className="text-sm text-gray-600">
          Téléversez une photo pour la comparer avec la base criminelle, ou importez plusieurs clichés pour un tapissage assisté par ArcFace.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900" htmlFor="photo-threshold">
            Seuil de validation (0 - 1)
          </label>
          <input
            id="photo-threshold"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            onBlur={() => setThreshold(sanitizeThreshold().toFixed(2))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900" htmlFor="photo-topk">
            Nombre maximum de correspondances par photo
          </label>
          <input
            id="photo-topk"
            type="number"
            min="1"
            max="50"
            value={topK}
            onChange={(event) => setTopK(event.target.value)}
            onBlur={() => setTopK(String(sanitizeTopK()))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <label
        htmlFor="photo-uploader"
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 px-6 py-10 text-center transition hover:border-blue-400 hover:bg-blue-100"
      >
        <Upload className="mb-3 text-blue-500" size={32} />
        <span className="text-sm font-semibold text-blue-700">
          Cliquez pour sélectionner une ou plusieurs photos
        </span>
        <span className="mt-1 text-xs text-blue-600">
          Formats acceptés : JPEG, PNG, WebP (taille max recommandée : 5 Mo par image)
        </span>
        <input
          id="photo-uploader"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesSelection}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={clearResults}
          disabled={!hasResults && !errorMessage}
          className="inline-flex items-center rounded-xl bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Réinitialiser
        </button>
      </div>

      {(isProcessing || statusMessage) && (
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {isProcessing ? (
            <span className="inline-flex items-center">
              <Loader2 className="mr-2 animate-spin" size={16} />
              {statusMessage}
            </span>
          ) : (
            statusMessage
          )}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {hasResults && (
        <div className="space-y-4">
          {results.map((item) => (
            <article key={item.id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Photo analysée : {item.fileName}</p>
                  <p className="text-xs text-gray-500">
                    Taille : {(item.fileSize / 1024).toFixed(1)} Ko
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    item.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {item.success ? 'Analyse réussie' : 'Analyse échouée'}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                <div className="relative overflow-hidden rounded-xl border border-gray-200">
                  <img
                    ref={(el) => { if (el) imageRefs.current[item.id] = el }}
                    src={item.previewUrl}
                    alt={item.fileName}
                    className="h-full w-full object-cover"
                  />
                  {/* Canvas superposé pour les 106 landmarks */}
                  <canvas
                    ref={(el) => { if (el) canvasRefs.current[item.id] = el }}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {/* Badge landmarks si analysé */}
                  {landmarks106[item.id] && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-lg">
                      ✓ 106 pts
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Bouton Analyser visage (106 points) */}
                  <button
                    type="button"
                    onClick={() => {
                      // Recréer le fichier depuis le preview URL
                      fetch(item.previewUrl)
                        .then(res => res.blob())
                        .then(blob => {
                          const file = new File([blob], item.fileName, { type: blob.type || 'image/jpeg' })
                          analyserLandmarks106(item.id, file)
                        })
                        .catch(err => {
                          setErrorMessage('Impossible de charger le fichier pour l\'analyse')
                        })
                    }}
                    disabled={analysing106[item.id]}
                    className={`w-full px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-2 ${
                      analysing106[item.id]
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : landmarks106[item.id]
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                    }`}
                  >
                    {analysing106[item.id] ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Analyse biométrique en cours…</span>
                      </>
                    ) : landmarks106[item.id] ? (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Re-analyser visage (106 points)</span>
                      </>
                    ) : (
                      <>
                        <Eye size={18} />
                        <span>Analyser visage (106 points)</span>
                      </>
                    )}
                  </button>

                  {item.message && (
                    <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      {item.message}
                    </p>
                  )}

                  {item.invalidIds.length > 0 && (
                    <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                      Identifiants ignorés : {item.invalidIds.join(', ')}
                    </p>
                  )}

                  {item.matches.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {item.matches.map((match, matchIndex) => {
                        const displayName =
                          match.label || `${match.nom || ''} ${match.prenom || ''}`.trim() || `Correspondance #${matchIndex + 1}`
                        return (
                          <div
                            key={match.id ?? matchIndex}
                            className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800"
                          >
                            <p className="font-semibold text-gray-900">{displayName}</p>
                            {(match.photoUrl || match.photo_url) && (
                              <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                                <img
                                  src={match.photoUrl || match.photo_url}
                                  alt={displayName}
                                  className="h-28 w-full object-cover"
                                />
                              </div>
                            )}
                            <p className="mt-2 text-sm">
                              Similarité :{' '}
                              <span className="font-semibold text-green-600">
                                {match.similarityText || match.confidenceText || `${(match.similarityPercent ?? 0).toFixed(1)}%`}
                              </span>
                            </p>
                            {match.verified && (
                              <span className="mt-2 inline-flex items-center rounded-full bg-green-200 px-2 py-0.5 text-xs font-semibold text-green-800">
                                <BadgeCheck className="mr-1" size={12} />
                                Seuil atteint
                              </span>
                            )}
                            {match.ficheUrl && (
                              <a
                                href={match.ficheUrl}
                                className="mt-2 inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700"
                              >
                                Voir la fiche complète
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">
                      Aucune correspondance détectée pour cette photo.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default RechercheParPhoto


