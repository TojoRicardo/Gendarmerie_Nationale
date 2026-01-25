/**
 * Utilitaires de formatage pour l'application
 */

/**
 * Formate une date en français
 * @param {string} dateString - La date à formater
 * @param {boolean} includeTime - Inclure l'heure ou non
 * @returns {string} La date formatée ou "Non renseignée"
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString || dateString === '' || dateString === 'null' || dateString === 'undefined') {
    return 'Non renseignée'
  }
  
  try {
    const date = new Date(dateString)
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      return 'Non renseignée'
    }
    
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    
    if (includeTime) {
      options.hour = '2-digit'
      options.minute = '2-digit'
    }
    
    return date.toLocaleDateString('fr-FR', options)
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error)
    return 'Non renseignée'
  }
}

/**
 * Formate une date avec l'heure en français
 * @param {string} dateString - La date à formater
 * @returns {string} La date formatée avec l'heure ou "Non renseignée"
 */
export const formatDateTime = (dateString) => {
  return formatDate(dateString, true)
}

/**
 * Retourne une valeur ou un placeholder si la valeur est vide
 * @param {any} value - La valeur à vérifier
 * @param {string} placeholder - Le placeholder par défaut
 * @returns {string} La valeur ou le placeholder
 */
export const getValueOrPlaceholder = (value, placeholder = 'Non renseigné') => {
  if (!value || value === '' || value === 'null' || value === 'undefined') {
    return placeholder
  }
  return value
}

/**
 * Formate un numéro de téléphone
 * @param {string} phone - Le numéro de téléphone
 * @returns {string} Le numéro formaté
 */
export const formatPhone = (phone) => {
  if (!phone) return 'Non renseigné'
  
  // Supprimer tous les caractères non numériques
  const cleaned = phone.replace(/\D/g, '')
  
  // Format: +261 XX XX XXX XX (Madagascar)
  if (cleaned.startsWith('261')) {
    const match = cleaned.match(/^(\d{3})(\d{2})(\d{2})(\d{3})(\d{2})$/)
    if (match) {
      return `+${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`
    }
  }
  
  // Format par défaut: groupes de 2 ou 3 chiffres
  const match = cleaned.match(/^(\d{3})(\d{2})(\d{2})(\d{3})(\d{2})$/)
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`
  }
  
  return phone
}

/**
 * Formate un CIN (Carte d'Identité Nationale)
 * @param {string} cin - Le CIN à formater
 * @returns {string} Le CIN formaté
 */
export const formatCIN = (cin) => {
  if (!cin) return 'Non renseigné'
  
  // Supprimer tous les espaces
  const cleaned = cin.replace(/\s/g, '')
  
  // Format: XXX XXX XXX XXX (groupes de 3)
  if (cleaned.length === 12) {
    return cleaned.match(/.{1,3}/g).join(' ')
  }
  
  return cin
}

/**
 * Formate un montant en Ariary (devise malgache)
 * @param {number} amount - Le montant
 * @returns {string} Le montant formaté
 */
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Non renseigné'
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('MGA', 'Ar')
}

/**
 * Tronque un texte à une longueur maximale
 * @param {string} text - Le texte à tronquer
 * @param {number} maxLength - La longueur maximale
 * @returns {string} Le texte tronqué
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Capitalise la première lettre d'une chaîne
 * @param {string} str - La chaîne à capitaliser
 * @returns {string} La chaîne capitalisée
 */
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Formate un nom complet
 * @param {string} nom - Le nom
 * @param {string} prenom - Le prénom
 * @returns {string} Le nom complet formaté
 */
export const formatFullName = (nom, prenom) => {
  if (!nom && !prenom) return 'Non renseigné'
  if (!nom) return prenom
  if (!prenom) return nom
  return `${nom.toUpperCase()} ${capitalize(prenom)}`
}

/**
 * Calcule l'âge à partir d'une date de naissance
 * @param {string} dateOfBirth - La date de naissance
 * @returns {number|string} L'âge ou "Non renseigné"
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 'Non renseigné'
  
  try {
    const birthDate = new Date(dateOfBirth)
    if (isNaN(birthDate.getTime())) return 'Non renseigné'
    
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  } catch (error) {
    return 'Non renseigné'
  }
}

/**
 * Formate une durée en texte lisible
 * @param {number} minutes - La durée en minutes
 * @returns {string} La durée formatée
 */
export const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return 'Non renseigné'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) return `${mins} minute${mins > 1 ? 's' : ''}`
  if (mins === 0) return `${hours} heure${hours > 1 ? 's' : ''}`
  
  return `${hours}h${mins.toString().padStart(2, '0')}`
}

/**
 * Détermine la couleur du badge en fonction du statut
 * @param {string} statut - Le statut
 * @returns {object} Les classes CSS pour le badge
 */
export const getStatutBadgeClasses = (statut) => {
  const badges = {
    'en_cours': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En cours' },
    'cloture': { bg: 'bg-green-100', text: 'text-green-800', label: 'Clôturé' },
    'en_attente': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En attente' },
    'archive': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Archivé' },
  }
  return badges[statut] || badges['en_cours']
}

/**
 * Détermine la couleur du badge en fonction du niveau de danger
 * @param {string} niveau - Le niveau de danger
 * @returns {object} Les classes CSS pour le badge
 */
export const getDangerBadgeClasses = (niveau) => {
  const badges = {
    'faible': { bg: 'bg-green-100', text: 'text-green-800', label: 'Faible' },
    'moyen': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Moyen' },
    'eleve': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Élevé' },
    'critique': { bg: 'bg-red-100', text: 'text-red-800', label: 'Critique' },
  }
  return badges[niveau] || badges['moyen']
}

