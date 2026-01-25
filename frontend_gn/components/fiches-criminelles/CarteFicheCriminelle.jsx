import React from 'react';
import { FileText, Calendar, AlertTriangle, User, MapPin, Edit2, Trash2, Eye } from 'lucide-react';
import { usePermissions } from '../../src/hooks/usePermissions';
import { PERMISSIONS } from '../../src/utils/permissions';

const CarteFicheCriminelle = ({ fiche, onVoir, onModifier, onSupprimer, isArchived = false }) => {
  const { hasPermission, canModify, canDelete } = usePermissions();
  
  const getStatutBadge = (statut) => {
    const badges = {
      'en_cours': { 
        bg: 'bg-gradient-to-r from-amber-50 to-yellow-50', 
        text: 'text-amber-700', 
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        label: 'En cours' 
      },
      'cloture': { 
        bg: 'bg-gradient-to-r from-emerald-50 to-green-50', 
        text: 'text-emerald-700', 
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Clôturé' 
      },
      'en_attente': { 
        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        label: 'En attente' 
      },
      'archive': { 
        bg: 'bg-gradient-to-r from-gray-50 to-slate-50', 
        text: 'text-gray-700', 
        border: 'border-gray-200',
        dot: 'bg-gray-500',
        label: 'Archivé' 
      },
    };
    return badges[statut] || badges['en_cours'];
  };

  const getNiveauDangerBadge = (niveau) => {
    const badges = {
      1: { // Faible
        bg: 'bg-gradient-to-r from-emerald-50 to-green-50', 
        text: 'text-emerald-700',
        border: 'border-emerald-300',
        icon: 'text-emerald-500',
        label: 'Faible'
      },
      2: { // Modéré
        bg: 'bg-gradient-to-r from-amber-50 to-yellow-50', 
        text: 'text-amber-700',
        border: 'border-amber-300',
        icon: 'text-amber-500',
        label: 'Modéré'
      },
      3: { // Élevé
        bg: 'bg-gradient-to-r from-orange-50 to-red-50', 
        text: 'text-orange-700',
        border: 'border-orange-300',
        icon: 'text-orange-500',
        label: 'Élevé'
      },
      4: { // Très Élevé
        bg: 'bg-gradient-to-r from-red-50 to-rose-50', 
        text: 'text-red-700',
        border: 'border-red-300',
        icon: 'text-red-500',
        label: 'Très Élevé'
      },
      5: { // Extrême
        bg: 'bg-gradient-to-r from-red-100 to-rose-100', 
        text: 'text-red-800',
        border: 'border-red-400',
        icon: 'text-red-600',
        label: 'Extrême'
      },
    };
    return badges[niveau] || badges[2];
  };

  const statut = getStatutBadge(fiche.statut);
  const danger = getNiveauDangerBadge(fiche.niveauDanger);

  return (
    <div 
      onClick={() => onVoir(fiche)}
      className="group relative bg-white rounded-xl border border-gray-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300 overflow-hidden cursor-pointer"
    >
      {/* Accent coloré en haut */}
      <div className={`h-1 ${statut.bg}`} />

      <div className="p-5">
        {/* En-tête avec numéro de dossier */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md">
            <FileText size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate mb-1">
              {fiche.numeroDossier}
            </h3>
            <p className="text-xs text-gray-600 line-clamp-2">
              {fiche.description || 'Aucune description'}
            </p>
          </div>
        </div>

        {/* Informations sur le suspect */}
        {fiche.suspect && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-700 font-semibold mb-0.5">Suspect</p>
                <p className="font-bold text-gray-900 text-sm truncate">
                  {fiche.suspect.nom} {fiche.suspect.prenom}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Infractions */}
        {fiche.infractions && fiche.infractions.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <AlertTriangle size={12} className="text-red-600" />
                <p className="text-xs text-gray-700 font-semibold">Infractions</p>
              </div>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                {fiche.infractions.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fiche.infractions.slice(0, 2).map((infraction, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-700 rounded text-xs font-medium border border-red-200"
                >
                  {infraction.type}
                </span>
              ))}
              {fiche.infractions.length > 2 && (
                <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium border border-gray-300">
                  +{fiche.infractions.length - 2}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Métadonnées */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs text-gray-600">
              <Calendar size={12} className="text-blue-600 mr-1.5" />
              <span className="font-medium">Date d'ouverture</span>
            </div>
            <span className="text-xs font-bold text-gray-900">
              {new Date(fiche.dateOuverture).toLocaleDateString('fr-FR')}
            </span>
          </div>
          
          {fiche.lieu && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="flex items-center text-xs text-gray-600">
                <MapPin size={12} className="text-green-600 mr-1.5" />
                <span className="font-medium">Lieu</span>
              </div>
              <span className="text-xs font-bold text-gray-900 truncate ml-2 max-w-[55%]" title={fiche.lieu}>
                {fiche.lieu}
              </span>
            </div>
          )}
        </div>

        {/* Badges de statut et danger */}
        {!(fiche.statut === 'en_cours' && fiche.niveauDanger === 2) && (
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-200">
            {fiche.statut !== 'en_cours' && (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${statut.bg} ${statut.text} border ${statut.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statut.dot} mr-1.5`} />
                {statut.label}
              </span>
            )}
            
            {fiche.niveauDanger !== 2 && (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${danger.bg} ${danger.text} border ${danger.border}`}>
                <AlertTriangle size={12} className={`mr-1.5 ${danger.icon}`} />
                {danger.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarteFicheCriminelle;

