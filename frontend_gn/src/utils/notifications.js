/**
 * Système de notifications professionnel
 * Remplace les alert() et confirm() par défaut
 */

/**
 * Messages professionnels pour l'application
 */
export const MESSAGES = {
  // Déconnexion
  CONFIRM_LOGOUT: {
    title: 'Déconnexion',
    message: 'Vous êtes sur le point de quitter votre session.\nToutes les données non sauvegardées seront perdues.\n\nSouhaitez-vous continuer ?'
  },

  // Suppression
  CONFIRM_DELETE_USER: {
    title: ' Suppression d\'utilisateur',
    message: 'Cette action est irréversible. L\'utilisateur et toutes ses données associées seront définitivement supprimés du système.\n\nConfirmer la suppression ?'
  },
  CONFIRM_DELETE_ROLE: {
    title: ' Suppression de rôle',
    message: 'Attention : La suppression de ce rôle affectera tous les utilisateurs qui y sont associés.\n\nÊtes-vous certain de vouloir continuer ?'
  },
  CONFIRM_DELETE_FICHE: {
    title: ' Archivage de fiche criminelle',
    message: 'Cette fiche criminelle sera archivée et masquée de la liste principale.\n\nLes données resteront disponibles dans les archives.\n\nConfirmer cette action ?'
  },

  // Réinitialisation
  CONFIRM_RESET_PASSWORD: {
    title: ' Réinitialisation du mot de passe',
    message: 'Un email avec un lien de réinitialisation sera envoyé à l\'utilisateur. L\'ancien mot de passe sera invalide dès l\'ouverture du lien.\n\nProcéder à l\'envoi ?'
  },

  // Succès - Utilisateurs
  SUCCESS_USER_CREATED: {
    title: 'Utilisateur ajouté',
    message: 'Le nouvel utilisateur a été enregistré avec succès dans le système.\n\nUn email de bienvenue lui a été envoyé avec ses identifiants de connexion.\n\nLe compte est maintenant actif et prêt à être utilisé.'
  },
  SUCCESS_USER_UPDATED: {
    title: ' Utilisateur modifié',
    message: 'Les modifications ont été enregistrées avec succès. L\'utilisateur sera notifié des changements apportés à son compte.'
  },
  SUCCESS_USER_DELETED: {
    title: ' Utilisateur supprimé',
    message: 'L\'utilisateur a été définitivement supprimé du système. Toutes ses données ont été archivées conformément aux protocoles de sécurité.'
  },

  SUCCESS_ROLE_CREATED: {
    title: 'Rôle ajouté',
    message: 'Le nouveau rôle et ses permissions ont été enregistrés avec succès.\n\nLes permissions ont été configurées et sont actives.\n\nCe rôle est maintenant disponible pour l\'attribution aux utilisateurs.'
  },
  SUCCESS_ROLE_UPDATED: {
    title: ' Rôle modifié',
    message: 'Les modifications du rôle ont été enregistrées. Les utilisateurs associés verront leurs permissions mises à jour automatiquement.'
  },
  SUCCESS_ROLE_DELETED: {
    title: ' Rôle supprimé',
    message: 'Le rôle a été supprimé du système. Les utilisateurs qui y étaient associés ont été réassignés au rôle par défaut.'
  },

  SUCCESS_FICHE_CREATED: {
    title: 'Fiche criminelle créée',
    message: 'La nouvelle fiche criminelle a été enregistrée avec succès dans le système.\n\nLa fiche est maintenant accessible et indexée pour les recherches.\n\nToutes les données ont été sécurisées et tracées.'
  },
  SUCCESS_FICHE_UPDATED: {
    title: ' Fiche criminelle modifiée',
    message: 'Les modifications de la fiche ont été sauvegardées. L\'historique des changements a été mis à jour pour traçabilité.'
  },
  SUCCESS_FICHE_DELETED: {
    title: 'Fiche archivée',
    message: 'La fiche criminelle a été archivée avec succès. Elle est maintenant masquée de la liste principale mais reste disponible dans les archives.'
  },

  SUCCESS_REPORT_GENERATED: {
    title: ' Rapport généré',
    message: 'Votre rapport a été généré avec succès et est prêt à être consulté ou exporté.'
  },
  SUCCESS_PASSWORD_RESET: {
    title: ' Email envoyé',
    message: 'Un email de réinitialisation a été envoyé avec succès. L\'utilisateur recevra les instructions dans quelques instants.'
  },

  // Erreurs
  ERROR_PASSWORD_MISMATCH: {
    title: ' Mots de passe différents',
    message: 'Les mots de passe saisis ne correspondent pas. Veuillez vérifier votre saisie et réessayer.'
  },
  ERROR_REPORT_GENERATION: {
    title: ' Erreur de génération',
    message: 'Une erreur est survenue lors de la génération du rapport. Veuillez vérifier vos paramètres et réessayer.'
  },
  ERROR_REPORT_PREVIEW: {
    title: ' Erreur d\'aperçu',
    message: 'Impossible de générer l\'aperçu du rapport. Vérifiez que tous les champs requis sont remplis.'
  }
};

/**
 * IMPORTANT: Ces fonctions utilisent les modals/alerts natifs du navigateur.
 * Pour une meilleure expérience utilisateur, utilisez le hook useNotification() dans vos composants React.
 * 
 * Exemple avec useNotification (RECOMMANDÉ):
 * 
 * import { useNotification } from '@/context/NotificationContext'
 * import { MESSAGES } from '@/utils/notifications'
 * 
 * const MonComposant = () => {
 *   const notification = useNotification();
 * 
 *   const handleDelete = async () => {
 *     const confirmed = await notification.showConfirm(MESSAGES.CONFIRM_DELETE_USER);
 *     if (confirmed) {
 *       // Supprimer
 *       notification.showSuccess(MESSAGES.SUCCESS_USER_DELETED);
 *     }
 *   };
 * 
 *   return <button onClick={handleDelete}>Supprimer</button>
 * }
 */


/**
 * Affiche une notification d'erreur avec modal personnalisée
 * Utilise le NotificationContext si disponible, sinon fallback sur alert
 * @param {Object|string} message - Message à afficher {title, message} ou string simple
 */
export const showError = (message) => {
  // Essayer d'utiliser le NotificationContext si disponible
  if (typeof window !== 'undefined' && window.__NOTIFICATION_CONTEXT__) {
    const notification = window.__NOTIFICATION_CONTEXT__;
    if (typeof message === 'string') {
      notification.showError({ 
        title: 'Erreur',
        message: message 
      });
    } else {
      notification.showError({
        title: message.title || 'Erreur',
        message: message.message || message
      });
    }
    return;
  }
  
  // Fallback sur alert natif si le context n'est pas disponible
  if (!message) {
    alert('Erreur\n\nUne erreur est survenue.');
    return;
  }
  
  if (typeof message === 'string') {
    alert(`Erreur\n\n${message}`);
  } else {
    const { title = 'Erreur', message: text = 'Une erreur est survenue.' } = message || {};
    alert(`${title}\n\n${text}`);
  }
};


