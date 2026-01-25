/**
 * Gestion simple du cache local pour les appels API hors-ligne.
 * Les données sont stockées dans localStorage avec un timestamp.
 */

const CACHE_PREFIX = 'sgic_cache::'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

const safeStringify = (value) => {
  try {
    return JSON.stringify(value)
  } catch (error) {
    console.warn('Impossible de sérialiser la donnée pour le cache', error)
    return null
  }
}

const safeParse = (value) => {
  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

export const makeCacheKey = (namespace, params = {}) => {
  if (!params || Object.keys(params).length === 0) {
    return `${CACHE_PREFIX}${namespace}`
  }
  const paramsKey = safeStringify(params) || ''
  return `${CACHE_PREFIX}${namespace}::${paramsKey}`
}

export const writeCache = (key, data) => {
  try {
    const payload = {
      timestamp: Date.now(),
      data,
    }
    const serialized = safeStringify(payload)
    if (serialized) {
      localStorage.setItem(key, serialized)
    }
  } catch (error) {
    console.warn('Impossible d\'écrire dans le cache local', error)
  }
}

export const readCache = (key, defaultValue = null, ttl = DEFAULT_TTL) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return defaultValue
    }
    const payload = safeParse(raw)
    if (!payload || typeof payload !== 'object') {
      return defaultValue
    }
    if (ttl > 0) {
      const age = Date.now() - (payload.timestamp || 0)
      if (age > ttl) {
        return defaultValue
      }
    }
    return payload.data ?? defaultValue
  } catch (error) {
    return defaultValue
  }
}

export const isNetworkError = (error) => {
  if (!error) return false
  if (!error.response) return true
  if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED') return true
  return false
}


