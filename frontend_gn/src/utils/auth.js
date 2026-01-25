/**
 * Utilitaires d'authentification
 * Gestion du token et des informations utilisateur
 */

/**
 * Récupère le token d'authentification du localStorage
 * @returns {string|null} Le token ou null s'il n'existe pas
 */
export const getAuthToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('authToken');
};

/**
 * Sauvegarde le token d'authentification dans le localStorage
 * @param {string} token - Le token à sauvegarder
 */
export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
  localStorage.setItem('authToken', token);
};

/**
 * Supprime le token d'authentification du localStorage
 */
export const removeAuthToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
};

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns {boolean} True si un token existe
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};

/**
 * Récupère les informations de l'utilisateur du localStorage
 * @returns {object|null} Les infos utilisateur ou null
 */
export const getUserInfo = () => {
  const userInfo = localStorage.getItem('user');
  return userInfo ? JSON.parse(userInfo) : null;
};

/**
 * Sauvegarde les informations de l'utilisateur dans le localStorage
 * @param {object} user - Les informations utilisateur
 */
export const setUserInfo = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

/**
 * Supprime les informations de l'utilisateur du localStorage
 */
export const removeUserInfo = () => {
  localStorage.removeItem('user');
};

/**
 * Déconnexion complète - supprime token et infos utilisateur
 */
export const logout = () => {
  removeAuthToken();
  removeUserInfo();
};

