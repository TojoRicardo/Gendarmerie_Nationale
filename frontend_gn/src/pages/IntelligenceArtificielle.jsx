/**
 * Interface unifiée Intelligence Artificielle
 * Combine reconnaissance faciale et analyse prédictive
 */

import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Upload,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Camera,
  MonitorPlay,
  BarChart3,
  TrendingUp,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Activity,
  Lightbulb,
  Users,
  Clock,
  RefreshCw,
  MapPin,
} from 'lucide-react'
import { rechercherCorrespondance } from '../sections/IA/services/arcfaceService'
import ReconnaissanceTempsReelStandalone from '../sections/IA/ReconnaissanceTempsReel.jsx'
import api from '../services/api'
import { useParams } from 'react-router-dom'

const MODES = [
  {
    id: 'photo',
    label: 'Recherche par Photo',
    description: 'Upload d\'une image pour identification',
    icon: ImageIcon,
  },
  {
    id: 'stream',
    label: 'Streaming Temps Réel',
    description: 'Reconnaissance via webcam en direct',
    icon: MonitorPlay,
  },
]

const IntelligenceArtificielle = () => {
  const { ficheId } = useParams()
  
  // États pour reconnaissance faciale
  const [mode, setMode] = useState('photo')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [threshold, setThreshold] = useState(0.7)
  const [topK, setTopK] = useState(1) // Par défaut, retourner uniquement la meilleure correspondance
  const [uploadedFile, setUploadedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState([])
  const [statusMessage, setStatusMessage] = useState('Aucune correspondance trouvée dans la base de données')
  const [elapsed, setElapsed] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)
  const [history, setHistory] = useState([])
  const [landmarks106, setLandmarks106] = useState(null)
  
  
  // États pour analyse prédictive
  const [caseAnalysis, setCaseAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisType, setAnalysisType] = useState('complet')
  const [selectedNumeroFiche, setSelectedNumeroFiche] = useState(null)
  
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  const thresholdPercent = Math.round(threshold * 100)

  // Fonction pour obtenir les connexions du maillage facial (106 landmarks)
  const getFaceMeshConnections = () => {
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
    connections.push([27, 30]) // Nez
    connections.push([30, 33]) // Nez
    connections.push([33, 51]) // Vers la bouche
    connections.push([51, 57]) // Vers la bouche
    
    // Lignes horizontales
    connections.push([36, 42]) // Entre les yeux
    connections.push([39, 45]) // Entre les yeux
    
    // Lignes diagonales pour le maillage
    connections.push([0, 36]) // Mâchoire vers œil droit
    connections.push([16, 45]) // Mâchoire vers œil gauche
    
    // Maillage supplémentaire pour le contour
    for (let i = 0; i < 16; i += 2) {
      if (i + 2 <= 16) {
        connections.push([i, i + 2])
      }
    }
    
    return connections
  }

  // Fonction pour obtenir la couleur d'une zone selon l'index du point
  const getLandmarkColor = (index) => {
    // Contour du visage (0-16) - Bleu
    if (index >= 0 && index <= 16) return { fill: '#3b82f6', stroke: '#1e40af', size: 3.5 }
    // Sourcils (17-26) - Vert
    if (index >= 17 && index <= 26) return { fill: '#10b981', stroke: '#047857', size: 3 }
    // Nez (27-35) - Orange
    if (index >= 27 && index <= 35) return { fill: '#f97316', stroke: '#c2410c', size: 3.5 }
    // Yeux (36-47) - Violet
    if (index >= 36 && index <= 47) return { fill: '#8b5cf6', stroke: '#6d28d9', size: 4 }
    // Bouche extérieure (48-59) - Rose
    if (index >= 48 && index <= 59) return { fill: '#ec4899', stroke: '#be185d', size: 3.5 }
    // Bouche intérieure (60-67) - Rouge
    if (index >= 60 && index <= 67) return { fill: '#ef4444', stroke: '#b91c1c', size: 3 }
    // Autres points (68-105) - Jaune
    return { fill: '#eab308', stroke: '#a16207', size: 3 }
  }

  // Dessiner les landmarks ArcFace avec améliorations
  useEffect(() => {
    if (!landmarks106 || !previewUrl || !canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const img = imageRef.current
    const ctx = canvas.getContext('2d')

    if (!img.complete || img.naturalWidth === 0) {
      const handleLoad = () => drawLandmarks()
      img.addEventListener('load', handleLoad)
      return () => img.removeEventListener('load', handleLoad)
    }

    drawLandmarks()

    function drawLandmarks() {
      canvas.width = img.offsetWidth
      canvas.height = img.offsetHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!landmarks106.landmarks || landmarks106.landmarks.length === 0) return

      const scaleX = canvas.width / img.naturalWidth
      const scaleY = canvas.height / img.naturalHeight

      const scaledLandmarks = landmarks106.landmarks.map((point, index) => {
        if (point && point.length >= 2) {
          return {
            x: point[0] * scaleX,
            y: point[1] * scaleY,
            index: index
          }
        }
        return null
      }).filter(p => p !== null)

      // Dessiner tous les points avec une seule couleur uniforme (bleu)
      ctx.fillStyle = '#3b82f6' // Bleu uniforme
      scaledLandmarks.forEach((point) => {
        if (point) {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
          ctx.fill()
        }
      })
      
      // Bounding box supprimé (cadre vert retiré)
    }
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
    setLandmarks106(null)
    setResults([])

    try {
      const formData = new FormData()
      formData.append('image', file)

      console.log('Landmarks106APIView: Envoi de la requête vers /biometrie/landmarks106/')
      const response = await api.post('/biometrie/landmarks106/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (response.data.success && response.data.landmarks) {
        console.log('Landmarks106 détectés:', response.data.landmarks.length, 'points')
        setLandmarks106(response.data)
        setStatusMessage(`Photo prête. ${response.data.landmarks.length} points faciaux détectés. Lancez la reconnaissance.`)
      } else {
        const errorMsg = response.data?.error || 'Aucun visage détecté'
        console.warn('Landmarks106APIView: Détection échouée:', errorMsg)
        setStatusMessage(`Photo prête. ${errorMsg}`)
        setErrorMessage(errorMsg)
      }
    } catch (error) {
      console.error('Landmarks106APIView: Erreur analyse landmarks:', error)
      
      // Gérer les différents types d'erreurs
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setStatusMessage('Photo prête. La détection a pris trop de temps (timeout). Veuillez réessayer.')
        setErrorMessage('La détection des landmarks a dépassé le délai de 30 secondes. Le modèle peut être en cours d\'initialisation ou l\'image est trop complexe.')
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') {
        // Utiliser le gestionnaire d'erreurs centralisé
        const { getErrorMessage, isNetworkError } = await import('../utils/errorHandler')
        const errorInfo = getErrorMessage(error)
        setStatusMessage('Photo prête. Serveur non accessible.')
        setErrorMessage(errorInfo.message)
      } else if (error.response?.data?.error) {
        const errorMsg = error.response.data.error
        setStatusMessage(`Photo prête. ${errorMsg}`)
        setErrorMessage(errorMsg)
      } else {
        setStatusMessage('Photo prête. Erreur lors de la détection des landmarks.')
        setErrorMessage(error.message || 'Erreur inconnue lors de la détection des landmarks')
      }
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

      const analysis = await rechercherCorrespondance(uploadedFile, { threshold, topK })

      const end = performance.now()
      setElapsed(analysis.searchTime || (end - start) / 1000)

      const matches = analysis.matches || []
      if (matches.length === 0) {
        setResults([])
        setStatusMessage('Aucun criminel trouvé dans la base de données.')
      } else {
        setResults(matches)
        setStatusMessage(`${matches.length} criminel(s) trouvé(s) dans la base de données.`)
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
      console.error('Erreur recherche photo:', error)
      const end = performance.now()
      setElapsed((end - start) / 1000)
      const status = error?.response?.status ?? error?.status
      const backendMessage = error?.response?.data?.message

      if (status === 400) {
        const message = "Aucun visage humain détecté dans l'image."
        setErrorMessage(message)
        setStatusMessage(message)
      } else if (status === 404) {
        setResults([])
        setStatusMessage('Aucun criminel trouvé dans la base de données.')
        setErrorMessage(null)
      } else {
        const fallbackMessage = backendMessage || error?.message || 'Erreur inattendue durant l\'analyse.'
        setErrorMessage(fallbackMessage)
        setStatusMessage(fallbackMessage)
      }
      setResults([])
    } finally {
      setProcessing(false)
    }
  }


  const analyzeCase = async () => {
    if (!selectedNumeroFiche || !selectedNumeroFiche.trim()) {
      setErrorMessage('Veuillez entrer un numéro de fiche criminelle')
      return
    }

    setAnalysisLoading(true)
    setErrorMessage(null)
    setStatusMessage('Analyse en cours...')

    try {
      const response = await api.post('/ia/case-analysis/create/', {
        numero_fiche: selectedNumeroFiche.trim(),
        type_analyse: analysisType
      })

      if (response.data.success) {
        setCaseAnalysis(response.data)
        setStatusMessage('Analyse prédictive terminée avec succès')
        setErrorMessage(null)
      } else {
        const errorMsg = response.data.message || 'Erreur lors de l\'analyse'
        setErrorMessage(errorMsg)
        setStatusMessage('')
      }
    } catch (err) {
      console.error('Erreur analyse dossier:', err)
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.error ||
                      err.message || 
                      'Erreur lors de l\'analyse du dossier. Vérifiez que le numéro de fiche est correct.'
      setErrorMessage(errorMsg)
      setStatusMessage('')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const resetPhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setUploadedFile(null)
    setPreviewUrl(null)
    setResults([])
    setLandmarks106(null)
    setStatusMessage('Importez une photo puis lancez la reconnaissance.')
    setElapsed(0)
    setErrorMessage(null)
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Intelligence Artificielle</h1>
          <p className="mt-2 text-sm text-gray-600">
            Reconnaissance faciale, détection de patterns et analyse prédictive avec l'IA
          </p>
        </div>

        {/* Mode de reconnaissance */}
        {mode === 'photo' && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">MODE DE RECONNAISSANCE</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {MODES.map((entry) => {
                const Icon = entry.icon
                const isActive = mode === entry.id
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setMode(entry.id)}
                    className={`rounded-2xl border-2 p-6 text-left transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`mb-3 h-8 w-8 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    <h3 className={`mb-1 font-semibold ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                      {entry.label}
                    </h3>
                    <p className={`text-sm ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                      {entry.description}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Paramètres avancés */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left"
              >
                <span className="font-medium text-gray-700">Paramètres Avancés</span>
                {advancedOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              {advancedOpen && (
                <div className="mt-4 grid gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Seuil de similarité ({thresholdPercent}%)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Nombre de résultats (Top K)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={topK}
                      onChange={(e) => setTopK(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Zone d'upload */}
            <div className="mt-6">
              {!previewUrl ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 hover:border-blue-400 hover:bg-blue-50">
                  <Upload className="mb-4 h-12 w-12 text-gray-400" />
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Déposez une photo ou cliquez pour parcourir
                  </p>
                  <p className="text-xs text-gray-500">Formats acceptés : JPG, PNG, WebP</p>
                  <p className="text-xs text-gray-500">Taille maximale recommandée 5 Mo.</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                    <img
                      ref={imageRef}
                      src={previewUrl}
                      alt="Photo à analyser"
                      className="w-full h-auto"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                    {landmarks106 && landmarks106.confidence && (
                      <div className="absolute top-4 left-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Confiance: {(landmarks106.confidence * 100).toFixed(1)}%</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={resetPhoto}
                      className="absolute right-4 top-4 rounded-full bg-red-500/90 p-2 text-white shadow-lg hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={searchPhoto}
                      disabled={processing}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {processing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Reconnaissance ArcFace
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Messages d'erreur */}
            {errorMessage && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Erreur</p>
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Résultats ArcFace */}
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  RÉSULTATS ARCFACE
                </h3>
                <span className="text-sm text-gray-500">{new Date().toLocaleTimeString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-gray-600">CORRESPONDANCES</p>
                  <p className="text-2xl font-bold text-gray-900">{results.length}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm text-gray-600">TEMPS</p>
                  <p className="text-2xl font-bold text-gray-900">{elapsed.toFixed(2)}s</p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-4">
                  <p className="text-sm text-gray-600">SEUIL</p>
                  <p className="text-2xl font-bold text-gray-900">{thresholdPercent}%</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4">
                  <p className="text-sm text-gray-600">MODÈLE</p>
                  <p className="text-2xl font-bold text-gray-900">ArcFace</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-800">{statusMessage}</p>
              </div>

              {results.length > 0 && (
                <div className="mt-4 space-y-3">
                  {results.map((match, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {match.nom} {match.prenom}
                          </p>
                          <p className="text-sm text-gray-600">Fiche: {match.numero_fiche}</p>
                        </div>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                          {match.similarite || match.confidence_percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

        {/* Mode streaming */}
        {mode === 'stream' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <ReconnaissanceTempsReelStandalone />
          </div>
        )}

        {/* Analyse Prédictive */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 p-2">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Analyse Prédictive</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Numéro de fiche
              </label>
              <input
                type="text"
                value={selectedNumeroFiche || ''}
                onChange={(e) => setSelectedNumeroFiche(e.target.value || null)}
                className="w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 transition-all focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
                placeholder="Ex: 003 ou 003-CIE/2-RJ"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Type d'analyse
              </label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 transition-all focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
              >
                <option value="complet">Analyse complète</option>
                <option value="recidive">Risque de récidive</option>
                <option value="dangerosite">Profil de dangerosité</option>
                <option value="zones_risque">Zones à risque</option>
                <option value="associations">Associations criminelles</option>
              </select>
            </div>
          </div>

          <button
            onClick={analyzeCase}
            disabled={analysisLoading || !selectedNumeroFiche}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analysisLoading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Analyse en cours...</span>
              </>
            ) : (
              <>
                <BarChart3 className="h-5 w-5" />
                <span>Lancer l'analyse prédictive</span>
              </>
            )}
          </button>

          {caseAnalysis && (
            <div className="mt-6 space-y-6">
              {/* Score de risque global - Carte principale */}
              <div className="relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 shadow-lg">
                <div className="relative z-10">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">Risque Global</p>
                        <p className="text-xs text-gray-500">Score de confiance: {caseAnalysis.score_confiance?.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-extrabold text-gray-900">
                        {caseAnalysis.score_risque_global?.toFixed(1)}
                      </p>
                      <p className="text-lg font-bold text-gray-600">%</p>
                    </div>
                  </div>
                  {/* Barre de progression */}
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(caseAnalysis.score_risque_global || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Grille de mini-cartes */}
              {caseAnalysis.resultats && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Risque de récidive - Mini carte */}
                  {caseAnalysis.resultats.recidive && (
                    <div className="group relative overflow-hidden rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-md transition-all hover:scale-105 hover:shadow-xl">
                      <div className="relative">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-orange-500 p-1.5">
                              <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">Récidive</h3>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                            caseAnalysis.resultats.recidive.niveau_risque === 'élevé' || caseAnalysis.resultats.recidive.niveau_risque === 'eleve' 
                              ? 'bg-red-100 text-red-700' 
                              : caseAnalysis.resultats.recidive.niveau_risque === 'modéré' || caseAnalysis.resultats.recidive.niveau_risque === 'modere'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {caseAnalysis.resultats.recidive.niveau_risque?.charAt(0).toUpperCase() + caseAnalysis.resultats.recidive.niveau_risque?.slice(1)}
                          </span>
                        </div>
                        <p className="mb-3 text-4xl font-extrabold text-gray-900">
                          {caseAnalysis.resultats.recidive.risque_recidive?.toFixed(1)}<span className="text-xl text-gray-600">%</span>
                        </p>
                        {/* Barre de progression */}
                        <div className="mb-3 h-2 overflow-hidden rounded-full bg-orange-200">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(caseAnalysis.resultats.recidive.risque_recidive || 0, 100)}%` }}
                          ></div>
                        </div>
                        {caseAnalysis.resultats.recidive.facteurs && caseAnalysis.resultats.recidive.facteurs.length > 0 && (
                          <div className="mt-3 rounded-lg bg-white/60 p-2.5 backdrop-blur-sm overflow-hidden">
                            <p className="mb-2 text-xs font-semibold text-gray-600">Facteurs clés:</p>
                            <div className="space-y-1.5">
                              {caseAnalysis.resultats.recidive.facteurs.slice(0, 2).map((facteur, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs">
                                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div>
                                  <span className="text-gray-700 font-medium break-words flex-1">{facteur.facteur}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Profil de dangerosité - Mini carte */}
                  {caseAnalysis.resultats.dangerosite && (
                    <div className="group relative overflow-hidden rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-5 shadow-md transition-all hover:scale-105 hover:shadow-xl">
                      <div className="relative">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-red-500 p-1.5">
                              <AlertTriangle className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">Dangerosité</h3>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                            caseAnalysis.resultats.dangerosite.niveau_dangerosite === 'élevé' || caseAnalysis.resultats.dangerosite.niveau_dangerosite === 'eleve'
                              ? 'bg-red-100 text-red-700' 
                              : caseAnalysis.resultats.dangerosite.niveau_dangerosite === 'modéré' || caseAnalysis.resultats.dangerosite.niveau_dangerosite === 'modere'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {caseAnalysis.resultats.dangerosite.niveau_dangerosite?.charAt(0).toUpperCase() + caseAnalysis.resultats.dangerosite.niveau_dangerosite?.slice(1)}
                          </span>
                        </div>
                        <p className="mb-3 text-4xl font-extrabold text-gray-900">
                          {caseAnalysis.resultats.dangerosite.score_global?.toFixed(1)}<span className="text-xl text-gray-600">%</span>
                        </p>
                        {/* Barre de progression */}
                        <div className="mb-3 h-2 overflow-hidden rounded-full bg-red-200">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(caseAnalysis.resultats.dangerosite.score_global || 0, 100)}%` }}
                          ></div>
                        </div>
                        {caseAnalysis.resultats.dangerosite.scores_detailles && (
                          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-white/60 p-2.5 backdrop-blur-sm">
                            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                              <span className="text-xs font-semibold text-gray-500">Violence</span>
                              <p className="text-sm font-bold text-red-600">{caseAnalysis.resultats.dangerosite.scores_detailles.violence?.toFixed(0)}%</p>
                            </div>
                            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                              <span className="text-xs font-semibold text-gray-500">Fréquence</span>
                              <p className="text-sm font-bold text-orange-600">{caseAnalysis.resultats.dangerosite.scores_detailles.frequence?.toFixed(0)}%</p>
                            </div>
                            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                              <span className="text-xs font-semibold text-gray-500">Gravité</span>
                              <p className="text-sm font-bold text-amber-600">{caseAnalysis.resultats.dangerosite.scores_detailles.gravite?.toFixed(0)}%</p>
                            </div>
                            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                              <span className="text-xs font-semibold text-gray-500">Évolution</span>
                              <p className="text-sm font-bold text-purple-600">{caseAnalysis.resultats.dangerosite.scores_detailles.evolution?.toFixed(0)}%</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Zones à risque - Mini carte */}
                  {caseAnalysis.resultats.zones_risque && caseAnalysis.resultats.zones_risque.zones_risque && (
                    <div className="group relative overflow-hidden rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-md transition-all hover:scale-105 hover:shadow-xl">
                      <div className="relative">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="rounded-lg bg-blue-500 p-1.5">
                            <MapPin className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900">Zones à risque</h3>
                        </div>
                          <div className="space-y-2">
                            {caseAnalysis.resultats.zones_risque.zones_risque.slice(0, 3).map((zone, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-white/80 p-2.5 shadow-sm backdrop-blur-sm">
                                <span className="text-xs font-semibold text-gray-800 break-words flex-1">{zone.lieu}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="h-2 w-16 overflow-hidden rounded-full bg-blue-100">
                                    <div 
                                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                      style={{ width: `${Math.min(zone.probabilite || 0, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-bold text-white min-w-[3rem] text-center whitespace-nowrap">
                                    {zone.probabilite?.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          {caseAnalysis.resultats.zones_risque.zones_risque.length > 3 && (
                            <p className="text-center text-xs font-medium text-gray-500">+{caseAnalysis.resultats.zones_risque.zones_risque.length - 3} autre(s)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Associations criminelles - Mini carte */}
                  {caseAnalysis.resultats.associations && (
                    <div className="group relative overflow-hidden rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-md transition-all hover:scale-105 hover:shadow-xl">
                      <div className="relative">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-indigo-500 p-1.5">
                              <Users className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">Associations</h3>
                          </div>
                          <span className="rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold text-white">
                            {caseAnalysis.resultats.associations.nb_associations || 0} détectée(s)
                          </span>
                        </div>
                        {caseAnalysis.resultats.associations.associations && caseAnalysis.resultats.associations.associations.length > 0 ? (
                          <div className="space-y-2">
                            {caseAnalysis.resultats.associations.associations.slice(0, 3).map((asso, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-white/80 p-2.5 shadow-sm backdrop-blur-sm">
                                <span className="text-xs font-semibold text-gray-800 break-words flex-1">{asso.nom_complet}</span>
                                <span className="rounded-full bg-indigo-500 px-2.5 py-0.5 text-xs font-bold text-white min-w-[3rem] text-center whitespace-nowrap flex-shrink-0">
                                  {asso.probabilite?.toFixed(0)}%
                                </span>
                              </div>
                            ))}
                            {caseAnalysis.resultats.associations.associations.length > 3 && (
                              <p className="text-center text-xs font-medium text-gray-500">+{caseAnalysis.resultats.associations.associations.length - 3} autre(s)</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6">
                            <div className="mb-2 rounded-full bg-indigo-100 p-3">
                              <Users className="h-6 w-6 text-indigo-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-500">Aucune association détectée</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recommandations - Section séparée */}
              {caseAnalysis.recommandations && caseAnalysis.recommandations.length > 0 && (
                <div className="mt-6 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 shadow-lg">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-2.5">
                      <Lightbulb className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Recommandations</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {caseAnalysis.recommandations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-4 rounded-xl bg-white/80 p-6 shadow-sm backdrop-blur-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
                          <span className="text-lg font-bold text-white">{idx + 1}</span>
                        </div>
                        <p className="text-base font-medium leading-relaxed text-gray-800 pt-1.5">
                          {rec}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Liens détectés - Mini carte */}
              {caseAnalysis.liens_detectes && caseAnalysis.liens_detectes.length > 0 && (
                <div className="mt-6 rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-6 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 p-2.5">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Liens détectés</h3>
                      <p className="text-sm text-gray-600">{caseAnalysis.liens_detectes.length} connexion(s) identifiée(s)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IntelligenceArtificielle
