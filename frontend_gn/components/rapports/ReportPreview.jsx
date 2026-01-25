import React from 'react';
import { Eye, FileText, Calendar, MapPin, User, AlertCircle } from 'lucide-react';
import ReportCharts from './ReportCharts';
import ReportTable from './ReportTable';

const ReportPreview = ({ reportData, reportConfig, onClose }) => {
  if (!reportConfig) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 p-12 text-center">
        <AlertCircle className="mx-auto text-gray-300 mb-4" size={64} />
        <p className="text-gray-500 text-lg">Aucun rapport à prévisualiser</p>
        <p className="text-gray-400 text-sm mt-2">Configurez les paramètres du rapport et cliquez sur "Prévisualiser"</p>
      </div>
    );
  }

  // Données mockées pour la prévisualisation
  const mockTableData = [
    {
      nom_criminel: 'Dupont Jean',
      infraction: 'Vol',
      date: '15/01/2025',
      statut: 'En cours',
      enqueteur: 'Capitaine Martin',
    },
    {
      nom_criminel: 'Martin Pierre',
      infraction: 'Fraude',
      date: '22/01/2025',
      statut: 'Clôturé',
      enqueteur: 'Lieutenant Dubois',
    },
    {
      nom_criminel: 'Durand Sophie',
      infraction: 'Cybercrime',
      date: '10/02/2025',
      statut: 'En cours',
      enqueteur: 'Sergent Bernard',
    },
    {
      nom_criminel: 'Bernard Lucas',
      infraction: 'Trafic',
      date: '18/02/2025',
      statut: 'En attente',
      enqueteur: 'Capitaine Martin',
    },
    {
      nom_criminel: 'Petit Marie',
      infraction: 'Vol',
      date: '25/02/2025',
      statut: 'En cours',
      enqueteur: 'Lieutenant Dubois',
    },
  ];

  const getTypeRapportLabel = (type) => {
    const types = {
      enquete: "Rapport d'enquête",
      statistique: 'Rapport statistique',
      activite: "Rapport d'activité",
      mensuel: 'Rapport mensuel',
      annuel: 'Rapport annuel',
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* En-tête du rapport */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl mr-4">
                <Eye className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Aperçu du rapport</h2>
                <p className="text-purple-100 mt-1">{getTypeRapportLabel(reportConfig.typeRapport)}</p>
              </div>
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all shadow-lg hover:scale-105"
              >
                <span className="text-white font-bold text-sm"> Fermer</span>
              </button>
            )}
          </div>
        </div>

        {/* Informations du rapport */}
        <div className="p-6 bg-gradient-to-br from-gray-50 to-purple-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-indigo-200 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FileText className="text-indigo-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Type de rapport</p>
                  <p className="font-bold text-gray-900">{getTypeRapportLabel(reportConfig.typeRapport)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border-2 border-purple-200 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Période</p>
                  <p className="font-bold text-gray-900 text-sm">
                    {new Date(reportConfig.dateDebut).toLocaleDateString('fr-FR')} - {new Date(reportConfig.dateFin).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border-2 border-pink-200 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <MapPin className="text-pink-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Région</p>
                  <p className="font-bold text-gray-900">{reportConfig.region || 'Toutes'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border-2 border-cyan-200 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <User className="text-cyan-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Format</p>
                  <p className="font-bold text-gray-900 uppercase">{reportConfig.formatExport}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé exécutif */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <FileText className="text-blue-600" size={20} />
          </div>
          <h3 className="text-xl font-black text-gray-900">Résumé Exécutif</h3>
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-lg">
          <p className="text-gray-700 leading-relaxed">
            Ce rapport couvre la période du <strong>{new Date(reportConfig.dateDebut).toLocaleDateString('fr-FR')}</strong> au{' '}
            <strong>{new Date(reportConfig.dateFin).toLocaleDateString('fr-FR')}</strong>.
            {reportConfig.typeInfraction && (
              <> Il se concentre sur les infractions de type <strong>{reportConfig.typeInfraction}</strong>.</>
            )}
            {reportConfig.region && (
              <> Les données concernent la région de <strong>{reportConfig.region}</strong>.</>
            )}
            {' '}Un total de <strong>5 cas</strong> ont été enregistrés pendant cette période.
          </p>
        </div>
      </div>

      {/* Statistiques clés */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Cas totaux', valeur: '5', couleur: 'blue', icon: '' },
          { label: 'En cours', valeur: '3', couleur: 'orange', icon: '' },
          { label: 'Clôturés', valeur: '1', couleur: 'green', icon: '' },
          { label: 'En attente', valeur: '1', couleur: 'purple', icon: '' },
        ].map((stat, index) => {
          // Classes conditionnelles complètes pour Tailwind
          const borderClass = stat.couleur === 'blue' ? 'border-blue-200' :
                              stat.couleur === 'orange' ? 'border-orange-200' :
                              stat.couleur === 'green' ? 'border-green-200' :
                              'border-purple-200';
          const textClass = stat.couleur === 'blue' ? 'text-blue-600' :
                            stat.couleur === 'orange' ? 'text-orange-600' :
                            stat.couleur === 'green' ? 'text-green-600' :
                            'text-purple-600';
          
          return (
            <div
              key={index}
              className={`bg-white rounded-2xl shadow-xl border-2 ${borderClass} p-6 hover:shadow-2xl hover:scale-105 transition-all`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">{stat.icon}</div>
                <p className={`text-3xl font-black ${textClass} mb-1`}>{stat.valeur}</p>
                <p className="text-sm font-semibold text-gray-600">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphiques */}
      <ReportCharts data={reportData} />

      {/* Tableau de données */}
      <ReportTable data={mockTableData} />

      {/* Conclusions */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-green-200 p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-green-100 rounded-lg mr-3">
            <FileText className="text-green-600" size={20} />
          </div>
          <h3 className="text-xl font-black text-gray-900">Conclusions</h3>
        </div>
        <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded-lg">
          <p className="text-gray-700 leading-relaxed">
            L'analyse des données révèle une tendance stable sur la période considérée. 
            Les ressources allouées semblent adéquates pour traiter les cas en cours. 
            Une attention particulière doit être portée aux cas en attente afin d'optimiser les délais de traitement.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;

