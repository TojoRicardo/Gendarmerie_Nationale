import React from 'react'
import { Check } from 'lucide-react'

const PermissionCheckbox = ({ permission, isSelected, onToggle }) => {
  return (
    <div
      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-blue-50 border-blue-200'
          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      <div
        className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-all ${
          isSelected
            ? 'bg-blue-600 border-blue-600'
            : 'bg-white border-gray-300'
        }`}
      >
        {isSelected && <Check className="text-white" size={14} />}
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{permission.label || permission.code}</div>
        {permission.description && (
          <div className="text-sm text-gray-500 mt-1">{permission.description}</div>
        )}
      </div>
      {isSelected && (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
          Sélectionné
        </span>
      )}
    </div>
  )
}

export default PermissionCheckbox

