import React, { useState } from 'react';
import { Search, ChevronUp, ChevronDown, Eye, Download, ArrowLeft, ArrowRight } from 'lucide-react';

const ReportTable = ({ data = [], onViewDetail }) => {
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const [triColonne, setTriColonne] = useState('');
  const [triOrdre, setTriOrdre] = useState('asc');
  const elementsParPage = 10;

  // Filtrer les données
  const donneesFiltrees = data.filter(item =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(recherche.toLowerCase())
    )
  );

  // Trier les données
  const donneesTries = [...donneesFiltrees].sort((a, b) => {
    if (!triColonne) return 0;
    
    const valA = a[triColonne];
    const valB = b[triColonne];
    
    if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
    if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(donneesTries.length / elementsParPage);
  const indexDebut = (page - 1) * elementsParPage;
  const indexFin = indexDebut + elementsParPage;
  const donneesPage = donneesTries.slice(indexDebut, indexFin);

  const handleTri = (colonne) => {
    if (triColonne === colonne) {
      setTriOrdre(triOrdre === 'asc' ? 'desc' : 'asc');
    } else {
      setTriColonne(colonne);
      setTriOrdre('asc');
    }
  };

  const colonnes = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden">
      {/* En-tête avec recherche */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-white">Données détaillées</h3>
            <p className="text-blue-100 mt-1">{donneesFiltrees.length} résultat(s) trouvé(s)</p>
          </div>
          
          {/* Barre de recherche */}
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <Search className="absolute left-3 top-2.5 text-blue-200" size={18} />
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        {donneesPage.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 text-lg">Aucun résultat trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
              <tr>
                {colonnes.map((colonne, index) => (
                  <th
                    key={index}
                    onClick={() => handleTri(colonne)}
                    className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{colonne.replace(/_/g, ' ')}</span>
                      {triColonne === colonne && (
                        triOrdre === 'asc' ? 
                          <ChevronUp size={14} className="text-blue-600" /> : 
                          <ChevronDown size={14} className="text-blue-600" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {donneesPage.map((ligne, indexLigne) => (
                <tr 
                  key={indexLigne}
                  className="hover:bg-blue-50 transition-colors"
                >
                  {colonnes.map((colonne, indexCol) => (
                    <td key={indexCol} className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">
                        {ligne[colonne]}
                      </span>
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => onViewDetail && onViewDetail(ligne)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-all hover:scale-110"
                        title="Voir détails"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-all hover:scale-110"
                        title="Exporter cette ligne"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Affichage de <span className="font-bold text-gray-900">{indexDebut + 1}</span> à{' '}
              <span className="font-bold text-gray-900">{Math.min(indexFin, donneesTries.length)}</span> sur{' '}
              <span className="font-bold text-gray-900">{donneesTries.length}</span> résultats
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`p-2 rounded-lg transition-all ${
                  page === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 shadow-lg'
                }`}
              >
                <ArrowLeft size={18} />
              </button>
              
              <div className="flex items-center space-x-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 rounded-lg font-bold transition-all ${
                      page === i + 1
                        ? 'bg-blue-600 text-white shadow-lg scale-110'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`p-2 rounded-lg transition-all ${
                  page === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 shadow-lg'
                }`}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportTable;

