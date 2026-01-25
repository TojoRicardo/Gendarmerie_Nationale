import React from 'react'
import PermissionCheckbox from './PermissionCheckbox'
import { ChevronDown, ChevronRight } from 'lucide-react'

const PermissionCategory = ({
  category,
  permissions,
  selectedPermissions,
  onTogglePermission,
  onToggleCategory
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true)
  
  // Filtrer les permissions de cette catégorie
  const categoryPermissions = permissions.filter(p => p.category === category)
  
  // Vérifier si toutes les permissions de la catégorie sont sélectionnées
  const categoryIds = categoryPermissions.map(p => p.id)
  const allSelected = categoryIds.length > 0 && categoryIds.every(id => selectedPermissions.includes(id))
  const someSelected = categoryIds.some(id => selectedPermissions.includes(id))

  const handleToggleAll = () => {
    onToggleCategory(category, !allSelected)
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* En-tête de la catégorie */}
      <div 
        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDown className="text-gray-500" size={20} />
          ) : (
            <ChevronRight className="text-gray-500" size={20} />
          )}
          <h3 className="font-semibold text-gray-900 text-lg">{category}</h3>
          <span className="text-sm text-gray-500">
            ({categoryPermissions.filter(p => selectedPermissions.includes(p.id)).length}/{categoryPermissions.length})
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggleAll()
          }}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            allSelected
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : someSelected
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
        </button>
      </div>

      {/* Liste des permissions */}
      {isExpanded && (
        <div className="p-4 space-y-2 bg-white">
          {categoryPermissions.map((permission) => (
            <PermissionCheckbox
              key={permission.id}
              permission={permission}
              isSelected={selectedPermissions.includes(permission.id)}
              onToggle={() => onTogglePermission(permission.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default PermissionCategory

