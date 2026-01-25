import React, { useState } from 'react';
import { Download, FileCheck, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { downloadFicheCriminellePDF } from '../../src/services/reportsService';

const DownloadFicheCriminelle = ({ criminelId, criminelNom }) => {
  const [chargementPDF, setChargementPDF] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  const handleDownloadPDF = async () => {
    setChargementPDF(true);
    setErreur('');
    setSucces('');

    try {
      await downloadFicheCriminellePDF(criminelId);
      
      // Afficher le message de succès
      setSucces('Fiche criminelle complète (PDF) téléchargée avec succès !');
      setTimeout(() => setSucces(''), 3000);
      
    } catch (error) {
      console.error('Erreur lors du téléchargement PDF:', error);
      setErreur(error.message || 'Erreur lors du téléchargement de la fiche criminelle PDF');
    } finally {
      setChargementPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <FileCheck className="mr-2 text-blue-600" size={24} />
          Télécharger le document officiel
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Générez et téléchargez le document officiel PDF complet de la fiche criminelle avec toutes les informations, photos biométriques et empreintes.
        </p>

        <div className="flex justify-center">
          {/* Bouton téléchargement PDF Complet */}
          <button
            onClick={handleDownloadPDF}
            disabled={chargementPDF}
            className="flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group w-full max-w-md"
          >
            {chargementPDF ? (
              <>
                <Loader2 className="animate-spin text-white" size={32} />
                <span className="text-sm font-semibold">Génération du PDF en cours...</span>
                <span className="text-xs opacity-80">Veuillez patienter</span>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <Download size={28} className="group-hover:scale-110 transition-transform" />
                  <FileCheck size={28} className="group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <span className="block font-bold text-lg">Télécharger la Fiche Complète</span>
                  <span className="block text-sm mt-2 opacity-90">Document PDF officiel</span>
                  <div className="flex items-center justify-center space-x-4 text-xs mt-3 opacity-80">
                    <span> Toutes les informations</span>
                    <span>•</span>
                    <span> Photos biométriques</span>
                    <span>•</span>
                    <span> Empreintes</span>
                  </div>
                </div>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message de succès */}
      {succes && (
        <div className="flex items-center space-x-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg animate-fadeIn shadow-sm">
          <CheckCircle size={20} className="flex-shrink-0" />
          <p className="text-sm font-medium">
            {succes}
          </p>
        </div>
      )}

      {/* Message d'erreur */}
      {erreur && (
        <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-fadeIn shadow-sm">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Erreur de téléchargement</p>
            <p className="text-xs mt-1">{erreur}</p>
          </div>
        </div>
      )}

      {/* Informations supplémentaires */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-bold text-gray-700 mb-2"> Contenu du document :</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p className="flex items-start">
            <span className="mr-2"></span>
            <span><strong>Informations personnelles complètes</strong> - État civil, filiation, coordonnées</span>
          </p>
          <p className="flex items-start">
            <span className="mr-2"></span>
            <span><strong>Description physique détaillée</strong> - Corpulence, cheveux, visage, signes particuliers</span>
          </p>
          <p className="flex items-start">
            <span className="mr-2"></span>
            <span><strong>Profil biométrique conforme aux normes internationales</strong> - Photos face, profil gauche, profil droit</span>
          </p>
          <p className="flex items-start">
            <span className="mr-2"></span>
            <span><strong>Empreintes digitales</strong> - 10 doigts avec labels</span>
          </p>
          <p className="flex items-start">
            <span className="mr-2"></span>
            <span><strong>Empreintes palmaires</strong> - Main droite et gauche (si disponibles)</span>
          </p>
          <p className="flex items-start">
            <span className="mr-2"></span>
            <span><strong>Informations judiciaires</strong> - Arrestation, unité, PV, antécédents</span>
          </p>
          <p className="flex items-start">
            <span className="mr-2"></span>
            <span><strong>Historique des infractions</strong> - Toutes les infractions enregistrées</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DownloadFicheCriminelle;
