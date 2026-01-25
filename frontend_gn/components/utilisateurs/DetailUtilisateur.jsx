import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Shield, Calendar, MapPin, 
  Edit, Trash2, Lock, Activity 
} from 'lucide-react';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';

const DetailUtilisateur = ({ utilisateurId, onModifier, onSupprimer, onFermer }) => {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [activites, setActivites] = useState([]);

  useEffect(() => {
    chargerUtilisateur();
    chargerActivites();
  }, [utilisateurId]);

  const chargerUtilisateur = async () => {
    try {
      const response = await fetch(`/api/utilisateurs/${utilisateurId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUtilisateur(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
    } finally {
      setChargement(false);
    }
  };

  const chargerActivites = async () => {
    try {
      const response = await fetch(`/api/utilisateurs/${utilisateurId}/activites`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivites(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
    }
  };

  const getStatutBadge = (statut) => {
    // Normaliser le statut (minuscules, sans espaces)
    const statutNormalise = (statut || 'actif').toString().toLowerCase().trim();
    const badges = {
      actif: 'bg-green-100 text-green-800',
      inactif: 'bg-red-100 text-red-800',
      suspendu: 'bg-gray-100 text-gray-800',
    };
    return badges[statutNormalise] || badges.actif;
  };

  if (chargement) {
    return <SpinnerChargement texte="Chargement..." />;
  }

  if (!utilisateur) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Utilisateur non trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {utilisateur.photo ? (
                <img
                  src={utilisateur.photo}
                  alt={utilisateur.nom}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={40} className="text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {utilisateur.nom} {utilisateur.prenom}
              </h2>
              <p className="text-gray-600">{utilisateur.matricule}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStatutBadge(utilisateur.statut)}`}>
                {utilisateur.statut || 'Actif'}
              </span>
            </div>
          </div>

          <div className="flex space-x-3 mt-4 md:mt-0">
            <Bouton
              variant="outline"
              icone={Edit}
              onClick={() => onModifier(utilisateur)}
            >
              Modifier
            </Bouton>
            <Bouton
              variant="danger"
              icone={Trash2}
              onClick={() => onSupprimer(utilisateur)}
            >
              Supprimer
            </Bouton>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Informations Personnelles
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="text-gray-400 mr-3" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{utilisateur.email}</p>
                </div>
              </div>

              {utilisateur.telephone && (
                <div className="flex items-center">
                  <Phone className="text-gray-400 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="font-medium">{utilisateur.telephone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <Shield className="text-gray-400 mr-3" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Rôle</p>
                  <p className="font-medium">{utilisateur.role || 'Aucun rôle'}</p>
                </div>
              </div>

              {utilisateur.adresse && (
                <div className="flex items-center">
                  <MapPin className="text-gray-400 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Adresse</p>
                    <p className="font-medium">{utilisateur.adresse}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <Calendar className="text-gray-400 mr-3" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Date de création</p>
                  <p className="font-medium">
                    {new Date(utilisateur.dateCreation).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activités récentes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Activity className="mr-2" size={20} />
                Activités Récentes
              </h3>
            </div>

            <div className="space-y-3">
              {activites.length > 0 ? (
                activites.map((activite, index) => (
                  <div key={index} className="flex items-start border-l-2 border-blue-500 pl-4 py-2">
                    <div>
                      <p className="font-medium text-gray-900">{activite.action}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(activite.date).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Aucune activité récente</p>
              )}
            </div>
          </div>
        </div>

        {/* Panneau latéral */}
        <div className="space-y-6">
          {/* Permissions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="mr-2" size={20} />
              Permissions
            </h3>
            
            <div className="space-y-2">
              {utilisateur.permissions && utilisateur.permissions.length > 0 ? (
                utilisateur.permissions.map((permission, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-gray-50 rounded-lg text-sm"
                  >
                    {permission}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Aucune permission spécifique</p>
              )}
            </div>
          </div>

          {/* Statistiques */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Statistiques
            </h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Connexions totales</p>
                <p className="text-2xl font-bold text-blue-600">
                  {utilisateur.statistiques?.connexions || 0}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Dernière connexion</p>
                <p className="font-medium">
                  {utilisateur.derniereConnexion 
                    ? new Date(utilisateur.derniereConnexion).toLocaleString('fr-FR')
                    : 'Jamais'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailUtilisateur;

