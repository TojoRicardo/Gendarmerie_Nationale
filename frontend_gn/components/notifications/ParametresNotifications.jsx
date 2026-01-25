import React, { useState, useEffect } from 'react';
import { Settings, Bell, Mail, MessageSquare } from 'lucide-react';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';

const ParametresNotifications = () => {
  const [parametres, setParametres] = useState({
    email: {
      nouvelleFiche: true,
      modificationFiche: false,
      nouvelUtilisateur: true,
      alerteSysteme: true,
    },
    navigateur: {
      nouvelleFiche: true,
      modificationFiche: true,
      nouvelUtilisateur: false,
      alerteSysteme: true,
    },
    sms: {
      nouvelleFiche: false,
      modificationFiche: false,
      nouvelUtilisateur: false,
      alerteSysteme: true,
    },
    frequence: 'temps_reel', // temps_reel, quotidien, hebdomadaire
    horaireResume: '09:00',
  });

  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);

  useEffect(() => {
    chargerParametres();
  }, []);

  const chargerParametres = async () => {
    try {
      const response = await fetch('/api/notifications/parametres', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setParametres(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    } finally {
      setChargement(false);
    }
  };

  const handleCheckboxChange = (canal, type) => {
    setParametres(prev => ({
      ...prev,
      [canal]: {
        ...prev[canal],
        [type]: !prev[canal][type],
      },
    }));
  };

  const handleSauvegarder = async () => {
    setSauvegarde(true);

    try {
      const response = await fetch('/api/notifications/parametres', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(parametres),
      });

      if (response.ok) {
        alert('Paramètres sauvegardés avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSauvegarde(false);
    }
  };

  const typesNotifications = [
    { id: 'nouvelleFiche', label: 'Nouvelle fiche criminelle' },
    { id: 'modificationFiche', label: 'Modification de fiche' },
    { id: 'nouvelUtilisateur', label: 'Nouvel utilisateur' },
    { id: 'alerteSysteme', label: 'Alertes système' },
  ];

  if (chargement) {
    return <SpinnerChargement texte="Chargement des paramètres..." />;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Settings className="mr-2" size={24} />
          Paramètres des Notifications
        </h2>
        <p className="text-gray-600 mt-1 text-sm">
          Configurez vos préférences de notifications
        </p>
      </div>

      {/* Canaux de notification */}
      <div className="bg-white rounded-lg shadow-md p-5">
        <h3 className="text-base font-bold text-gray-900 mb-5">
          Canaux de notification
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-700">
                  Type de notification
                </th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-gray-700">
                  <div className="flex flex-col items-center">
                    <Mail size={18} className="text-blue-600 mb-1" />
                    <span>Email</span>
                  </div>
                </th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-gray-700">
                  <div className="flex flex-col items-center">
                    <Bell size={18} className="text-green-600 mb-1" />
                    <span>Navigateur</span>
                  </div>
                </th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-gray-700">
                  <div className="flex flex-col items-center">
                    <MessageSquare size={18} className="text-purple-600 mb-1" />
                    <span>SMS</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {typesNotifications.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="py-3 px-3 text-xs text-gray-900">
                    {type.label}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={parametres.email[type.id]}
                      onChange={() => handleCheckboxChange('email', type.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={parametres.navigateur[type.id]}
                      onChange={() => handleCheckboxChange('navigateur', type.id)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4"
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={parametres.sms[type.id]}
                      onChange={() => handleCheckboxChange('sms', type.id)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fréquence des notifications */}
      <div className="bg-white rounded-lg shadow-md p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          Fréquence des notifications par email
        </h3>

        <div className="space-y-2.5">
          <label className="flex items-center">
            <input
              type="radio"
              name="frequence"
              value="temps_reel"
              checked={parametres.frequence === 'temps_reel'}
              onChange={(e) => setParametres(prev => ({ ...prev, frequence: e.target.value }))}
              className="text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="ml-2.5 text-xs text-gray-900">
              Temps réel (immédiatement)
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="radio"
              name="frequence"
              value="quotidien"
              checked={parametres.frequence === 'quotidien'}
              onChange={(e) => setParametres(prev => ({ ...prev, frequence: e.target.value }))}
              className="text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="ml-2.5 text-xs text-gray-900">
              Résumé quotidien
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="radio"
              name="frequence"
              value="hebdomadaire"
              checked={parametres.frequence === 'hebdomadaire'}
              onChange={(e) => setParametres(prev => ({ ...prev, frequence: e.target.value }))}
              className="text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="ml-2.5 text-xs text-gray-900">
              Résumé hebdomadaire
            </span>
          </label>
        </div>

        {(parametres.frequence === 'quotidien' || parametres.frequence === 'hebdomadaire') && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Heure d'envoi du résumé
            </label>
            <input
              type="time"
              value={parametres.horaireResume}
              onChange={(e) => setParametres(prev => ({ ...prev, horaireResume: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        )}
      </div>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <Bouton
          variant="primary"
          onClick={handleSauvegarder}
          chargement={sauvegarde}
        >
          Sauvegarder les paramètres
        </Bouton>
      </div>
    </div>
  );
};

export default ParametresNotifications;

