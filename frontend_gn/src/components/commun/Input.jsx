import { memo, forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'

/**
 * Composant Input standardisé SGIC
 * Hauteur: 44px
 * Padding: 16px horizontal
 * Border-radius: 8px
 * Taille texte: 16px
 */
const Input = forwardRef(({
  label,
  error,
  helperText,
  size = 'standard',
  className = '',
  icon: Icon,
  iconPosition = 'left',
  ...props
}, ref) => {
  const baseClasses = 'sgic-input w-full'
  
  const sizeClasses = {
    standard: 'h-[44px] min-h-[44px] px-4 text-[16px] rounded-[8px]',
    sm: 'h-[40px] min-h-[40px] px-3 text-[14px] rounded-[8px]',
    lg: 'h-[48px] min-h-[48px] px-5 text-[16px] rounded-[8px]',
  }
  
  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
  
  const iconPadding = Icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : ''
  
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-[14px] font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            <Icon size={20} />
          </div>
        )}
        <input
          ref={ref}
          className={`${baseClasses} ${sizeClasses[size]} ${errorClasses} ${iconPadding} focus:outline-none focus:ring-2 transition-colors`}
          {...props}
        />
        {Icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            <Icon size={20} />
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1 mt-2 text-[14px] text-red-600">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      {helperText && !error && (
        <p className="mt-2 text-[13px] text-gray-500">{helperText}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default memo(Input)

