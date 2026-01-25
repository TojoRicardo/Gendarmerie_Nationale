/**
 * Composant pour afficher les erreurs de connexion réseau de manière conviviale
 */

import React from 'react'
import { AlertTriangle, RefreshCw, HelpCircle, Server, Terminal } from 'lucide-react'
import { getErrorMessage, isNetworkError } from '../utils/errorHandler'

const NetworkError = ({ error, onRetry = null, className = '' }) => {
  if (!error || !isNetworkError(error)) {
    return null
  }

  const errorInfo = getErrorMessage(error)

  return (
    <div className={`bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex items-start gap-4">
        {/* Icône */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <Server className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {errorInfo.title || 'Erreur de connexion'}
          </h3>

          {/* Message d'erreur formaté */}
          <div className="text-sm text-amber-800 mb-4 whitespace-pre-line leading-relaxed">
            {errorInfo.message}
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <Terminal className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  Pour démarrer le serveur :
                </p>
                <ol className="text-xs text-amber-800 space-y-1.5 list-decimal list-inside">
                  <li>Ouvrez un terminal ou une invite de commande</li>
                  <li>Naviguez vers le dossier <code className="bg-amber-100 px-1.5 py-0.5 rounded">backend_gn</code></li>
                  <li>Exécutez la commande : <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">python manage.py runserver</code></li>
                  <li>Attendez que le serveur démarre (message "Starting development server...")</li>
                  <li>Vérifiez que le serveur écoute sur <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">http://127.0.0.1:8000</code></li>
                </ol>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors duration-200 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-amber-300 text-amber-700 font-medium rounded-lg hover:bg-amber-50 transition-colors duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Recharger la page
            </button>

            <a
              href="https://docs.djangoproject.com/en/stable/intro/tutorial01/#the-development-server"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-amber-300 text-amber-700 font-medium rounded-lg hover:bg-amber-50 transition-colors duration-200"
            >
              <HelpCircle className="w-4 h-4" />
              Aide
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NetworkError

