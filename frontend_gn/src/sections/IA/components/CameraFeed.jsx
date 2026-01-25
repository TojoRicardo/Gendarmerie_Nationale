import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

const formatCameraError = (error) => {
  if (!error) {
    return 'Impossible d’accéder à la caméra.'
  }

  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Accès à la caméra refusé. Autorisez l’utilisation de la caméra dans votre navigateur.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Aucun périphérique vidéo détecté. Branchez ou activez une caméra.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'La caméra est utilisée par une autre application. Fermez-la puis réessayez.'
    case 'NotSupportedError':
      return 'Votre navigateur ne supporte pas l’accès à la caméra pour ce site.'
    default:
      return error.message || 'Erreur imprévue lors de l’accès à la caméra.'
  }
}

/**
 * Composant réutilisable de flux caméra.
 * Permet de démarrer/arrêter le flux et de capturer une image via l’API MediaDevices.
 */
const CameraFeed = forwardRef(
  ({ className = '', onStatusChange, onError, placeholder, overlayContent = null, children = null }, ref) => {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | starting | active | error
  const [lastError, setLastError] = useState(null)

  const updateStatus = (nextStatus) => {
    setStatus(nextStatus)
    onStatusChange?.(nextStatus)
  }

  const startCamera = async () => {
    if (status === 'active' || status === 'starting') {
      return
    }

    updateStatus('starting')
    setLastError(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        const notSupported = new Error('La capture vidéo n’est pas supportée par ce navigateur.')
        notSupported.name = 'NotSupportedError'
        throw notSupported
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        await videoRef.current.play()
      }

      updateStatus('active')
    } catch (error) {
      const formatted = formatCameraError(error)
      setLastError(formatted)
      onError?.(formatted, error)
      stopCamera()
      updateStatus('error')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    updateStatus('idle')
  }

  const captureFrame = async (mimeType = 'image/jpeg', quality = 0.95) => {
    if (status !== 'active' || !videoRef.current) {
      throw new Error('La caméra doit être active pour capturer une image.')
    }

    const element = videoRef.current

    if (element.readyState < 2) {
      throw new Error('Le flux vidéo n’est pas encore prêt. Patientez une seconde et réessayez.')
    }

    const canvas = document.createElement('canvas')
    canvas.width = element.videoWidth || 1280
    canvas.height = element.videoHeight || 720

    const context = canvas.getContext('2d')
    context.drawImage(element, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Capture impossible. Réessayez.'))
            return
          }

          blob.name = `capture-${Date.now()}.jpg`
          resolve(blob)
        },
        mimeType,
        quality,
      )
    })
  }

  useImperativeHandle(ref, () => ({
    startCamera,
    stopCamera,
    captureFrame,
    status,
    videoElement: videoRef.current,
    hasError: status === 'error',
  }))

  useEffect(() => () => stopCamera(), [])

  return (
    <div className={`relative rounded-2xl border border-gray-900 bg-black shadow-lg ${className}`}>
      {status === 'active' ? (
        <video ref={videoRef} autoPlay playsInline className="h-full w-full rounded-2xl object-cover" />
      ) : (
        <div className="flex h-full min-h-[240px] items-center justify-center px-6 py-10 text-center text-sm text-gray-200">
          {placeholder || 'Caméra désactivée.'}
        </div>
      )}

      {overlayContent && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl">{overlayContent}</div>
      )}

      {lastError && (
        <div className="pointer-events-auto absolute inset-x-4 bottom-4 rounded-lg bg-red-100/90 px-3 py-2 text-xs font-semibold text-red-700 shadow-lg">
          {lastError}
        </div>
      )}

      {children}
    </div>
  )
})

CameraFeed.displayName = 'CameraFeed'

export default CameraFeed


