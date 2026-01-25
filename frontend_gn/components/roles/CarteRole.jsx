import React from 'react';
import { Shield, Users, Key, Edit, Trash2, MoreVertical, ShieldCheck, BarChart3, Eye, FileSearch, Settings } from 'lucide-react';
import Bouton from '../commun/Bouton';

const CarteRole = ({ role, onModifier, onSupprimer, onVoir }) => {
  const [menuOuvert, setMenuOuvert] = React.useState(false);

  // Fonction pour obtenir l'icône selon le rôle (toutes les cartes en bleu)
  const getRoleConfig = (roleNom) => {
    const roleLower = (roleNom || '').toLowerCase();
    const couleurBleue = '#185CD6'; // Couleur bleue unique pour toutes les cartes
    
    // Déterminer l'icône selon le rôle
    let icon = Shield; // Icône par défaut
    
    if (roleLower.includes('administrateur') || roleLower.includes('admin')) {
      icon = ShieldCheck;
    } else if (roleLower.includes('enquêteur') || roleLower.includes('enqueteur')) {
      icon = FileSearch;
    } else if (roleLower.includes('analyste')) {
      icon = BarChart3;
    } else if (roleLower.includes('observateur')) {
      icon = Eye;
    }
    
    // Toutes les cartes utilisent la même couleur bleue
    return {
      icon: icon,
      color: couleurBleue,
      bgColor: '#185CD61A',
      borderColor: '#185CD640'
    };
  };

  const roleConfig = getRoleConfig(role.nom);
  const RoleIcon = roleConfig.icon;
  const couleur = roleConfig.color;

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100" 
         style={{ '--hover-border-color': '#185CD6' }}
         onMouseEnter={(e) => e.currentTarget.style.borderColor = '#185CD6'}
         onMouseLeave={(e) => e.currentTarget.style.borderColor = '#f3f4f6'}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border-2" 
               style={{ backgroundColor: roleConfig.bgColor, color: couleur, borderColor: roleConfig.borderColor }}>
            <RoleIcon size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{role.nom}</h3>
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded-md mt-1">
              {role.code}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical size={20} />
          </button>
          
          {menuOuvert && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
              <button
                onClick={() => {
                  onVoir(role);
                  setMenuOuvert(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg"
              >
                Voir les détails
              </button>
              <button
                onClick={() => {
                  onModifier(role);
                  setMenuOuvert(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Modifier
              </button>
              <button
                onClick={() => {
                  onSupprimer(role);
                  setMenuOuvert(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 rounded-b-lg"
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {role.description || 'Aucune description'}
      </p>

      {/* Statistiques du rôle */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg p-3 border" style={{ backgroundColor: `${couleur}0D`, borderColor: `${couleur}30` }}>
          <div className="flex items-center justify-between">
            <Users size={18} style={{ color: couleur }} />
            <span className="text-2xl font-bold" style={{ color: couleur }}>
              {role.nombreUtilisateurs || 0}
            </span>
          </div>
          <p className="text-xs font-medium mt-1" style={{ color: couleur }}>Utilisateurs</p>
        </div>

        <div className="rounded-lg p-3 border" style={{ backgroundColor: `${couleur}0D`, borderColor: `${couleur}30` }}>
          <div className="flex items-center justify-between">
            <Settings size={18} style={{ color: couleur }} />
            <span className="text-2xl font-bold" style={{ color: couleur }}>
              {role.nombrePermissions || 0}
            </span>
          </div>
          <p className="text-xs font-medium mt-1" style={{ color: couleur }}>Permissions</p>
        </div>
      </div>

      {/* Statut du rôle */}
      <div className="mb-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
          role.estActif 
            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
            : 'bg-gray-100 text-gray-700 border border-gray-200'
        }`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${role.estActif ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
          {role.estActif ? 'Actif' : 'Inactif'}
        </span>
      </div>

      <div className="flex space-x-2 pt-4 border-t border-gray-200">
        <button
          onClick={() => onModifier(role)}
          className="flex-1 px-4 py-2 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-1"
          style={{ backgroundColor: '#1764E8' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1558D6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1764E8'}
        >
          <Edit size={16} />
          <span>Modifier</span>
        </button>
        <button
          onClick={() => onVoir(role)}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          Détails
        </button>
      </div>
    </div>
  );
};

export default CarteRole;

