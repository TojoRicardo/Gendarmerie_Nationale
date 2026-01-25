import React from 'react'
import useRoleChangeListener from '../hooks/useRoleChangeListener'

/**
 * Composant qui écoute les changements de rôle/permissions en temps réel
 * et rafraîchit automatiquement les données de l'utilisateur connecté
 * 
 * Ce composant doit être placé dans l'arborescence React pour fonctionner,
 * idéalement dans App.jsx après AuthProvider
 */
const RoleChangeListener = () => {
  // Activer le listener avec vérification toutes les 30 secondes
  useRoleChangeListener({
    intervalMs: 30000, // 30 secondes
    enabled: true
  })

  // Ce composant ne rend rien visuellement
  return null
}

export default RoleChangeListener

