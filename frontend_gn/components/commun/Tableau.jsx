import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const Tableau = ({ 
  colonnes = [], 
  donnees = [], 
  onSort,
  sortColumn,
  sortDirection,
  onRowClick,
  chargement = false
}) => {
  const handleSort = (colonneId) => {
    if (onSort) {
      onSort(colonneId);
    }
  };

  return (
    <div className="overflow-x-auto shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {colonnes.map((colonne) => (
              <th
                key={colonne.id}
                scope="col"
                className={`
                  px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                  ${colonne.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                `}
                onClick={() => colonne.sortable && handleSort(colonne.id)}
              >
                <div className="flex items-center space-x-1">
                  <span>{colonne.label}</span>
                  {colonne.sortable && sortColumn === colonne.id && (
                    sortDirection === 'asc' ? 
                      <ChevronUp size={14} /> : 
                      <ChevronDown size={14} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {chargement ? (
            <tr>
              <td 
                colSpan={colonnes.length} 
                className="px-6 py-8 text-center text-gray-500"
              >
                Chargement...
              </td>
            </tr>
          ) : donnees.length === 0 ? (
            <tr>
              <td 
                colSpan={colonnes.length} 
                className="px-6 py-8 text-center text-gray-500"
              >
                Aucune donnée disponible
              </td>
            </tr>
          ) : (
            donnees.map((ligne, index) => (
              <tr
                key={ligne.id || index}
                onClick={() => onRowClick && onRowClick(ligne)}
                className={`
                  ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                  transition-colors
                `}
              >
                {colonnes.map((colonne) => (
                  <td
                    key={colonne.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {colonne.render 
                      ? colonne.render(ligne[colonne.id], ligne) 
                      : ligne[colonne.id]
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Tableau;

