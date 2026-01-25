import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

const ChampTexte = forwardRef(({
  label,
  type = 'text',
  placeholder,
  erreur,
  aide,
  icone: Icone,
  required = false,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icone && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Icone size={18} />
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-2 border rounded-lg
            ${Icone ? 'pl-10' : ''}
            ${erreur ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
            focus:outline-none focus:ring-2 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            transition-colors
          `}
          {...props}
        />
      </div>

      {erreur && (
        <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
          <AlertCircle size={14} />
          <span>{erreur}</span>
        </div>
      )}

      {aide && !erreur && (
        <p className="mt-1 text-sm text-gray-500">{aide}</p>
      )}
    </div>
  );
});

ChampTexte.displayName = 'ChampTexte';

export default ChampTexte;

