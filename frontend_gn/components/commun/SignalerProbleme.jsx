import React, { useState } from 'react'
import { AlertTriangle, X, Send, CheckCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../../src/context/AuthContext'

const SignalerProbleme = ({ isOpen, onClose }) => {
  const { utilisateur } = useAuth()
  const [formData, setFormData] = useState({
    type: 'bug',
    description: '',
    page: window.location.pathname,
    priorite: 'normale'
  })
  const [envoye, setEnvoye] = useState(false)
  const [enCours, setEnCours] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnCours(true)

    try {
      // Simuler l'envoi (à remplacer par un vrai appel API)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // En production, envoyer à l'API
      // await api.post('/support/signaler-probleme', {
      //   ...formData,
      //   utilisateur: utilisateur?.nom,
      //   email: utilisateur?.email,
      //   role: utilisateur?.role
      // })

      console.log('Problème signalé:', {
        ...formData,
        utilisateur: utilisateur?.nom,
        email: utilisateur?.email,
        role: utilisateur?.role,
        timestamp: new Date().toISOString()
      })

      setEnvoye(true)
      
      // Fermer automatiquement après 2 secondes
      setTimeout(() => {
        onClose()
        setEnvoye(false)
        setFormData({ type: 'bug', description: '', page: window.location.pathname, priorite: 'normale' })
      }, 2000)
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error)
    } finally {
      setEnCours(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <AlertTriangle className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Signaler un Problème</h2>
                <p className="text-orange-100 text-sm">Aide-nous à améliorer l'application</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all text-white"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {envoye ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Problème Signalé !</h3>
              <p className="text-gray-600">
                Merci pour votre retour. Notre équipe technique va examiner le problème.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type de problème */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Type de problème
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  required
                >
                  <option value="bug"> Bug / Erreur technique</option>
                  <option value="performance"> Problème de performance</option>
                  <option value="affichage"> Problème d'affichage</option>
                  <option value="donnees"> Erreur de données</option>
                  <option value="autre"> Autre</option>
                </select>
              </div>

              {/* Page concernée */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Page concernée
                </label>
                <input
                  type="text"
                  value={formData.page}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl text-gray-600"
                />
              </div>

              {/* Priorité */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  name="priorite"
                  value={formData.priorite}
                  onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                >
                  <option value="basse">Basse - Peut attendre</option>
                  <option value="normale">Normale - À traiter prochainement</option>
                  <option value="haute">Haute - Bloquant</option>
                  <option value="critique">Critique - Urgence</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Description du problème *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez le problème rencontré en détail..."
                  rows="6"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all resize-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Soyez le plus précis possible pour nous aider à résoudre rapidement le problème
                </p>
              </div>

              {/* Info utilisateur */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-600">
                  <strong>Informations automatiques :</strong> {utilisateur?.nom || 'Utilisateur'} ({utilisateur?.role || 'Rôle inconnu'})
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enCours || !formData.description.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
                >
                  {enCours ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" size={20} />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      <span>Envoyer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default SignalerProbleme

