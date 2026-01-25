/**
 * Services de communication avec le backend IA (ArcFace).
 * Centralise les appels réseau afin de faciliter l’extension future vers de nouvelles analyses IA.
 */

import { post } from '../../../services/api'

const ARCFACE_ANALYSE_ENDPOINT = '/ai-analysis/real/recherche_photo/'
const PHOTO_SEARCH_ENDPOINT = '/ia/recherche-photo/'
const PHOTO_SEARCH_STREAM_ENDPOINT = '/ia/recherche-photo-stream/'
const REALTIME_CAPTURE_ENDPOINT = '/ia/realtime-recognition/'
const DEFAULT_TIMEOUT = 60000

const construireFormData = ({ file, mode, threshold, topK, lineupIds, includeEmbedding }) => {
  const formData = new FormData()

  if (file instanceof File) {
    formData.append('image', file)
  } else if (file instanceof Blob) {
    const inferredName = file.name || 'capture.jpg'
    const inferredType = file.type || 'image/jpeg'
    const normalizedFile = new File([file], inferredName, { type: inferredType })
    formData.append('image', normalizedFile)
  } else {
    throw new Error('Fichier d’image invalide pour ArcFace.')
  }

  formData.append('mode', mode)
  formData.append('threshold', String(threshold))

  if (mode === 'search') {
    formData.append('top_k', String(topK))
  }

  if (mode === 'lineup' && Array.isArray(lineupIds)) {
    lineupIds.forEach((id) => formData.append('lineup_ids', id))
  }

  if (includeEmbedding) {
    formData.append('include_embedding', 'true')
  }

  return formData
}

const normaliserScore = (score) => {
  const numeric = Number(score ?? 0)
  if (Number.isNaN(numeric)) {
    return 0
  }
  if (numeric <= 1) {
    return numeric * 100
  }
  return numeric
}

const normaliserCorrespondances = (payload, fallbackThreshold = 0.6) => {
  if (!payload) {
    return []
  }

  const mode = payload.mode || 'search'

  if (mode === 'lineup') {
    return (payload.results || []).map((match) => {
      const percent = normaliserScore(match.confidence_score)
      return {
        id: match.person_id,
        label: match.person_name || 'Personne inconnue',
        confidencePercent: percent,
        confidenceText: `${percent.toFixed(1)}%`,
        verified: Boolean(match.verified),
        raw: match,
        source: 'lineup',
      }
    })
  }

  const thresholdPercent = normaliserScore(payload.threshold ?? fallbackThreshold)

  return (payload.matches || []).map((match) => {
    const person = match.person || {}
    const percent = normaliserScore(match.confidence_score)
    const isVerified = percent >= thresholdPercent

    return {
      id: match.face_embedding_id || person.id || match.embedding_id || match.person_id || percent,
      label: person.name || person.full_name || person.email || 'Personne inconnue',
      confidencePercent: percent,
      confidenceText: `${percent.toFixed(1)}%`,
      verified: isVerified,
      raw: {
        ...match,
        person,
      },
      source: 'search',
    }
  })
}

const executerRequeteArcFace = async (params) => {
  const {
    file,
    mode = 'search',
    threshold = 0.6,
    topK = 3,
    lineupIds = [],
    includeEmbedding = false,
  } = params

  const formData = construireFormData({
    file,
    mode,
    threshold,
    topK,
    lineupIds,
    includeEmbedding,
  })

  const response = await post(ARCFACE_ANALYSE_ENDPOINT, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: DEFAULT_TIMEOUT,
  })

  const payload = response.data || {}

  return {
    success: Boolean(payload.success),
    message: payload.message,
    error: payload.error,
    mode: payload.data?.mode || mode,
    invalidIds: payload.data?.invalid_ids || [],
    raw: payload,
    matches: normaliserCorrespondances(payload.data, threshold),
  }
}

/**
 * Analyse un cliché capturé en direct (caméra) via l'ancien endpoint.
 */
export const analyserVisageTempsReel = async (blob, options = {}) => {
  return executerRequeteArcFace({
    file: blob,
    mode: 'search',
    threshold: options.threshold ?? 0.6,
    topK: options.topK ?? 3,
    includeEmbedding: options.includeEmbedding ?? false,
  })
}

const normaliserCaptureTempsReel = (payload = {}) => ({
  status: payload.status || 'error',
  message: payload.message,
  match: payload.match || null,
  similarity: typeof payload.similarity === 'number' ? payload.similarity : null,
  landmarks: Array.isArray(payload.landmarks) ? payload.landmarks : [],
  bbox: Array.isArray(payload.bbox) ? payload.bbox : [],
  frameDimensions: payload.frame_dimensions || null,
  durationMs: typeof payload.duration_ms === 'number' ? payload.duration_ms : null,
})

/**
 * Analyse une capture unique (base64) pour la reconnaissance temps réel.
 */
export const envoyerCaptureTempsReel = async (imageBase64, options = {}) => {
  if (!imageBase64) {
    throw new Error('Image base64 manquante pour la reconnaissance temps réel.')
  }

  const payload = {
    image: imageBase64,
  }

  if (options.threshold !== undefined) {
    payload.threshold = options.threshold
  }

  const response = await post(REALTIME_CAPTURE_ENDPOINT, payload, {
    timeout: options.timeout ?? DEFAULT_TIMEOUT,
  })

  return normaliserCaptureTempsReel(response.data || {})
}

/**
 * Normalise la réponse du nouvel endpoint /ia/recherche-photo/.
 */
