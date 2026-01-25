// src/utils/forceLogin.js

/**
 * Force la connexion avec le compte demo
 */
export function forceLogin() {
  console.log(" Force login with demo account...");

  try {
    // Créer les données du compte demo
    const demoUser = {
      id: 1,
      nom: 'Administrateur',
      prenom: 'Demo',
      email: 'admin@gendarmerie.mg',
      role: 'Administrateur',
      avatar: null,
      last_login: new Date().toISOString(),
      is_active: true,
    };

    // Créer un token mock
    const mockToken = `mock_token_${demoUser.id}_${Date.now()}`;

    // Sauvegarder les données d'authentification
    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('user_data', JSON.stringify(demoUser));
    localStorage.setItem('sgic_mock_users', JSON.stringify([demoUser]));

    console.log(" Demo account logged in successfully");
    return true;
  } catch (error) {
    console.error(" Error during force login:", error);
    return false;
  }
}

/**
 * Vérifier si l'utilisateur est connecté, sinon forcer la connexion demo
 */
export function ensureAuthenticated() {
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('user_data');
  
  if (!token || !userData) {
    console.log(" No authentication found, forcing demo login...");
    return forceLogin();
  }
  
  return true;
}

// Ajouter au window pour utilisation depuis la console
if (typeof window !== 'undefined') {
  window.forceLogin = forceLogin;
  window.ensureAuthenticated = ensureAuthenticated;
  console.log(" Force login functions available: window.forceLogin() and window.ensureAuthenticated()");
}

export default {
  forceLogin,
  ensureAuthenticated
}
