import React, { useEffect, useState } from 'react';
import { User, Menu, LogOut, Shield, Bell, X, Check, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../src/context/AuthContext';
import { MESSAGES } from '../../src/utils/notifications';
import { useNotification } from '../../src/context/NotificationContext';
import { jwtDecode } from "jwt-decode";
import { getAuthToken } from '../../src/utils/storage';
import { getUserById, updateUser } from '../../src/services/authService';
import notificationService from '../../src/services/notificationService';

const Entete = ({ onToggleSidebar, onToggleCollapsed }) => {
  const token = getAuthToken();
  const navigate = useNavigate();
  const { utilisateur, deconnexion } = useAuth();
  const notification = useNotification();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchUserAuth = async () => {
      // Ne pas essayer de récupérer l'utilisateur si on n'est pas connecté
      if (!utilisateur && !token) {
        return;
      }

      // Vérifier que le token existe et est valide
      if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
        // Seulement logger si on a un utilisateur connecté mais un token invalide
        // (cela indique un problème d'authentification)
        if (utilisateur && token && (typeof token !== 'string' || token.split('.').length !== 3)) {
          console.warn("Token invalide pour un utilisateur connecté !");
        }
        return;
      }

      try {
        const decoded = jwtDecode(token);
        const userId = decoded.user_id;

        if (!userId) {
          console.warn("user_id introuvable dans le token");
          return;
        }

        // Récupérer l'utilisateur via le service
        const userData = await getUserById(userId);
        setUser(userData);
      } catch (error) {
        // Ne pas logger les erreurs réseau (serveur non disponible)
        // getUserById gère déjà le fallback vers le cache
        if (error?.response) {
          console.error("Erreur lors de la récupération de l'utilisateur :", error);
          // Si le token est invalide, on peut rediriger vers la page de connexion
          if (error.message?.includes('Invalid token') || error.response?.status === 401) {
            localStorage.clear();
            navigate('/connexion');
          }
        }
        // Si erreur réseau, getUserById retourne déjà les données en cache, donc pas besoin de logger
      }
    };

    fetchUserAuth();
  }, [token, navigate])

  useEffect(() => {
    if (utilisateur && !user) {
      setUser(utilisateur);
    }
  }, [utilisateur, user])

  // Charger les notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      
      try {
        const data = await notificationService.getNotifications({ lue: 'false' });
        // Limiter aux 5 dernières notifications non lues
        // Gérer le cas où data est un objet avec results ou un tableau direct
        const notificationsArray = Array.isArray(data) ? data : (data.results || []);
        setNotifications(notificationsArray.slice(0, 5));
      } catch (error) {
        // Ignorer silencieusement les erreurs réseau si le serveur n'est pas disponible
        if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || !error.response) {
          // Ne pas logger ces erreurs, c'est normal si le serveur n'est pas démarré
          setNotifications([]);
          return;
        }
        // Logger uniquement les autres erreurs
        if (error.response?.status !== 401 && error.response?.status !== 404) {
          console.error('Erreur lors du chargement des notifications:', error);
        }
        setNotifications([]);
      }
    };

    fetchNotifications();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [token])



  const handleDeconnexion = async () => {
    try {
      if (user?.id) {
        // Mettre à jour le statut de l'utilisateur à "inactif" via le service
        await updateUser(user.id, { statut: "inactif" });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut :", error);
    }

    // Nettoyer le localStorage et rediriger
    localStorage.clear();
    setUser(null);
    navigate('/connexion');
  };


  const marquerCommeLu = async (id) => {
    const notif = notifications.find(n => n.id === id);

    try {
      // Marquer comme lu via l'API
      await notificationService.markAsRead(id);
      
      // Mettre à jour l'état local
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, lue: true } : n
      ));

      // Fermer le dropdown
      setShowNotifications(false);

      // Naviguer vers la page correspondante avec les données de la notification
      if (notif?.lien) {
        navigate(notif.lien, {
          state: {
            fromNotification: true,
            notificationId: notif.id,
            message: notif.message
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
    }
  };

  const marquerToutCommeLu = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(notif => ({ ...notif, lue: true })));
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
  };

  const supprimerNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(notifications.filter(notif => notif.id !== id));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const voirToutesLesNotifications = () => {
    setShowNotifications(false);
    navigate('/notifications');
  };

  const notificationsNonLues = notifications.filter(n => !n.lue).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <Check className="text-gendarme-green" size={18} />;
      case 'warning': return <AlertCircle className="text-gendarme-gold" size={18} />;
      case 'info': return <Info className="text-gendarme-blue" size={18} />;
      default: return <Bell className="text-gendarme-dark" size={18} />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // en secondes

    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Couleur du badge selon le rôle
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Administrateur':
        return 'bg-gendarme-gold';
      case 'Enquêteur Principal':
        return 'bg-gendarme-blue';
      case 'Analyste Judiciaire':
        return 'bg-gendarme-light';
      case 'Observateur Externe':
        return 'bg-gendarme-green';
      default:
        return 'bg-gendarme-dark';
    }
  };

  return (
    <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b border-slate-600 shadow-lg z-30 relative text-white">
      <div className="flex items-center justify-between px-4 lg:px-8 py-3.5">
        {/* Left Section */}
        <div className="flex items-center space-x-4 lg:space-x-6">
          {/* Bouton mobile - ouvre/ferme sidebar */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 hover:scale-105"
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>

          {/* Bouton desktop - collapse/expand sidebar */}
          <button
            onClick={onToggleCollapsed}
            className="hidden lg:block p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 hover:scale-105"
            aria-label="Réduire/Agrandir menu"
            title="Réduire/Agrandir menu"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center space-x-3">
            {/* Drapeau malgache */}
            <div className="w-20 h-12 flex items-center justify-center overflow-hidden rounded-sm shadow-md border border-white/10">
              <img 
                src="/drapeau Malagasy.svg" 
                alt="Drapeau malgache"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-xl font-bold text-white leading-tight">Gendarmerie Nationale Malagasy</h1>
              <p className="text-sm font-bold text-yellow-400 leading-tight">Système de Gestion Criminelle</p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Notifications avec Dropdown */}
          <div className="relative">
            <button
              className="relative p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 hover:scale-105"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
            >
              <Bell size={20} />
              {notificationsNonLues > 0 && (
                <span className="absolute -top-1 -right-1 bg-gendarme-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse-subtle shadow-lg">
                  {notificationsNonLues}
                </span>
              )}
            </button>

            {/* Dropdown Notifications */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-96 glass-effect rounded-2xl shadow-pro-2xl z-50 border border-gray-200 overflow-hidden animate-slideInUp">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-gendarme-blue via-gendarme-blue-light to-gendarme-light text-white border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base">Notifications</h3>
                      <p className="text-xs text-white/80 mt-0.5">
                        {notificationsNonLues} non lue{notificationsNonLues > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {notificationsNonLues > 0 && (
                        <button
                          onClick={marquerToutCommeLu}
                          className="p-1.5 hover:bg-white/20 rounded-lg transition-all text-xs font-medium"
                          title="Tout marquer comme lu"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Liste des notifications */}
                <div className="max-h-96 overflow-y-auto bg-white">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Aucune notification</p>
                      <p className="text-xs text-gray-400 mt-1">Vous êtes à jour !</p>
                    </div>
                  ) : (
                    <>
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`group p-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-gendarme-gray hover:to-gendarme-gray-light transition-all cursor-pointer relative ${!notif.lue ? 'bg-gendarme-light/10' : ''
                            }`}
                          onClick={() => marquerCommeLu(notif.id)}
                          title="Cliquer pour voir les détails"
                        >
                          <div className="flex items-start space-x-3">
                            {/* Icône */}
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notif.type)}
                            </div>

                            {/* Contenu */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2">
                                  <h4 className={`text-sm font-bold text-gendarme-dark group-hover:text-gendarme-blue transition-colors ${!notif.lue ? 'font-black' : ''}`}>
                                    {notif.titre}
                                  </h4>
                                  {!notif.lue && (
                                    <span className="flex-shrink-0 w-2 h-2 bg-gendarme-blue rounded-full animate-pulse-subtle"></span>
                                  )}
                                </div>
                                <ChevronRight size={16} className="flex-shrink-0 text-gray-400 group-hover:text-gendarme-blue group-hover:translate-x-1 transition-all" />
                              </div>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-400 font-medium flex items-center">
                                  {formatDate(notif.date_creation)}
                                  {notif.lien && (
                                    <span className="ml-2 px-2 py-0.5 bg-gendarme-blue/10 text-gendarme-blue rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                      Voir →
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    supprimerNotification(notif.id);
                                  }}
                                  className="p-1 hover:bg-gendarme-red/10 rounded transition-all text-gray-400 hover:text-gendarme-red z-10"
                                  title="Supprimer"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="p-3 bg-gray-50 border-t border-gray-200">
                        <button
                          onClick={voirToutesLesNotifications}
                          className="w-full text-center text-sm font-bold text-gendarme-blue hover:text-gendarme-blue-dark transition-colors"
                        >
                          Voir toutes les notifications →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3 border-l border-gray-600/50 pl-3 lg:pl-4 ml-2">
            <div className="hidden lg:block text-right">
              <p className="text-sm font-semibold">
                {user?.nom} {user?.prenom}
              </p>
              <div className="flex items-center justify-end mt-0.5">
                <span className={`inline-block w-2 h-2 rounded-full ${getRoleBadgeColor(user?.role)} mr-2 animate-pulse-subtle`}></span>
                <p className="text-xs text-gray-300 font-medium">{user?.role}</p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="p-2.5 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg border border-gray-600/50 hover:scale-105"
                title="Mon profil"
              >
                <User size={20} />
              </button>

              {/* Dropdown Menu Premium */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-72 glass-effect rounded-2xl shadow-pro-2xl z-50 border border-gray-200 overflow-hidden animate-slideInUp">
                  {/* Header avec gradient */}
                  <div className="p-5 bg-gradient-to-br from-gendarme-blue via-gendarme-blue-light to-gendarme-light text-white">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border-2 border-white/30">
                          <User className="text-white" size={28} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-base truncate">
                          {user?.nom} {user?.prenom}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className="w-2 h-2 bg-gendarme-gold rounded-full mr-2 animate-pulse-subtle"></span>
                          <p className="text-xs text-white/90 font-medium">{user?.role}</p>
                        </div>
                        <p className="text-xs text-white/70 mt-1">{user?.email || 'admin@gendarmerie.dz'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="bg-white">
                    {/* {user?.role === "Administrateur" && (
                      <> */}
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/profil');
                      }}
                      className="w-full text-left px-5 py-3.5 hover:bg-gradient-to-r hover:from-gendarme-gray hover:to-gendarme-gray-light transition-all text-gray-700 font-medium flex items-center justify-between group border-b border-gray-100"
                    >
                      <div className="flex items-center">
                        <div className="p-2 bg-gendarme-blue/10 rounded-lg mr-3 group-hover:bg-gendarme-blue transition-all">
                          <User size={16} className="text-gendarme-blue group-hover:text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gendarme-dark group-hover:text-gendarme-blue">Mon Profil</p>
                          <p className="text-xs text-gray-500">Gérer vos informations</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-gendarme-blue group-hover:translate-x-1 transition-all" />
                    </button>
                    {/* </>
                    )} */}

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/dashboard');
                      }}
                      className="w-full text-left px-5 py-3.5 hover:bg-gradient-to-r hover:from-gendarme-gray hover:to-gendarme-gray-light transition-all text-gray-700 font-medium flex items-center justify-between group border-b border-gray-100"
                    >
                      <div className="flex items-center">
                        <div className="p-2 bg-gendarme-gold/10 rounded-lg mr-3 group-hover:bg-gendarme-gold transition-all">
                          <Shield size={16} className="text-gendarme-gold-dark group-hover:text-gendarme-dark" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gendarme-dark group-hover:text-gendarme-gold-dark">Tableau de bord</p>
                          <p className="text-xs text-gray-500">Retour à l'accueil</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-gendarme-gold-dark group-hover:translate-x-1 transition-all" />
                    </button>

                    {/* Séparateur */}
                    <div className="px-5 py-2 bg-gray-50">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Session</p>
                    </div>

                    {/* Bouton  Premium */}
                    <button
                      onClick={async () => {
                        const confirmed = await notification.showConfirm(MESSAGES.CONFIRM_LOGOUT);
                        if (confirmed) {
                          setShowProfileMenu(false);
                          handleDeconnexion();
                        }
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-gradient-to-r hover:from-gendarme-red/10 hover:to-gendarme-red/5 transition-all font-medium flex items-center justify-between group"
                    >
                      <div className="flex items-center">
                        <div className="p-2 bg-gendarme-red/10 rounded-lg mr-3 group-hover:bg-gendarme-red transition-all group-hover:scale-110">
                          <LogOut size={16} className="text-gendarme-red group-hover:text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gendarme-red group-hover:text-gendarme-red-dark">Déconnexion</p>
                          <p className="text-xs text-gray-500">Quitter votre session</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gendarme-red/50 group-hover:text-gendarme-red group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Entete;
