import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Camera, PauseCircle, PlayCircle, StopCircle, Video } from 'lucide-react'

const mapMediaError = (error) => {
  if (!error) {
    return 'Impossible d’accéder à la caméra.'
  }

  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Permission refusée pour la caméra.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Aucune caméra détectée sur cet appareil.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'La caméra est déjà utilisée par une autre application.'
    case 'NotSupportedError':
      return 'Votre navigateur ne supporte pas l’accès à la caméra pour ce site.'
    default:
      return error.message || 'Erreur imprévue lors de l’accès à la caméra.'
  }
}

/**
 * Composant autonome pour afficher et contrôler la webcam intégrée.
 *
 * - Démarre uniquement sur action utilisateur (bouton "Démarrer la caméra")
 * - Arrête proprement les tracks (bouton "Arrêter la caméra")
 * - Affiche le flux dans une balise <video> centrée et responsives
 * - Prépare un utilitaire `captureFrame` exposé via ref pour de futures captures
 */
const CameraView = forwardRef(({ className = '', onStreamStart, onStreamStop }, ref) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [status, setStatus] = useState('idle') // idle | starting | active | error
  const [message, setMessage] = useState('Caméra inactive.')
  const [errorMessage, setErrorMessage] = useState(null)
  const [isStarting, setIsStarting] = useState(false)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStatus('idle')
    setMessage('Caméra arrêtée.')
    setErrorMessage(null)
    onStreamStop?.()
  }, [onStreamStop])

  const startCamera = useCallback(async () => {
    if (status === 'active' || isStarting) {
      setMessage('Caméra déjà en marche.')
      return
    }

    setIsStarting(true)
    setErrorMessage(null)
    setMessage('Initialisation de la caméra…')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error('La capture vidéo n’est pas supportée par ce navigateur.'), {
          name: 'NotSupportedError',
        })
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        await videoRef.current.play()
      }

      setStatus('active')
      setMessage('Flux actif.')
      onStreamStart?.(stream)
    } catch (error) {
      const friendly = mapMediaError(error)
      setErrorMessage(friendly)
      setMessage(friendly)
      setStatus('error')
      stopCamera()
    } finally {
      setIsStarting(false)
    }
  }, [isStarting, onStreamStart, status, stopCamera])

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || status !== 'active') {
      throw new Error('La caméra doit être active pour capturer une image.')
    }

    const video = videoRef.current
    if (video.readyState < 2) {
      throw new Error('Le flux vidéo n’est pas encore prêt. Patientez une seconde et réessayez.')
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Impossible de capturer une image pour le moment.'))
          return
        }
        blob.name = `capture-${Date.now()}.jpg`
        resolve(blob)
      }, 'image/jpeg')
    })
  }, [status])

  useImperativeHandle(
    ref,
    () => ({
      startCamera,
      stopCamera,
      captureFrame,
      get videoElement() {
        return videoRef.current
      },
    }),
    [captureFrame, startCamera, stopCamera]
  )

  useEffect(() => () => stopCamera(), [stopCamera])

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="flex items-center text-lg font-semibold text-slate-900">
            <Video className="mr-2 text-emerald-500" size={20} />
            Vue caméra intégrée
          </h3>
          <p className="text-sm text-slate-600">
            Activez manuellement la webcam intégrée pour prévisualiser le flux. Vous pourrez réutiliser ce composant
            pour les futures captures destinées à l’IA.
          </p>
        </div>
        <Camera className="hidden text-slate-300 sm:block" size={28} />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-96 w-full rounded-2xl bg-black object-cover"
          />
          {status !== 'active' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-4 py-6 text-center text-sm text-slate-100">
              {status === 'idle' ? 'Caméra inactive.' : message}
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 md:max-w-xs">
          <button
            type="button"
            onClick={startCamera}
            disabled={isStarting}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlayCircle size={18} className="mr-2" />
            {isStarting ? 'Initialisation…' : 'Démarrer la caméra'}
          </button>

          <button
            type="button"
            onClick={stopCamera}
            disabled={status !== 'active'}
            className="inline-flex items-center justify-center rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <StopCircle size={18} className="mr-2" />
            Arrêter la caméra
          </button>

          <button
            type="button"
            onClick={() => {
              captureFrame().catch(() => {})
            }}
            disabled={status !== 'active'}
            className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PauseCircle size={18} className="mr-2" />
            Capturer (à venir)
          </button>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {errorMessage ? (
              <span className="font-semibold text-red-600">{errorMessage}</span>
            ) : (
              message
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

CameraView.displayName = 'CameraView'

export default CameraView


