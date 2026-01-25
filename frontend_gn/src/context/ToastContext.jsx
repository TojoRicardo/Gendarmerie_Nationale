import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ToastContainer } from '../../components/commun/NotificationToast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast doit être utilisé dans ToastProvider');
  }
  return context;
};

let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = ++toastIdCounter;
    const newToast = {
      id,
      type: toast.type || 'info',
      message: toast.message || '',
      titre: toast.titre || toast.title || '',
      duree: toast.duree || toast.duration || 5000,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Méthodes utilitaires
  const showSuccess = useCallback((message, titre = 'Succès') => {
    return addToast({ type: 'success', message, titre });
  }, [addToast]);

  const showError = useCallback((message, titre = 'Erreur') => {
    return addToast({ type: 'error', message, titre });
  }, [addToast]);

  const showWarning = useCallback((message, titre = 'Attention') => {
    return addToast({ type: 'warning', message, titre });
  }, [addToast]);

  const showInfo = useCallback((message, titre = 'Information') => {
    return addToast({ type: 'info', message, titre });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handler = (event) => {
      const message =
        event.detail?.message ||
        'Connexion au serveur indisponible. Les données affichées peuvent être périmées.'
      showWarning(message, 'Serveur indisponible')
    }
    window.addEventListener('api:offline', handler)
    return () => window.removeEventListener('api:offline', handler)
  }, [showWarning])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

