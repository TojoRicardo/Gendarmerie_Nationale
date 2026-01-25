/**
 * Utilitaires pour le formatage des numéros de téléphone
 * Format: +261 00 000 00 (Madagascar)
 */

/**
 * Formate un numéro de téléphone au format Madagascar
 * @param {string} value - Numéro à formater
 * @returns {string} - Numéro formaté +261 00 000 00
 */
export const formatPhoneNumber = (value) => {
  // Si vide ou seulement +261, retourner +261 avec espace
  if (!value || value.trim() === '' || value.trim() === '+261') {
    return '+261 ';
  }
  
  // Retirer tous les caractères non numériques sauf le +
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // Extraire les chiffres après le +
  let digits = cleaned.replace(/\+/g, '');
  
  // Si commence par 261, retirer le 261
  if (digits.startsWith('261')) {
    digits = digits.substring(3);
  }
  
  // Limiter à 7 chiffres maximum (2 + 3 + 2 = 7 chiffres après 261)
  digits = digits.slice(0, 7);
  
  // Formater selon la longueur: +261 00 000 00
  let formatted = '+261';
  
  if (digits.length > 0) {
    formatted += ' ' + digits.substring(0, 2); // +261 00
  }
  if (digits.length > 2) {
    formatted += ' ' + digits.substring(2, 5); // +261 00 000
  }
  if (digits.length > 5) {
    formatted += ' ' + digits.substring(5, 7); // +261 00 000 00
  }
  
  return formatted;
};

/**
 * Valide un numéro de téléphone Madagascar
 * @param {string} phone - Numéro à valider
 * @returns {boolean} - True si valide
 */
export const validatePhoneNumber = (phone) => {
  // Format attendu: +261 00 000 00 (7 chiffres après 261)
  const cleaned = phone.replace(/\s/g, '');
  const regex = /^\+261\d{7}$/;
  return regex.test(cleaned);
};

/**
 * Nettoie un numéro de téléphone (retire espaces et formatage)
 * @param {string} phone - Numéro à nettoyer
 * @returns {string} - Numéro nettoyé
 */
export const cleanPhoneNumber = (phone) => {
  return phone.replace(/\s/g, '');
};

/**
 * Exemple d'utilisation:
 * 
 * import { formatPhoneNumber, validatePhoneNumber } from '@/utils/phoneUtils'
 * 
 * const handlePhoneChange = (e) => {
 *   const formatted = formatPhoneNumber(e.target.value);
 *   setPhone(formatted);
 * };
 * 
 * const isValid = validatePhoneNumber('+261 00 000');
 */

