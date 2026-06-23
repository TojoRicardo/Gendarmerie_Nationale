/**
 * Normalise une URL média pour l'affichage côté frontend.
 * Utilise le proxy Vite (/media) au lieu d'une URL backend absolue (mixed content HTTPS).
 */
export function resolveMediaUrl(url) {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('blob:')) return url

  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url)
      if (parsed.pathname.startsWith('/media/')) {
        return `${window.location.origin}${parsed.pathname}`
      }
      return url
    }
  } catch {
    // Ignorer les URLs invalides
  }

  if (url.startsWith('/media/')) {
    return `${window.location.origin}${url}`
  }

  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
}
