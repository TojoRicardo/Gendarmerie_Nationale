import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Camera, Loader2, RefreshCcw, StopCircle, Eye, CheckCircle2, Monitor, Usb, Power } from 'lucide-react'

import { envoyerCaptureTempsReel } from './services/arcfaceService'
import api from '../../services/api'

const DEFAULT_STATUS =
  'Cliquez sur « Démarrer la caméra » puis placez votre visage dans le cadre avant de lancer la capture.'
const DEFAULT_THRESHOLD = 0.7

const waitForVideoReady = (videoElement) =>
  new Promise((resolve, reject) => {
    if (!videoElement) {
      reject(new Error('Élément vidéo introuvable.'))
      return
    }

    if (videoElement.readyState >= 2) {
      resolve()
      return
    }

    const handleLoaded = () => {
      cleanup()
      resolve()
    }

    const handleError = () => {
      cleanup()
      reject(new Error('Le flux vidéo ne peut pas démarrer.'))
    }

    const timeoutId = window.setTimeout(() => {
      cleanup()
      resolve()
    }, 1500)

    const cleanup = () => {
      videoElement.removeEventListener('loadeddata', handleLoaded)
      videoElement.removeEventListener('error', handleError)
      window.clearTimeout(timeoutId)
    }

    videoElement.addEventListener('loadeddata', handleLoaded, { once: true })
    videoElement.addEventListener('error', handleError, { once: true })
  })

