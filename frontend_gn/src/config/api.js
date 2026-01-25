const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000/api'

const DEV_PORTS = new Set([
  '5173',
  '4173',
  '4174',
  '3000',
  '3001',
  '3002',
  '3003',
  '3004',
  '8080',
])

const isLocalDevHost = (origin) => {
  try {
    const url = new URL(origin)
    const isLoopback = ['localhost', '127.0.0.1'].includes(url.hostname)
    const defaultPort = url.protocol === 'https:' ? '443' : '80'
    const port = url.port || defaultPort
    const isDevPort = DEV_PORTS.has(port)
    return isLoopback && isDevPort
  } catch (error) {
    return false
  }
}

const resolveBaseUrl = () => {
  const explicitEnvUrl = import.meta?.env?.VITE_API_URL
  if (explicitEnvUrl) {
    return explicitEnvUrl
  }

  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin

    if (isLocalDevHost(origin)) {
      return DEFAULT_BACKEND_URL
    }

    return `${origin.replace(/\/+$/, '')}/api`
  }

  return DEFAULT_BACKEND_URL
}

const API_CONFIG = {
  // URL de base de l'API Django (avec le préfixe /api/)
  BASE_URL: resolveBaseUrl(),

  // Timeout des requêtes
  TIMEOUT: 30000,

  // Headers par défaut
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// Export nommé pour la compatibilité
export const API_BASE_URL = API_CONFIG.BASE_URL

export default API_CONFIG