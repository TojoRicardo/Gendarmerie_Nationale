import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { X, ChevronRight, Shield } from 'lucide-react';
import { usePermissions } from '../../src/hooks/usePermissions';
import { useAuth } from '../../src/context/AuthContext';
import { MENU_ITEMS, getFilteredMenuItems } from '../../src/constants/menuItems';

const BarreLatérale = ({ isOpen, onClose, isCollapsed = false }) => {
  const { hasPermission, permissions } = usePermissions();
  const { utilisateur } = useAuth();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showSparkles, setShowSparkles] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Mémoriser les éléments du menu pour éviter les re-renders inutiles
  const menuItems = useMemo(() => {
    return getFilteredMenuItems(permissions);
  }, [permissions]);

  // Effet pour les étincelles aléatoires
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 2000);
      }, 10000); // Toutes les 10 secondes
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Gérer l'animation des éléments de menu - se déclenche uniquement quand la sidebar s'ouvre
  useEffect(() => {
    if (isOpen) {
      setShouldAnimate(true);
      // Désactiver l'animation après qu'elle soit terminée
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 500); // Durée de l'animation
      return () => clearTimeout(timer);
    } else {
      setShouldAnimate(false);
    }
  }, [isOpen]);
  
  // Log pour déboguer l'affichage de la sidebar (seulement en mode développement)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Sidebar - État actuel:', {
        isOpen,
        utilisateur: utilisateur?.nom,
        role: utilisateur?.role,
        permissionsCount: permissions?.length || 0,
        menuItemsCount: menuItems?.length || 0
      });
    }
  }, [isOpen, utilisateur?.nom, utilisateur?.role, permissions?.length, menuItems?.length]);

  return (
    <>
      {/* Overlay pour mobile avec animation */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
          onClick={onClose}
        />
      )}

      {/* Sidebar avec animations améliorées */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800
          border-r border-slate-700/50
          transform transition-all duration-500 ease-out
          ${isOpen ? 'translate-x-0 shadow-2xl sidebar-enter sidebar-tilt-right-hover' : '-translate-x-full lg:translate-x-0 sidebar-exit'}
          ${isCollapsed ? 'w-20' : 'w-72'}
          flex flex-col
          ${showSparkles ? 'sidebar-glow' : ''}
        `}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Effet d'étincelles subtil */}
        {showSparkles && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
                style={{
                  top: `${30 + i * 20}%`,
                  left: `${15 + i * 30}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: '3s'
                }}
              />
            ))}
          </div>
        )}
        {/* Header mobile seulement */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50 lg:hidden bg-slate-800/50 sidebar-slide-up">
          <div className="flex items-center space-x-3 sidebar-reveal" style={{ transformStyle: 'preserve-3d' }}>
            <div className="p-2.5 bg-gradient-to-br from-gendarme-blue to-gendarme-blue-dark rounded-xl shadow-lg transition-transform duration-300">
              <Shield size={20} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Menu</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 text-gray-300 hover:text-white"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation avec animations stagger */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 scrollbar-thin space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isHovered = hoveredItem === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-3.5 rounded-xl 
                  transition-all duration-300 ease-out relative overflow-hidden
                  ${isActive
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-[1.02]`
                    : `text-gray-300 ${item.hoverBg} hover:text-white hover:scale-[1.02] ${!isCollapsed && 'hover:translate-x-2'}`
                  }`
                }
                onClick={() => window.innerWidth < 1024 && onClose()}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ 
                  animationDelay: shouldAnimate ? `${index * 50}ms` : '0ms',
                  animation: shouldAnimate ? 'slideInRight 0.4s ease-out forwards' : 'none',
                  transformStyle: 'preserve-3d'
                }}
                title={isCollapsed ? item.label : ''}
              >
                {/* Background gradient on hover (non-active items) */}
                {({ isActive }) => (
                  <>
                    {!isActive && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    )}
                    
                    <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'} relative z-10`}>
                      {/* Icône avec animation */}
                      <div 
                        className={`
                          p-2 rounded-lg transition-all duration-300
                          ${isActive 
                            ? 'bg-white/20 shadow-inner' 
                            : `${item.bgColor} group-hover:scale-110 group-hover:rotate-3`
                          }
                        `}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <Icon 
                          size={20} 
                          className={`
                            flex-shrink-0 transition-all duration-300
                            ${isActive ? 'text-white' : item.iconColor}
                            group-hover:scale-110
                          `}
                        />
                      </div>
                      {!isCollapsed && (
                        <span className="font-medium text-sm whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </div>
                    
                    {/* Chevron avec animation (masqué en mode collapsed) */}
                    {!isCollapsed && (
                      <ChevronRight 
                        size={18} 
                        className={`
                          relative z-10 transition-all duration-300
                          ${isActive 
                            ? 'opacity-100 translate-x-0' 
                            : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                          }
                        `}
                        style={{ transformStyle: 'preserve-3d' }}
                      />
                    )}
                    
                    {/* Tooltip en mode collapsed */}
                    {isCollapsed && isHovered && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-xl border border-slate-700 whitespace-nowrap z-50 animate-fadeIn">
                        {item.label}
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45"></div>
                      </div>
                    )}
                    
                    {/* Effet de brillance au hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Divider animé */}
        {!isCollapsed && (
          <div className="px-4 mb-2">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </div>
        )}

        {/* Footer ultra-compact */}
        <div className={`${isCollapsed ? 'px-2' : 'px-4'} py-3 bg-slate-900/50`} style={{ transformStyle: 'preserve-3d' }}>
          {isCollapsed ? (
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-gendarme-green-light rounded-full animate-pulse" title="Système Opérationnel" />
            </div>
          ) : (
            <div className="text-center space-y-2">
              {/* Badge status avec pulse */}
              <div className="transition-transform duration-300">
                <span className="inline-flex items-center px-2 py-0.5 bg-gendarme-green/20 text-gendarme-green-light text-xs font-medium rounded-full border border-gendarme-green/30">
                  <span className="w-1.5 h-1.5 bg-gendarme-green-light rounded-full mr-1.5 animate-pulse" />
                  Système Opérationnel
                </span>
              </div>
              
              {/* Version */}
              <div className="space-y-0 transition-transform duration-300">
                <p className="text-xs text-gray-500">Version 1.0.0</p>
                <p className="text-xs text-gray-600">© 2025 Gendarmerie Nationale</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default BarreLatérale;
