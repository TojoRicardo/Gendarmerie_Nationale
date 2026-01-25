import React from 'react';
import { AlertCircle, Ban } from 'lucide-react';

/**
 * Composant de Reconnaissance Faciale - DÉSACTIVÉ
 * 
 * NOTE: Cette fonctionnalité a été désactivée car le package face_recognition
 * a été retiré du système backend.
 */
const ReconnaissanceFaciale = ({ onResultat, caseId = null }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Ban className="text-red-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Reconnaissance Faciale
              </h1>
              <p className="text-sm text-gray-600">
                Fonctionnalité désactivée
              </p>
            </div>
          </div>
        </div>

        {/* Message de désactivation */}
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow-lg p-6">
          <div className="flex items-start space-x-4">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-900 mb-2">
                Fonctionnalité Désactivée
              </h2>
              <div className="text-red-800 space-y-3">
                <p>
                  La fonctionnalité de reconnaissance faciale a été désactivée dans ce système.
                </p>
                <p className="font-medium">
                  Raison technique :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Le package <code className="bg-red-100 px-2 py-1 rounded">face_recognition</code> a été retiré</li>
                  <li>La bibliothèque <code className="bg-red-100 px-2 py-1 rounded">dlib</code> a été supprimée</li>
                  <li>Les modèles de reconnaissance faciale ne sont plus disponibles</li>
                </ul>
                
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="font-medium mb-2">
                    Alternatives disponibles :
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Recherche manuelle par numéro de fiche</li>
                    <li>Recherche par nom et prénom</li>
                    <li>Recherche par empreintes digitales</li>
                    <li>Consultation du registre biométrique</li>
                  </ul>
                </div>

                <div className="mt-4 p-4 bg-red-100 rounded">
                  <p className="text-sm">
                    <strong>Contact :</strong> Pour réactiver cette fonctionnalité, 
                    veuillez contacter l'administrateur système (SGIC - Gendarmerie Nationale).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Fonctionnalités toujours disponibles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2"> Gestion Biométrique</h4>
              <p className="text-sm text-green-800">
                Upload et gestion des photos criminelles
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2"> Empreintes Digitales</h4>
              <p className="text-sm text-green-800">
                Enregistrement et consultation des empreintes
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2"> Analyse Prédictive</h4>
              <p className="text-sm text-green-800">
                Prédiction des risques et patterns criminels
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2"> Recherche Manuel</h4>
              <p className="text-sm text-green-800">
                Recherche par critères multiples
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconnaissanceFaciale;
