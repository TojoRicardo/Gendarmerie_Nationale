/**
 * Modal d'avertissement avant déconnexion pour inactivité
 * Affiche un compte à rebours et permet à l'utilisateur de rester connecté
 */

import React, { useState, useEffect } from 'react'
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react'
import Modal from '../../components/commun/Modal'

const InactivityWarningModal = ({ isOpen, onStayConnected, onLogout, remainingTime = 120 }) => {
  const [timeLeft, setTimeLeft] = useState(remainingTime)

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(remainingTime)
      return
    }

    // Décompte du temps restant
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, remainingTime, onLogout])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Modal isOpen={isOpen} onClose={onStayConnected} title="">
      <div className="text-center">
        {/* Icône d'avertissement animée */}
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-yellow-100 mb-4 animate-pulse">
          <AlertTriangle className="h-10 w-10 text-yellow-600" />
        </div>

        {/* Titre */}
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Inactivité détectée
        </h3>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          Vous allez être déconnecté(e) dans
        </p>

        {/* Compte à rebours */}
        <div className="mb-6">
          <div className="text-6xl font-bold text-yellow-600 mb-2">
            {formatTime(timeLeft)}
          </div>
          <p className="text-sm text-gray-500">
            en raison d'une inactivité prolongée
          </p>
        </div>

        {/* Message d'information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Pour votre sécurité</strong>, nous déconnectons automatiquement 
            les utilisateurs inactifs après 20 minutes.
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onStayConnected}
            className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
          >
            <RefreshCw size={20} />
            <span>Rester connecté(e)</span>
          </button>
          
          <button
            onClick={onLogout}
            className="flex-1 sm:flex-none px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all flex items-center justify-center space-x-2"
          >
            <LogOut size={20} />
            <span>Se déconnecter</span>
          </button>
        </div>

        {/* Note de sécurité */}
        <p className="text-xs text-gray-500 mt-4">
          Cette mesure de sécurité protège vos données en cas d'absence prolongée
        </p>
      </div>
    </Modal>
  )
}

export default InactivityWarningModal