const captureFrameFromVideo = (videoElement) => {
  if (!videoElement) {
    throw new Error('Aucune source vidéo disponible pour la capture.')
  }

  // Utiliser la résolution native de la caméra quand c'est possible
  let width = videoElement.videoWidth || 1280
  let height = videoElement.videoHeight || 720

  // Si les dimensions sont faibles, essayer de récupérer les réglages du track
  const stream = videoElement.srcObject
  if (stream instanceof MediaStream) {
    const [videoTrack] = stream.getVideoTracks()
    if (videoTrack && typeof videoTrack.getSettings === 'function') {
      const settings = videoTrack.getSettings()
      if (settings.width && settings.height) {
        width = settings.width
        height = settings.height
      }
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Impossible de capturer une image depuis la webcam.')
  }

  context.drawImage(videoElement, 0, 0, width, height)
  // Qualité maximale pour limiter la compression JPEG
  const dataUrl = canvas.toDataURL('image/jpeg', 0.98)

  return {
    dataUrl,
    width,
    height,
  }
}

const ReconnaissanceTempsReel = () => {
  const videoRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const streamRef = useRef(null)

  const [statusMessage, setStatusMessage] = useState(DEFAULT_STATUS)
  const [errorMessage, setErrorMessage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)

  const [snapshot, setSnapshot] = useState(null)
  const [captureSize, setCaptureSize] = useState({ width: 0, height: 0 })
  const [landmarks, setLandmarks] = useState([])
  const [landmarks106, setLandmarks106] = useState(null)
  const [isAnalyzing106, setIsAnalyzing106] = useState(false)
  const [matchResult, setMatchResult] = useState(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [selectedCameraId, setSelectedCameraId] = useState('1') // Par défaut: caméra intégrée (ID 1)

  // Fonction utilitaire pour forcer la libération de TOUS les streams média
  const forceReleaseAllMediaStreams = useCallback(async () => {
    console.log('Libération forcée de tous les streams média...')
    
    // Libérer le stream courant
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
          console.log('  [OK] Track arrêté:', track.kind, track.label || 'sans label')
        } catch (error) {
          console.warn('  [ATTENTION] Erreur arrêt track:', error)
        }
      })
      streamRef.current = null
    }

    // Libérer le stream du video element
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject
        if (stream instanceof MediaStream) {
          stream.getTracks().forEach((track) => {
            try {
              track.stop()
              console.log('  [OK] Track vidéo arrêté:', track.kind, track.label || 'sans label')
            } catch (error) {
              console.warn('  [ATTENTION] Erreur arrêt track vidéo:', error)
            }
          })
        }
      } catch (error) {
        console.warn('  [ATTENTION] Erreur libération stream vidéo:', error)
      }
      
      try {
        videoRef.current.pause()
        videoRef.current.load() // Force le rechargement de l'élément vidéo
      } catch (_error) {
        // Ignorer les erreurs de pause
      }
      
      videoRef.current.srcObject = null
    }
    
    // Attendre un peu pour que la caméra soit complètement libérée
    // (certaines caméras USB nécessitent plus de temps)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Essayer de libérer tous les streams actifs dans navigator (si disponible)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        // Cette méthode ne peut pas directement libérer les streams,
        // mais on peut au moins s'assurer que notre stream est libéré
        console.log('  [OK] Tous les streams ont été libérés')
      } catch (error) {
        console.warn('  [ATTENTION] Erreur lors de la vérification des streams:', error)
      }
    }
    
    // Attendre encore un peu pour les caméras USB qui peuvent être lentes
    await new Promise(resolve => setTimeout(resolve, 500))
  }, [])

  const stopCamera = useCallback(() => {
    forceReleaseAllMediaStreams()
    setIsCameraActive(false)
    setIsVideoReady(false)
    setStatusMessage('Caméra arrêtée.')
  }, [forceReleaseAllMediaStreams])

  useEffect(() => stopCamera, [stopCamera])

  useEffect(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) {
      return
    }

    if (!captureSize.width || !captureSize.height) {
      canvas.width = 0
      canvas.height = 0
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    // Le canvas doit avoir la même taille que le conteneur parent
    const container = canvas.parentElement
    if (!container) {
      return
    }

    const containerWidth = container.offsetWidth || container.clientWidth
    const containerHeight = container.offsetHeight || container.clientHeight

    if (containerWidth === 0 || containerHeight === 0) {
      return
    }

    canvas.width = containerWidth
    canvas.height = containerHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dessiner les landmarks 106 si disponibles (priorité)
    if (snapshot && landmarks106 && Array.isArray(landmarks106.landmarks) && landmarks106.landmarks.length > 0) {
      console.log('Dessin des landmarks106:', landmarks106.landmarks.length, 'points sur canvas', { 
        width: canvas.width, 
        height: canvas.height,
        captureSize,
        containerWidth,
        containerHeight
      })
      
      const imgAspect = captureSize.width / captureSize.height
      const containerAspect = containerWidth / containerHeight
      
      let displayedWidth, displayedHeight, offsetX, offsetY
      
      if (imgAspect > containerAspect) {
        displayedWidth = containerWidth
        displayedHeight = containerWidth / imgAspect
        offsetX = 0
        offsetY = (containerHeight - displayedHeight) / 2
      } else {
        displayedWidth = containerHeight * imgAspect
        displayedHeight = containerHeight
        offsetX = (containerWidth - displayedWidth) / 2
        offsetY = 0
      }
      
      const scaleX = displayedWidth / captureSize.width
      const scaleY = displayedHeight / captureSize.height

      // Convertir les landmarks avec leurs index et mise à l'échelle
      const scaledLandmarks = landmarks106.landmarks.map((point, index) => {
        if (point && point.length === 2) {
          const px = Number(point[0])
          const py = Number(point[1])
          if (Number.isFinite(px) && Number.isFinite(py)) {
            return { 
              x: px * scaleX + offsetX, 
              y: py * scaleY + offsetY, 
              index: index 
            }
          }
        }
        return null
      }).filter(p => p !== null)

      console.log('Landmarks mis à l\'échelle:', scaledLandmarks.length, 'points', { scaleX, scaleY, offsetX, offsetY })

      // Dessiner tous les points avec une seule couleur uniforme (bleu)
      ctx.fillStyle = '#3b82f6' // Bleu uniforme
      scaledLandmarks.forEach((point) => {
        if (point) {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
          ctx.fill()
        }
      })
      return
    }

    // Sinon, dessiner les landmarks standard (5 points)
    if (!snapshot || !Array.isArray(landmarks) || landmarks.length === 0) {
      return
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.lineWidth = 1

    landmarks.forEach((point) => {
      const [x, y] = point
      const px = Number(x)
      const py = Number(y)
      if (Number.isFinite(px) && Number.isFinite(py)) {
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    })
  }, [captureSize, landmarks, landmarks106, snapshot])

  const resetCapture = useCallback(() => {
    setSnapshot(null)
    setLandmarks([])
    setLandmarks106(null)
    setMatchResult(null)
    setErrorMessage(null)
    setStatusMessage(DEFAULT_STATUS)
    setCaptureSize({ width: 0, height: 0 })
  }, [])

  const handleRealtimeResponse = useCallback((response) => {
    const status = response.status || 'error'
    const message = response.message

    if (status === 'success') {
      setMatchResult(response.match || null)
      setLandmarks(response.landmarks || [])
      setErrorMessage(null)
      setStatusMessage(message || 'Correspondance trouvée.')
      return
    }

    if (status === 'no_match') {
      setMatchResult(null)
      setLandmarks(response.landmarks || [])
      setErrorMessage(null)
      setStatusMessage(message || 'Aucun individu correspondant trouvé dans la base.')
      return
    }

    if (status === 'invalid_face') {
      setMatchResult(null)
      setLandmarks([])
      const fallback = 'Veuillez fournir une photo valide contenant un visage humain.'
      setErrorMessage(message || fallback)
      setStatusMessage(message || fallback)
      return
    }

    setMatchResult(null)
    setLandmarks([])
    const fallback = 'Erreur inattendue lors de la reconnaissance.'
    setErrorMessage(message || fallback)
    setStatusMessage(message || fallback)
  }, [])

  const startCamera = useCallback(async () => {
    if (isCameraActive || isProcessing) {
      return
    }

    resetCapture()
    setStatusMessage('Demande d’accès à la webcam…')

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('La webcam n’est pas prise en charge sur ce navigateur.')
      }

      // Étape 1: Libérer TOUS les streams existants AVANT de faire quoi que ce soit
      console.log('Libération complète de tous les streams média...')
      await forceReleaseAllMediaStreams()
      // Attendre plus longtemps pour que la caméra soit complètement libérée
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Étape 2: Obtenir les caméras disponibles avec permissions
      let videoDevices = []
      let selectedDevice = null
      
      try {
        // D'abord, obtenir les permissions en faisant une demande temporaire
        console.log('Demande des permissions caméra...')
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
        // Libérer immédiatement le stream temporaire
        tempStream.getTracks().forEach(track => {
          track.stop()
          console.log('  [OK] Track temporaire arrêté:', track.kind)
        })
        await new Promise(resolve => setTimeout(resolve, 300)) // Petit délai pour libération
        
        // Maintenant énumérer les devices avec les permissions
        const devices = await navigator.mediaDevices.enumerateDevices()
        videoDevices = devices.filter(device => device.kind === 'videoinput' && device.deviceId && device.deviceId !== '')
        
        console.log(`📹 Caméras détectées: ${videoDevices.length}`)
        videoDevices.forEach((d, i) => {
          const deviceIdPreview = d.deviceId ? d.deviceId.substring(0, 30) + '...' : 'N/A'
          console.log(`  [${i}] ${d.label || `Caméra ${i + 1}`}`)
          console.log(`      deviceId: ${deviceIdPreview}`)
        })
        
        if (videoDevices.length === 0) {
          throw new Error('Aucune caméra détectée. Vérifiez que vos caméras sont branchées.')
        }
        
        // Identifier les caméras : intégrée vs USB externe
        const integratedCamera = videoDevices.find(d => 
          d.label && (
            d.label.toLowerCase().includes('integrated') ||
            d.label.toLowerCase().includes('built-in') ||
            d.label.toLowerCase().includes('intégré') ||
            d.label.toLowerCase().includes('integrated camera') ||
            d.label.toLowerCase().includes('camera')
          )
        ) || videoDevices[0] // Par défaut, la première est l'intégrée
        
        const usbCamera = videoDevices.find(d => 
          d.label && (
            d.label.toLowerCase().includes('usb') ||
            d.label.toLowerCase().includes('external') ||
            d.label.toLowerCase().includes('externe') ||
            d.label.toLowerCase().includes('a03') ||
            d.label.toLowerCase().includes('webcam') ||
            d.label.toLowerCase().includes('logitech') ||
            d.label.toLowerCase().includes('hd pro')
          ) && d.deviceId !== integratedCamera?.deviceId
        ) || (videoDevices.length >= 2 ? videoDevices[1] : null) // Par défaut, la deuxième est l'USB
        
        console.log('Identification des caméras:')
        console.log('  Intégrée:', integratedCamera?.label || 'Non trouvée')
        console.log('  USB externe:', usbCamera?.label || 'Non trouvée')
        
        // Sélectionner la bonne caméra selon le choix
        if (selectedCameraId === '1') {
          selectedDevice = integratedCamera
          console.log('[OK] Sélection: Caméra intégrée -', selectedDevice?.label || 'Caméra 1')
        } else if (selectedCameraId === '2') {
          selectedDevice = usbCamera || (videoDevices.length >= 2 ? videoDevices[1] : null)
          console.log('[OK] Sélection: Webcam USB externe -', selectedDevice?.label || 'Caméra 2')
        }
        
        if (!selectedDevice) {
          console.warn('[ATTENTION] Caméra sélectionnée non trouvée, utilisation de la première disponible')
          selectedDevice = videoDevices[0]
        }
      } catch (permError) {
        console.warn('[ATTENTION] Erreur lors de la détection des caméras:', permError)
        // On continuera avec une approche de fallback sans deviceId
      }
      
      // Étape 3: Demander le stream avec plusieurs stratégies de fallback
      let stream = null
      let lastError = null

      // Contraintes communes pour améliorer la netteté (préférence Full HD) sur toutes les caméras
      const commonConstraints = {
        width: { min: 640, ideal: 1920, max: 3840 },
        height: { min: 480, ideal: 1080, max: 2160 },
        aspectRatio: { ideal: 16 / 9 },
        frameRate: { ideal: 30, max: 60 },
      }
      
      // Stratégie 1: Essayer avec deviceId exact (si disponible)
      if (selectedDevice && selectedDevice.deviceId) {
        try {
          console.log('🎥 Stratégie 1: Essai avec deviceId exact...')
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...commonConstraints,
              deviceId: { exact: selectedDevice.deviceId },
            }
          })
          console.log('[OK] Stream obtenu avec deviceId exact')
        } catch (exactError) {
          console.warn('[ATTENTION] Échec avec deviceId exact, essai avec ideal:', exactError.name)
          lastError = exactError
          
          // Stratégie 2: Essayer avec deviceId ideal
          try {
            console.log('🎥 Stratégie 2: Essai avec deviceId ideal...')
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                ...commonConstraints,
                deviceId: { ideal: selectedDevice.deviceId },
              }
            })
            console.log('[OK] Stream obtenu avec deviceId ideal')
          } catch (idealError) {
            console.warn('[ATTENTION] Échec avec deviceId ideal:', idealError.name)
            lastError = idealError
          }
        }
      }
      
      // Stratégie 3: Essayer avec facingMode (si pas de stream encore)
      if (!stream) {
        try {
          console.log('🎥 Stratégie 3: Essai avec facingMode...')
          const facingMode = selectedCameraId === '2' ? 'environment' : 'user'
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...commonConstraints,
              facingMode: { ideal: facingMode },
            }
          })
          console.log('[OK] Stream obtenu avec facingMode:', facingMode)
        } catch (facingError) {
          console.warn('[ATTENTION] Échec avec facingMode:', facingError.name)
          lastError = facingError
        }
      }
      
      // Stratégie 4: Essayer avec contraintes simples (dernier recours)
      if (!stream) {
        try {
          console.log('🎥 Stratégie 4: Essai avec contraintes simples (dernier recours)...')
          stream = await navigator.mediaDevices.getUserMedia({ video: commonConstraints })
          console.log('[OK] Stream obtenu avec contraintes simples')
          
          if (selectedCameraId === '2' && videoDevices.length >= 2) {
            console.warn('[ATTENTION] Caméra USB non disponible, utilisation de la caméra par défaut')
            setStatusMessage('Caméra USB non disponible, utilisation de la caméra par défaut.')
          }
        } catch (simpleError) {
          console.error('[ERREUR] Échec même avec contraintes simples:', simpleError)
          lastError = simpleError
          throw simpleError
        }
      }
      
      if (!stream) {
        throw lastError || new Error('Impossible d\'obtenir le flux vidéo après toutes les tentatives')
      }
      
      streamRef.current = stream

      // Tenter d'activer un mode de mise au point continue quand c'est supporté
      try {
        const [videoTrack] = stream.getVideoTracks()
        if (videoTrack && typeof videoTrack.getCapabilities === 'function' && typeof videoTrack.applyConstraints === 'function') {
          const capabilities = videoTrack.getCapabilities()
          const advanced = []

          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            advanced.push({ focusMode: 'continuous' })
          }

          if (advanced.length > 0) {
            console.log('Application de contraintes avancées sur la caméra:', advanced)
            await videoTrack.applyConstraints({ advanced })
          }
        }
      } catch (capError) {
        console.warn('[ATTENTION] Impossible d\'ajuster la mise au point de la caméra:', capError)
      }

      const videoElement = videoRef.current
      if (!videoElement) {
        throw new Error('La caméra n’a pas pu être initialisée.')
      }

      videoElement.srcObject = stream
      videoElement.autoplay = true
      videoElement.muted = true
      videoElement.playsInline = true
      await videoElement.play()

      setIsCameraActive(true)
      setStatusMessage('Alignez votre visage avec le cadre transparent, puis cliquez sur « Scanner le visage ».')

      await waitForVideoReady(videoElement)
      setIsVideoReady(true)
      setStatusMessage('Flux prêt. Alignez votre visage dans le cadre puis cliquez sur « Scanner le visage ».')
    } catch (error) {
      console.error('[ERREUR] Erreur démarrage caméra:', error)
      console.error('  - Nom:', error.name)
      console.error('  - Message:', error.message)
      console.error('  - Stack:', error.stack)
      
      let errorMessage = 'Impossible de démarrer la caméra.'
      let detailedInfo = ''
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permission d\'accès à la caméra refusée.'
        detailedInfo = 'Veuillez autoriser l\'accès à la caméra dans les paramètres du navigateur, puis rafraîchissez la page.'
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        const cameraType = selectedCameraId === '1' ? 'intégrée' : 'USB externe'
        errorMessage = `Caméra ${cameraType} non trouvée.`
        detailedInfo = `Vérifiez que la caméra ${cameraType} est branchée, allumée et reconnue par le système.`
        if (selectedCameraId === '2') {
          detailedInfo += ' Essayez de débrancher et rebrancher la caméra USB.'
        }
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError' || error.message?.includes('Could not start video source')) {
        errorMessage = 'La caméra est déjà utilisée ou inaccessible.'
        detailedInfo = 'Solutions:\n' +
          '1. Cliquez sur "Forcer la libération et réessayer" ci-dessous\n' +
          '2. Fermez toutes les autres applications utilisant la caméra (Zoom, Teams, Skype, etc.)\n' +
          '3. Fermez les autres onglets du navigateur qui utilisent la caméra\n' +
          '4. Débranchez et rebranchez la caméra USB si nécessaire\n' +
          '5. Redémarrez le navigateur si le problème persiste\n' +
          '6. Rafraîchissez la page (F5) et réessayez'
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Les paramètres de la caméra ne peuvent pas être satisfaits.'
        detailedInfo = 'La caméra sélectionnée ne supporte peut-être pas les paramètres demandés. Essayez l\'autre caméra ou rafraîchissez la page.'
      } else if (error.message) {
        errorMessage = error.message
        detailedInfo = 'Vérifiez la console du navigateur (F12) pour plus de détails.'
      }
      
      const fullErrorMessage = detailedInfo ? `${errorMessage}\n\n${detailedInfo}` : errorMessage
      setErrorMessage(fullErrorMessage)
      setStatusMessage(errorMessage)
      stopCamera()
    }
  }, [isCameraActive, isProcessing, resetCapture, stopCamera, selectedCameraId, forceReleaseAllMediaStreams])

  const captureAndAnalyze = useCallback(async () => {
    if (!isCameraActive || !videoRef.current || isProcessing) {
      return
    }

    try {
      setIsProcessing(true)
      setErrorMessage(null)
      setStatusMessage('Capture en cours…')

      const { dataUrl, width, height } = captureFrameFromVideo(videoRef.current)
      setCaptureSize({ width, height })
      setSnapshot(dataUrl)
      setLandmarks106(null) // Réinitialiser les landmarks 106

      stopCamera()
      setStatusMessage('Analyse ArcFace et landmarks en cours…')

      // Lancer les deux analyses en parallèle : ArcFace ET 106 landmarks
      const [response, landmarksResponse] = await Promise.all([
        // Recherche ArcFace
        envoyerCaptureTempsReel(dataUrl, { threshold: DEFAULT_THRESHOLD }),
        
        // Analyse des 106 landmarks
        (async () => {
          try {
            const fetchResponse = await fetch(dataUrl)
            const blob = await fetchResponse.blob()
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })

            const formData = new FormData()
            formData.append('image', file)

            const apiResponse = await api.post('/biometrie/landmarks106/', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            })

            return apiResponse.data
          } catch (err) {
            console.warn('Erreur analyse 106 landmarks:', err)
            return { success: false }
          }
        })()
      ])

      // Gérer la réponse ArcFace
      handleRealtimeResponse(response)

      // Afficher les 106 landmarks si disponibles
      if (landmarksResponse.success && landmarksResponse.landmarks) {
        console.log('Landmarks106 reçus (temps réel):', landmarksResponse.landmarks.length, 'points')
        setLandmarks106(landmarksResponse)
      } else {
        console.warn('Landmarks106 non disponibles:', landmarksResponse)
      }
    } catch (error) {
      const fallback = error?.message || 'Erreur lors de la capture.'
      setErrorMessage(fallback)
      setStatusMessage(fallback)
    } finally {
      setIsProcessing(false)
      stopCamera()
    }
  }, [handleRealtimeResponse, isCameraActive, isProcessing, stopCamera])

  // Fonction pour analyser les 106 landmarks
  const analyserLandmarks106 = useCallback(async () => {
    if (!snapshot || isAnalyzing106) {
      return
    }

    setIsAnalyzing106(true)
    setErrorMessage(null)

    try {
      setStatusMessage('Analyse biométrique en cours…')

      // Convertir dataUrl en blob puis en File
      const response = await fetch(snapshot)
      const blob = await response.blob()
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('image', file)

      const apiResponse = await api.post('/biometrie/landmarks106/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (apiResponse.data.success && apiResponse.data.landmarks) {
        setLandmarks106(apiResponse.data)
        setStatusMessage('Analyse des 106 landmarks terminée avec succès.')
      } else {
        const errorMsg = apiResponse.data.error || 'Aucun visage détecté. Réessayer.'
        setErrorMessage(errorMsg)
        setStatusMessage(errorMsg)
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de l\'analyse biométrique'
      setErrorMessage(errorMessage)
      setStatusMessage(errorMessage)
    } finally {
      setIsAnalyzing106(false)
    }
  }, [snapshot, isAnalyzing106])

  const primaryButtonLabel = useMemo(() => {
    if (isProcessing) {
      return 'Analyse en cours…'
    }
    if (!isCameraActive) {
      return 'Démarrer la caméra'
    }
    if (!isVideoReady) {
      return 'Préparation du flux…'
    }
    return 'Scanner le visage'
  }, [isCameraActive, isProcessing, isVideoReady])

  const similarityText = matchResult?.similarity
    ? `${Number(matchResult.similarity).toFixed(1)} %`
    : null

  const aspectRatioStyle = useMemo(() => {
    if (captureSize.width && captureSize.height) {
      return { aspectRatio: `${captureSize.width} / ${captureSize.height}` }
    }
    return { aspectRatio: '16 / 9' }
  }, [captureSize.height, captureSize.width])

  const handlePrimaryAction = () => {
    if (!isCameraActive) {
      void startCamera()
      return
    }

    if (isVideoReady) {
      void captureAndAnalyze()
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Reconnaissance en temps réel</h2>
        <p className="text-sm text-gray-600">
          Activez la caméra, placez votre visage au centre du cadre, puis lancez la capture pour
          analyser la photo avec ArcFace.
        </p>
      </div>

      {/* Section de sélection de caméra */}
      {!isCameraActive && (
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Camera className="text-blue-600" size={20} />
            <span>Sélectionner une caméra</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Caméra intégrée */}
            <button
              type="button"
              onClick={() => setSelectedCameraId('1')}
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                selectedCameraId === '1'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <Monitor className={selectedCameraId === '1' ? 'text-blue-600' : 'text-gray-600'} size={24} />
              <div className="text-left">
                <div className={`font-semibold ${selectedCameraId === '1' ? 'text-blue-900' : 'text-gray-900'}`}>
                  Caméra intégrée
                </div>
                <div className="text-xs text-gray-600">Caméra intégrée à votre machine</div>
              </div>
              {selectedCameraId === '1' && (
                <CheckCircle2 className="text-blue-600 ml-auto" size={20} />
              )}
            </button>

            {/* Webcam USB externe */}
            <button
              type="button"
              onClick={() => setSelectedCameraId('2')}
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                selectedCameraId === '2'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-green-300'
              }`}
            >
              <Usb className={selectedCameraId === '2' ? 'text-green-600' : 'text-gray-600'} size={24} />
              <div className="text-left">
                <div className={`font-semibold ${selectedCameraId === '2' ? 'text-green-900' : 'text-gray-900'}`}>
                  Webcam USB externe
                </div>
                <div className="text-xs text-gray-600">Caméra branchée via USB (A03)</div>
              </div>
              {selectedCameraId === '2' && (
                <CheckCircle2 className="text-green-600 ml-auto" size={20} />
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={isProcessing || (isCameraActive && !isVideoReady)}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-2 h-4 w-4" />
          )}
          {primaryButtonLabel}
        </button>

        {isCameraActive && !isProcessing && (
          <button
            type="button"
            onClick={stopCamera}
            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            <StopCircle className="mr-2 h-4 w-4" />
            Arrêter la caméra
          </button>
        )}

        {snapshot && !isProcessing && (
          <button
            type="button"
            onClick={analyserLandmarks106}
            disabled={isAnalyzing106}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isAnalyzing106
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : landmarks106
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
            }`}
          >
            {isAnalyzing106 ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse biométrique en cours…
              </>
            ) : landmarks106 ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Re-analyser visage (106 points)
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Analyser visage (106 points)
              </>
            )}
          </button>
        )}

        {(snapshot || errorMessage) && !isProcessing && (
          <button
            type="button"
            onClick={resetCapture}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Nouvelle capture
          </button>
        )}
      </div>

      <div
        className="relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-black shadow-lg"
        style={aspectRatioStyle}
      >
        {snapshot ? (
          <>
            <img
              src={snapshot}
              alt="Capture webcam"
              className="h-full w-full object-contain"
            />
            <canvas
              ref={overlayCanvasRef}
              width={captureSize.width}
              height={captureSize.height}
              className="absolute inset-0 h-full w-full pointer-events-none z-10"
              style={{ imageRendering: 'pixelated' }}
            />
          </>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {isCameraActive && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-2/3 w-2/3 rounded-[32px] border-2 border-white/80 bg-black/5" />
              </div>
            )}
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/65 via-black/45 to-black/65 text-white">
                <Camera className="mb-3 h-10 w-10 text-white/80" />
                <p className="max-w-xs text-center text-sm text-white/75">
                  La caméra est désactivée. Lancez une reconnaissance pour capturer une image.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-white/70 px-5 py-4 shadow-sm backdrop-blur">
          <p className="text-sm font-medium text-gray-800">{statusMessage}</p>
        </div>

        {errorMessage && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="flex-1 whitespace-pre-line">{errorMessage}</div>
            </div>
            {errorMessage.includes('déjà utilisée') && (
              <button
                type="button"
                onClick={async () => {
                  setStatusMessage('Libération de la caméra en cours...')
                  setErrorMessage(null)
                  await forceReleaseAllMediaStreams()
                  setStatusMessage('Caméra libérée. Tentative de redémarrage...')
                  // Attendre un peu plus longtemps pour les caméras USB
                  await new Promise(resolve => setTimeout(resolve, 2000))
                  try {
                    await startCamera()
                  } catch (err) {
                    console.error('Erreur après libération forcée:', err)
                    setErrorMessage(
                      'La caméra est toujours inaccessible. ' +
                      'Vérifiez que toutes les autres applications (Zoom, Teams, Skype, etc.) sont fermées, ' +
                      'puis rafraîchissez la page (F5) et réessayez.'
                    )
                    setStatusMessage('La caméra est toujours inaccessible.')
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                <Power className="mr-2 h-4 w-4" />
                Forcer la libération et réessayer
              </button>
            )}
          </div>
        )}

        {matchResult && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-emerald-900">Correspondance détectée</h3>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
              {matchResult.photo_url && (
                <img
                  src={matchResult.photo_url}
                  alt={`${matchResult.nom || ''} ${matchResult.prenom || ''}`.trim()}
                  className="h-28 w-28 flex-shrink-0 rounded-xl object-cover shadow"
                />
              )}
              <div className="space-y-1 text-sm text-emerald-900">
                <p className="text-base font-semibold">
                  {[matchResult.nom, matchResult.prenom].filter(Boolean).join(' ') || 'Criminel identifié'}
                </p>
                {matchResult.numero_fiche && (
                  <p className="text-emerald-800/80">Fiche : {matchResult.numero_fiche}</p>
                )}
                {similarityText && (
                  <p className="font-medium">
                    Similarité estimée : <span className="font-semibold">{similarityText}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!matchResult && snapshot && !errorMessage && (
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm text-gray-700">
            Aucun individu correspondant trouvé dans la base.
          </div>
        )}

      </div>

      <p className="text-xs text-gray-500">
        La caméra est automatiquement désactivée après chaque capture. Relancez la reconnaissance
        pour effectuer un nouveau cliché.
      </p>
    </section>
  )
}

export default ReconnaissanceTempsReel
