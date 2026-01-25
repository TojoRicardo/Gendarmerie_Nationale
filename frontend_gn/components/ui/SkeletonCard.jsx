import React from 'react';

/**
 * SkeletonCard - Skeleton loader pour les cartes
 * Affiche un placeholder élégant pendant le chargement des cartes
 */
const SkeletonCard = ({ 
  lines = 3,
  showImage = false,
  showActions = false 
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      {/* En-tête avec image optionnelle */}
      <div className="flex items-start justify-between mb-4">
        {showImage && (
          <div className="w-16 h-16 bg-gray-200 rounded-xl" />
        )}
        <div className="flex-1 ml-4 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        {showActions && (
          <div className="w-20 h-8 bg-gray-200 rounded-lg" />
        )}
      </div>

      {/* Corps avec lignes variables */}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div 
            key={index}
            className={`h-4 bg-gray-200 rounded ${
              index === lines - 1 ? 'w-2/3' : 'w-full'
            }`}
          />
        ))}
      </div>

      {/* Footer optionnel */}
      {showActions && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonTable - Skeleton loader pour les tableaux
 */
export const SkeletonTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      {/* En-tête du tableau */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 rounded" />
        ))}
      </div>
      
      {/* Ligne de séparation */}
      <div className="border-t border-gray-200 mb-4" />
      
      {/* Lignes de données */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex}>
          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
          {rowIndex < rows - 1 && <div className="border-t border-gray-100 mb-4" />}
        </div>
      ))}
    </div>
  );
};

/**
 * SkeletonChart - Skeleton loader pour les graphiques
 */
export const SkeletonChart = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="h-64 bg-gray-100 rounded-xl flex items-end justify-around px-4 pb-4 space-x-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i} 
            className="bg-gray-200 rounded-t w-full" 
            style={{ height: `${Math.random() * 80 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * SkeletonForm - Skeleton loader pour les formulaires
 */
export const SkeletonForm = ({ fields = 4 }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-10 bg-gray-100 rounded-lg" />
        </div>
      ))}
      <div className="flex justify-end space-x-3 pt-4">
        <div className="h-10 bg-gray-200 rounded-lg w-24" />
        <div className="h-10 bg-gray-200 rounded-lg w-24" />
      </div>
    </div>
  );
};

/**
 * SkeletonImage - Skeleton loader pour les images
 */
export const SkeletonImage = ({ aspectRatio = '16/9' }) => {
  return (
    <div 
      className="bg-gray-200 rounded-lg animate-pulse"
      style={{ aspectRatio }}
    />
  );
};

export default SkeletonCard;