const normaliserResultatsRecherchePhoto = (data, fallbackThresholdPercent) => {
  const resultats = Array.isArray(data?.resultats) ? data.resultats : []
  const thresholdPercent = typeof data?.seuil === 'number'
    ? data.seuil
    : Number.parseFloat(data?.seuil) || fallbackThresholdPercent

  const matches = resultats
    .map((entry, index) => {
      const similarityPercent = Number(entry?.similarite ?? 0)
      const nom = entry?.nom || ''
      const prenom = entry?.prenom || ''
      const label = `${nom} ${prenom}`.trim() || `Correspondance #${index + 1}`
      const ficheId = entry?.id ?? entry?.fiche_id

      return {
        id: ficheId ?? index,
        ficheId,
        nom,
        prenom,
        label,
        similarityPercent,
        similarityText: `${similarityPercent.toFixed(1)}%`,
        confidencePercent: similarityPercent,
        confidenceText: `${similarityPercent.toFixed(1)}%`,
        photoUrl: entry?.photo_criminel || entry?.photo_url,
        ficheUrl: entry?.fiche_url || (ficheId ? `/criminels/${ficheId}` : null),
        verified: similarityPercent >= thresholdPercent,
        raw: entry,
        source: 'photo-search',
      }
    })
    .sort((a, b) => b.similarityPercent - a.similarityPercent)

  return {
    matches,
    thresholdPercent,
  }
}

const parseTempsExecution = (value) => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const numeric = Number.parseFloat(value.replace(/[^\d.]/g, ''))
    if (!Number.isNaN(numeric)) {
      return numeric
    }
  }
  return 0
}

/**
 * Recherche des correspondances pour une photo (recherche directe).
 */
export const rechercherCorrespondance = async (file, options = {}) => {
  const formData = new FormData()
  if (file instanceof File) {
    formData.append('photo', file)
  } else if (file instanceof Blob) {
    const normalizedFile = new File([file], file.name || 'recherche.jpg', { type: file.type || 'image/jpeg' })
    formData.append('photo', normalizedFile)
  } else {
    throw new Error('Fichier d’image invalide pour la recherche photo.')
  }

  if (options.threshold !== undefined) {
    formData.append('threshold', String(options.threshold))
  }
  if (options.topK !== undefined) {
    formData.append('top_k', String(options.topK))
  }

  const response = await post(PHOTO_SEARCH_ENDPOINT, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: DEFAULT_TIMEOUT,
  })

  const data = response.data || {}
  const { matches, thresholdPercent } = normaliserResultatsRecherchePhoto(
    data,
    options.threshold ? options.threshold * 100 : 70,
  )

  return {
    matches,
    raw: data,
    total: data.total ?? matches.length,
    message: data.message,
    thresholdPercent,
    searchTime: parseTempsExecution(data.temps_execution ?? data.search_time),
  }
}

/**
 * Recherche temps réel (streaming) sur un flux vidéo.
 * @param {Object} payload - { image?: Blob|File, embedding?: Array|TypedArray|string }
 * @param {Object} options - { threshold, topK, frameWidth, frameHeight, timeout, signal }
 * @returns {Promise<object>} Résultats du backend
 */
export const rechercherCorrespondanceStream = async (payload = {}, options = {}) => {
  const { image, embedding } = payload
  if (!image && !embedding) {
    throw new Error('Une image ou un embedding est requis pour la recherche streaming.')
  }

  const formData = new FormData()

  if (image) {
    if (image instanceof File) {
      formData.append('image', image)
    } else if (image instanceof Blob) {
      const inferredName = image.name || `frame-${Date.now()}.jpg`
      const normalized = new File([image], inferredName, { type: image.type || 'image/jpeg' })
      formData.append('image', normalized)
    } else {
      throw new Error('Format d’image invalide pour la recherche streaming.')
    }
  }

  if (embedding !== undefined && embedding !== null) {
    let serialized = embedding
    if (ArrayBuffer.isView(embedding)) {
      serialized = Array.from(embedding)
    } else if (embedding instanceof ArrayBuffer) {
      serialized = Array.from(new Float32Array(embedding))
    } else if (Array.isArray(embedding)) {
      serialized = embedding
    }
    formData.append('embedding', typeof serialized === 'string' ? serialized : JSON.stringify(serialized))
  }

  if (options.threshold !== undefined) {
    formData.append('threshold', String(options.threshold))
  }
  if (options.topK !== undefined) {
    formData.append('top_k', String(options.topK))
  }
  if (options.frameWidth !== undefined) {
    formData.append('frame_width', String(options.frameWidth))
  }
  if (options.frameHeight !== undefined) {
    formData.append('frame_height', String(options.frameHeight))
  }

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: options.timeout ?? DEFAULT_TIMEOUT,
  }

  if (options.signal) {
    config.signal = options.signal
  }

  const response = await post(PHOTO_SEARCH_STREAM_ENDPOINT, formData, config)
  return response.data
}

/**
 * Recherche sur plusieurs photos (tapissage multi-fichiers).
 */
export const rechercherCorrespondancesMultiples = async (files, options = {}) => {
  const results = []

  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const analysis = await rechercherCorrespondance(file, options)
    results.push({
      file,
      analysis,
    })
  }

  return results
}

export default {
  analyserVisageTempsReel,
  envoyerCaptureTempsReel,
  rechercherCorrespondance,
  rechercherCorrespondanceStream,
  rechercherCorrespondancesMultiples,
}


