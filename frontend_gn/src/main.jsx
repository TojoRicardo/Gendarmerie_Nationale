import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.pcss'
import './styles/arcface-animations.css'
import './styles/sidebar-pro.css'
import './styles/sidebar-fixed.css'
import './styles/blue-override.css'

// Fonction utilitaire pour détecter les erreurs d'extensions
const isExtensionError = (error, message = '', stack = '', filename = '') => {
  const msg = (message || '').toLowerCase()
  const stk = (stack || '').toLowerCase()
  const file = (filename || '').toLowerCase()
  const errMsg = (error?.message || '').toLowerCase()
  const errStack = (error?.stack || '').toLowerCase()
  
  return (
    msg.includes('could not establish connection') ||
    msg.includes('receiving end does not exist') ||
    msg.includes('extension context invalidated') ||
    msg.includes('polyfill.js') ||
    msg.includes('wrappedsendmessagecallback') ||
    msg.includes('wrapped send message callback') ||
    file.includes('polyfill.js') ||
    file.includes('chrome-extension://') ||
    file.includes('moz-extension://') ||
    file.includes('ms-browser-extension://') ||
    file.includes('vm') || // Scripts injectés (VM1681, VM1682, etc.)
    file.includes('extension://') ||
    stk.includes('polyfill.js') ||
    stk.includes('chrome-extension://') ||
    stk.includes('moz-extension://') ||
    stk.includes('wrappedsendmessagecallback') ||
    stk.includes('vm') ||
    errMsg.includes('could not establish connection') ||
    errMsg.includes('receiving end does not exist') ||
    errStack.includes('polyfill.js') ||
    errStack.includes('vm')
  )
}

// Gestionnaire d'erreur global pour filtrer les erreurs d'extensions de navigateur
window.addEventListener('error', (event) => {
  const message = event.message || ''
  const filename = event.filename || ''
  const error = event.error
  
  if (isExtensionError(error, message, error?.stack, filename)) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    // Ne pas logger ces erreurs dans la console
    return false
  }
}, true) // Capture phase pour intercepter avant les autres handlers

// Gestionnaire pour les promesses rejetées non gérées
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason
  const errorMessage = error?.message || error?.toString() || ''
  const errorStack = error?.stack || ''
  
  // Vérifier si l'erreur vient d'une extension de navigateur
  const isExtError = isExtensionError(error, errorMessage, errorStack)
  
  // Vérifier si c'est une erreur réseau (serveur non démarré)
  const isNetworkError = 
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ERR_CONNECTION_REFUSED' ||
    errorMessage.toLowerCase().includes('err_connection_refused') ||
    errorMessage.toLowerCase().includes('err_network') ||
    errorMessage.toLowerCase().includes('network error') ||
    errorMessage.toLowerCase().includes('failed to fetch')
  
  // Vérifier si c'est une erreur 404 (ressource non trouvée)
  const is404Error = 
    error?.response?.status === 404 ||
    error?.status === 404 ||
    errorMessage.toLowerCase().includes('404') ||
    errorMessage.toLowerCase().includes('not found')
  
  if (isExtError || isNetworkError || is404Error) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    // Ne pas logger ces erreurs dans la console
    return false
  }
}, true) // Utiliser capture phase pour intercepter avant les autres handlers

// Supprimer les erreurs de la console si elles viennent d'extensions ou de connexions réseau refusées
const originalConsoleError = console.error
console.error = function(...args) {
  const message = args.join(' ').toLowerCase()
  const firstArg = args[0]
  
  // Vérifier le message d'erreur
  if (isExtensionError(firstArg, message, firstArg?.stack)) {
    // Ignorer silencieusement ces erreurs
    return
  }
  
  const isNetworkError = 
    message.includes('err_connection_refused') ||
    message.includes('err_network') ||
    message.includes('network error') ||
    (firstArg?.code === 'ERR_NETWORK') ||
    (firstArg?.code === 'ERR_CONNECTION_REFUSED')
  
  const is404Error = 
    message.includes('404') ||
    message.includes('not found') ||
    (firstArg?.response?.status === 404) ||
    (firstArg?.status === 404)
  
  if (isNetworkError || is404Error) {
    // Ignorer silencieusement ces erreurs
    return
  }
  // Appeler la fonction originale pour les autres erreurs
  originalConsoleError.apply(console, args)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
