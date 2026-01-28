import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Share2, Eye, Calendar } from 'lucide-react';
import Bouton from '../commun/Bouton';
import SpinnerChargement from '../commun/SpinnerChargement';

const VisionneuseRapport = ({ rapportId }) => {
  const [rapport, setRapport] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (rapportId) {
      chargerRapport();
    }
  }, [rapportId]);

  const chargerRapport = async () => {
    try {
      const response = await fetch(`/api/rapports/${rapportId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRapport(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du rapport:', error);
    } finally {
      setChargement(false);
    }
  };

  const telechargerRapport = async () => {
    try {
      // Vérifier que rapportId est bien défini et n'est pas une chaîne littérale
      if (!rapportId || rapportId === '{uuid}' || rapportId === '{reportId}' || rapportId === '{rapportId}') {
        console.error('❌ [VisionneuseRapport] Erreur: rapportId invalide:', rapportId);
        alert('Erreur: ID de rapport invalide. Veuillez réessayer.');
        return;
      }
      
      console.log('🔵 [VisionneuseRapport] Téléchargement du rapport:', {
        rapportId: rapportId,
        url: `/api/rapports/telecharger/${rapportId}/`
      });
      
      const response = await fetch(`/api/rapports/telecharger/${rapportId}/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = rapport.nomFichier || `rapport_${rapportId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  const imprimerRapport = () => {
    window.print();
  };

  const partagerRapport = async () => {
    // Logique de partage
    const url = `${window.location.origin}/rapports/${rapportId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: rapport.titre,
          text: rapport.description,
          url: url,
        });
      } catch (error) {
        console.error('Erreur lors du partage:', error);
      }
    } else {
      // Fallback: copier le lien
      navigator.clipboard.writeText(url);
      alert('Lien copié dans le presse-papiers');
    }
  };

  if (chargement) {
    return <SpinnerChargement texte="Chargement du rapport..." />;
  }

  if (!rapport) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <FileText className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-500">Rapport non trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête Premium */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden hover:shadow-blue-200/50 transition-all duration-300">
        <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl flex-shrink-0">
                <FileText className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{rapport.titre}</h2>
                <p className="text-blue-100 mt-2">{rapport.description}</p>
                <div className="flex items-center space-x-4 mt-3 text-sm text-blue-100">
                  <span className="flex items-center bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                    <Calendar size={14} className="mr-2" />
                    {new Date(rapport.dateGeneration).toLocaleString('fr-FR')}
                  </span>
                  <span className="flex items-center bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                    <Eye size={14} className="mr-2" />
                    Généré par {rapport.auteur}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 mt-4 md:mt-0">
              <button
                onClick={telechargerRapport}
                className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all shadow-lg hover:scale-105"
                title="Télécharger"
              >
                <Download className="text-white" size={20} />
              </button>
              <button
                onClick={imprimerRapport}
                className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all shadow-lg hover:scale-105"
                title="Imprimer"
              >
                <Printer className="text-white" size={20} />
              </button>
              <button
                onClick={partagerRapport}
                className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all shadow-lg hover:scale-105"
                title="Partager"
              >
                <Share2 className="text-white" size={20} />
              </button>
            </div>
          </div>
        </div>

      {/* Contenu du rapport */}
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
        <div className="prose max-w-none">
        {/* Résumé exécutif */}
        {rapport.resumeExecutif && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Résumé Exécutif</h3>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <p className="text-gray-700">{rapport.resumeExecutif}</p>
            </div>
          </div>
        )}

        {/* Statistiques clés */}
        {rapport.statistiquesGlobales && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Statistiques Clés</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(rapport.statistiquesGlobales).map(([cle, valeur]) => (
                <div key={cle} className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{valeur}</p>
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    {cle.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections du rapport */}
        {rapport.sections && rapport.sections.map((section, index) => (
          <div key={index} className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{section.titre}</h3>
            
            {section.type === 'texte' && (
              <div className="prose" dangerouslySetInnerHTML={{ __html: section.contenu }} />
            )}

            {section.type === 'tableau' && section.donnees && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {section.colonnes.map((col, i) => (
                        <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {section.donnees.map((ligne, i) => (
                      <tr key={i}>
                        {ligne.map((cellule, j) => (
                          <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {cellule}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section.type === 'graphique' && section.image && (
              <div className="flex justify-center">
                <img src={section.image} alt={section.titre} className="max-w-full h-auto rounded-lg shadow" />
              </div>
            )}

            {section.type === 'liste' && section.items && (
              <ul className="list-disc list-inside space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="text-gray-700">{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* Conclusions */}
        {rapport.conclusions && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Conclusions</h3>
            <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
              <p className="text-gray-700">{rapport.conclusions}</p>
            </div>
          </div>
        )}

        {/* Recommandations */}
        {rapport.recommandations && rapport.recommandations.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Recommandations</h3>
            <div className="space-y-3">
              {rapport.recommandations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <p className="text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métadonnées du rapport */}
        <div className="border-t border-gray-200 pt-6 mt-8 text-sm text-gray-500">
          <p>Rapport généré le {new Date(rapport.dateGeneration).toLocaleString('fr-FR')}</p>
          <p>Période couverte: {rapport.periodeDebut} - {rapport.periodeFin}</p>
          <p>Identifiant: {rapport.id}</p>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default VisionneuseRapport;

