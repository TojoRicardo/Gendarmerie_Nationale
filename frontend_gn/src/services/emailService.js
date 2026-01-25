import { get, post, patch, del } from './apiGlobal'
import { makeCacheKey, readCache, writeCache, isNetworkError } from '../utils/apiFallback'

const DEFAULT_STATS = {
  inbox_unread: 0,
  inbox_total: 0,
  sent_total: 0,
  drafts_total: 0,
  trash_total: 0,
  important_total: 0,
}

const CACHE_NAMES = {
  inbox: 'emails:inbox',
  sent: 'emails:sent',
  drafts: 'emails:drafts',
  trash: 'emails:trash',
  stats: 'emails:stats',
  detail: (id) => `emails:detail:${id}`,
}

const returnArray = (value) => (Array.isArray(value) ? value : [])

export const getInboxEmails = async (params = {}) => {
  const cacheKey = makeCacheKey(CACHE_NAMES.inbox, params)
  try {
    const response = await get('/emails/inbox/', { params })
    writeCache(cacheKey, response.data)
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      const cached = returnArray(readCache(cacheKey, []))
      if (!cached.length) {
        console.debug('Inbox hors-ligne: aucune donnée en cache disponible.')
      }
      return cached
    }
    throw error
  }
}

export const getSentEmails = async (params = {}) => {
  const cacheKey = makeCacheKey(CACHE_NAMES.sent, params)
  try {
    const response = await get('/emails/sent/', { params })
    writeCache(cacheKey, response.data)
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      return returnArray(readCache(cacheKey, []))
    }
    throw error
  }
}

export const getDraftEmails = async (params = {}) => {
  const cacheKey = makeCacheKey(CACHE_NAMES.drafts, params)
  try {
    const response = await get('/emails/drafts/', { params })
    writeCache(cacheKey, response.data)
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      return returnArray(readCache(cacheKey, []))
    }
    throw error
  }
}

export const getTrashEmails = async (params = {}) => {
  const cacheKey = makeCacheKey(CACHE_NAMES.trash, params)
  try {
    const response = await get('/emails/trash/', { params })
    writeCache(cacheKey, response.data)
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      return returnArray(readCache(cacheKey, []))
    }
    throw error
  }
}

export const getEmailById = async (id) => {
  const cacheKey = CACHE_NAMES.detail(id)
  try {
    const response = await get(`/emails/${id}/`)
    writeCache(cacheKey, response.data)
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      const cached = readCache(cacheKey, null)
      if (cached) {
        return cached
      }
    }
    throw error
  }
}

export const sendEmail = async (payload) => {
  try {
    const response = await post('/emails/send/', payload)
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      error.userMessage = 'Impossible d’envoyer l’e-mail hors connexion.'
    }
    throw error
  }
}

export const updateEmail = async (id, payload) => {
  try {
    const response = await patch(`/emails/${id}/`, payload)
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      error.userMessage = 'Impossible de mettre à jour l’e-mail hors connexion.'
    }
    throw error
  }
}

export const deleteEmail = async (id) => {
  try {
    await del(`/emails/${id}/`)
  } catch (error) {
    if (isNetworkError(error)) {
      error.userMessage = 'Action indisponible hors connexion.'
    }
    throw error
  }
}

export const purgeEmail = async (id) => {
  try {
    await del(`/emails/${id}/purge/`)
  } catch (error) {
    if (isNetworkError(error)) {
      error.userMessage = 'Action indisponible hors connexion.'
    }
    throw error
  }
}

export const restoreEmail = async (id) => {
  try {
    const response = await patch(`/emails/${id}/restore/`)
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      error.userMessage = 'Action indisponible hors connexion.'
    }
    throw error
  }
}

export const markEmailRead = async (id) => {
  try {
    await patch(`/emails/${id}/read/`)
  } catch (error) {
    if (isNetworkError(error)) {
      error.userMessage = 'Impossible de marquer comme lu hors connexion.'
    }
    throw error
  }
}

export const markEmailUnread = async (id) => {
  try {
    await patch(`/emails/${id}/unread/`)
  } catch (error) {
    if (isNetworkError(error)) {
      error.userMessage = 'Impossible de marquer comme non lu hors connexion.'
    }
    throw error
  }
}

export const toggleImportantEmail = async (id) => {
  try {
    const response = await patch(`/emails/${id}/important/`)
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      error.userMessage = 'Impossible de modifier l’importance hors connexion.'
    }
    throw error
  }
}

export const getEmailStats = async () => {
  const cacheKey = CACHE_NAMES.stats
  try {
    const response = await get('/emails/stats/')
    writeCache(cacheKey, response.data)
    return response.data
  } catch (error) {
    if (isNetworkError(error)) {
      return readCache(cacheKey, DEFAULT_STATS)
    }
    throw error
  }
}

