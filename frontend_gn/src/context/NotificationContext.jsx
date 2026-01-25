import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import ModalConfirmation from '../components/commun/ModalConfirmation';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification doit être utilisé dans NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    onConfirm: null,
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    showCancel: true
  });

  // Fonction utilitaire pour normaliser le paramètre passé
  const normalizeConfig = (config, defaultTitle) => {
    if (typeof config === 'string') {
      return { title: defaultTitle, message: config };
    }
    return {
      title: config.title || defaultTitle,
      message: config.message || '',
      confirmText: config.confirmText,
      cancelText: config.cancelText,
      showCancel: config.showCancel,
    };
  };

  /**  Confirmation */
  const showConfirm = useCallback((config) => {
    const { title, message, confirmText, cancelText, showCancel } = normalizeConfig(config, 'Confirmation');
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        confirmText: confirmText || 'Confirmer',
        cancelText: cancelText || 'Annuler',
        showCancel: showCancel !== false,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }, []);

  /**  Succès */
  const showSuccess = useCallback((config) => {
    const { title, message } = normalizeConfig(config, 'Succès');
    setModal({
      isOpen: true,
      title,
      message,
      type: 'success',
      confirmText: 'OK',
      showCancel: false,
      onConfirm: () => {}
    });
  }, []);

  /** Création (avec couleur #C0F6E3) */
  const showCreate = useCallback((config) => {
    const { title, message } = normalizeConfig(config, 'Ajout réussi');
    setModal({
      isOpen: true,
      title,
      message,
      type: 'create',
      confirmText: 'Super !',
      showCancel: false,
      onConfirm: () => {}
    });
  }, []);

  /**  Erreur */
  const showError = useCallback((config) => {
    const { title, message } = normalizeConfig(config, 'Erreur');
    setModal({
      isOpen: true,
      title,
      message,
      type: 'error',
      confirmText: 'OK',
      showCancel: false,
      onConfirm: () => {}
    });
  }, []);

  /**  Avertissement */
  const showWarning = useCallback((config) => {
    const { title, message, confirmText, cancelText, showCancel } = normalizeConfig(config, 'Attention');
    setModal({
      isOpen: true,
      title,
      message,
      type: 'warning',
      confirmText: confirmText || 'Continuer',
      cancelText: cancelText || 'Annuler',
      showCancel: showCancel !== false,
      onConfirm: () => {}
    });
  }, []);

  /**  Information */
  const showInfo = useCallback((config) => {
    const { title, message } = normalizeConfig(config, 'Information');
    setModal({
      isOpen: true,
      title,
      message,
      type: 'info',
      confirmText: 'OK',
      showCancel: false,
      onConfirm: () => {}
    });
  }, []);

  /**  Fermeture du modal */
  const closeModal = useCallback(() => {
    setModal((current) => {
      if (current.onCancel) current.onCancel();
      return { ...current, isOpen: false };
    });
  }, []);

  /**  Validation */
  const handleConfirm = useCallback(() => {
    setModal((current) => {
      if (current.onConfirm) current.onConfirm();
      return { ...current, isOpen: false };
    });
  }, []);

  // Mémoïser le value pour éviter les re-rendus inutiles
  const value = useMemo(() => ({
    showConfirm,
    showSuccess,
    showCreate,
    showError,
    showWarning,
    showInfo
  }), [showConfirm, showSuccess, showCreate, showError, showWarning, showInfo]);

  // Exposer le context globalement pour que showError dans notifications.js puisse l'utiliser
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__NOTIFICATION_CONTEXT__ = value;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__NOTIFICATION_CONTEXT__;
      }
    };
  }, [value]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ModalConfirmation
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        showCancel={modal.showCancel}
      />
    </NotificationContext.Provider>
  );
};
