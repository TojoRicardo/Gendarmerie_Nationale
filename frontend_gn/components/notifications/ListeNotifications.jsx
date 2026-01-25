import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Trash2, Filter } from 'lucide-react';
import ElementNotification from './ElementNotification';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';
import notificationService from '../../src/services/notificationService';
import { useToast } from '../../src/context/ToastContext';
import { useNotification } from '../../src/context/NotificationContext';

const ListeNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState('toutes'); // toutes, non_lues, lues
  const toast = useToast();
  const { showConfirm } = useNotification();

  const chargerNotifications = useCallback(async () => {
    setChargement(true);
    try {
      const params = {};
      if (filtre !== 'toutes') {
        params.lue = filtre === 'lues' ? 'true' : 'false';
      }

      const data = await notificationService.getNotifications(params);
      // S'assurer que data est un tableau
      if (Array.isArray(data)) {
        setNotifications(data);
      } else if (data && Array.isArray(data.results)) {
        setNotifications(data.results);
      } else if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      } else {
        console.warn('Format de données inattendu:', data);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      toast.showError('Impossible de charger les notifications');
      setNotifications([]);
    } finally {
      setChargement(false);
    }
  }, [filtre, toast]);

  useEffect(() => {
    chargerNotifications();
  }, [chargerNotifications]);

  const marquerCommeLue = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, lue: true } : notif
        )
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.showError('Erreur lors du marquage de la notification');
    }
  };

  const marquerToutesCommeLues = async () => {
    try {
      const result = await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, lue: true }))
      );
      toast.showSuccess(result.message || 'Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.showError('Erreur lors du marquage des notifications');
    }
  };

  const supprimerNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      toast.showSuccess('Notification supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.showError('Erreur lors de la suppression de la notification');
    }
  };

  const supprimerToutesLues = async () => {
    const confirmed = await showConfirm({
      title: 'Confirmation',
      message: 'Voulez-vous vraiment supprimer toutes les notifications lues ?'
    });

    if (!confirmed) return;

    try {
      const result = await notificationService.deleteReadNotifications();
      setNotifications(prev => prev.filter(notif => !notif.lue));
      toast.showSuccess(result.message || 'Notifications lues supprimées');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.showError('Erreur lors de la suppression des notifications');
    }
  };

  const notificationsNonLues = Array.isArray(notifications) ? notifications.filter(n => !n.lue).length : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête Premium */}
      <div className="card-pro overflow-hidden">
        <div className="bg-gradient-to-r from-gendarme-blue via-gendarme-blue-light to-gendarme-light p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                <Bell size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Notifications</h2>
                <p className="text-white/80 text-sm font-medium">
                  {notificationsNonLues} notification(s) non lue(s)
                </p>
              </div>
            </div>

            <div className="flex space-x-2">
              {notificationsNonLues > 0 && (
                <button
                  onClick={marquerToutesCommeLues}
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-95 flex items-center space-x-1.5 text-sm"
                >
                  <CheckCheck size={16} />
                  <span>Tout marquer comme lu</span>
                </button>
              )}
              <button
                onClick={supprimerToutesLues}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-95 flex items-center space-x-1.5 text-sm"
              >
                <Trash2 size={16} />
                <span>Supprimer les lues</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres Premium */}
      <div className="card-pro p-4">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Filter size={18} className="text-blue-600" />
          </div>
          <span className="text-xs font-bold text-gray-700">Afficher:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setFiltre('toutes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95 ${
                filtre === 'toutes'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes ({notifications.length})
            </button>
            <button
              onClick={() => setFiltre('non_lues')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95 ${
                filtre === 'non_lues'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Non lues ({notificationsNonLues})
            </button>
            <button
              onClick={() => setFiltre('lues')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95 ${
                filtre === 'lues'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Lues ({notifications.length - notificationsNonLues})
            </button>
          </div>
        </div>
      </div>

      {/* Liste des notifications */}
      {chargement ? (
        <SpinnerChargement texte="Chargement des notifications..." />
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <ElementNotification
              key={notification.id}
              notification={notification}
              onMarquerLue={marquerCommeLue}
              onSupprimer={supprimerNotification}
              onClick={(notif) => {
                if (!notif.lue) {
                  marquerCommeLue(notif.id);
                }
                // Rediriger vers la ressource liée si disponible
                if (notif.lien) {
                  window.location.href = notif.lien;
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="card-pro p-10 text-center">
          <div className="inline-flex p-5 bg-gray-100 rounded-full mb-5">
            <Bell className="text-gray-400" size={48} />
          </div>
          <p className="text-gray-500 text-lg font-bold mb-2">Aucune notification</p>
          <p className="text-gray-400 text-xs">
            Vous êtes à jour !
          </p>
        </div>
      )}
    </div>
  );
};

export default ListeNotifications;

