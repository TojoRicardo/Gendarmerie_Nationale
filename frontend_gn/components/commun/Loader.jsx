import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Composant Loader réutilisable
 * Affiche un spinner de chargement avec un message optionnel
 */
const Loader = ({ 
  message = 'Chargement...', 
  size = 'medium',
  fullScreen = false 
}) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  }

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col justify-center items-center'
    : 'flex flex-col justify-center items-center py-12'

  return (
    <div className={containerClasses}>
      <Loader2 
        className={`${sizeClasses[size]} text-gendarme-blue animate-spin`} 
      />
      {message && (
        <p className="mt-4 text-gray-600 font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  )
}

/**
 * Skeleton Loader pour les cartes
 */
export const SkeletonCard = () => (
  <div className="card-pro p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
      <div className="w-16 h-6 bg-gray-200 rounded-lg"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded w-full"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
)

/**
 * Skeleton Loader pour les tableaux
 */
export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div className="card-pro p-6 animate-pulse">
    <div className="space-y-4">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 rounded"></div>
        ))}
      </div>
      
      {/* Divider */}
      <div className="border-t border-gray-200"></div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
)

/**
 * Skeleton Loader pour les graphiques
 */
export const SkeletonChart = () => (
  <div className="card-pro p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
    <div className="h-64 bg-gray-100 rounded-xl flex items-end justify-around px-4 pb-4 space-x-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div 
          key={i} 
          className="bg-gray-200 rounded-t w-full" 
          style={{ height: `${Math.random() * 80 + 20}%` }}
        ></div>
      ))}
    </div>
  </div>
)

/**
 * Skeleton Loader pour les stats
 */
export const SkeletonStats = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

export default Loader

