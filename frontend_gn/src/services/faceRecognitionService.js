import { post } from './api'

const buildFormData = (file, options = {}) => {
  const formData = new FormData()

  if (file instanceof File) {
    formData.append('image', file)
  } else if (file instanceof Blob) {
    const fileName = options.fileName || 'snapshot.jpg'
    const mimeType = file.type || options.mimeType || 'image/jpeg'
    const normalizedFile = new File([file], fileName, { type: mimeType })
    formData.append('image', normalizedFile)
  } else {
    throw new Error('Le fichier image est invalide.')
  }

  const mode = options.mode || 'search'
  formData.append('mode', mode)

  const threshold = options.threshold ?? 0.6
  formData.append('threshold', threshold)

  if (options.includeEmbedding) {
    formData.append('include_embedding', 'true')
  }

  if (mode === 'search') {
    const topK = options.topK ?? 3
    formData.append('top_k', topK)
  }

  if (mode === 'lineup' && Array.isArray(options.lineupIds)) {
    options.lineupIds.forEach((id) => {
      formData.append('lineup_ids', id)
    })
  }

  return formData
}

/**
 * Envoie un cliché unique au backend ArcFace pour reconnaissance.
 *
 * @param {Blob} snapshotBlob - Image capturée depuis la webcam.
 * @param {Object} options - Options supplémentaires.
 * @param {number} options.threshold - Seuil de similarité (0-1). Défaut: 0.7.
 * @param {number} options.topK - Nombre de résultats à retourner. Défaut: 5.
 * @returns {Promise<{success: boolean, matches: Array}>}
 */
export const recognizeSnapshot = async (snapshotBlob, options = {}) => {
  const formData = buildFormData(snapshotBlob, options)

  const response = await post('/ai-analysis/real/recherche_photo/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  })

  return response.data || {}
}

export default {
  recognizeSnapshot,
}

