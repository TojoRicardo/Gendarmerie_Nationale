import { memo } from 'react'

/**
 * Composant Button standardisé SGIC
 * Hauteur: 44px
 * Padding: 14px horizontal
 * Border-radius: 10px
 * Zone cliquable: ≥ 44px (WCAG)
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'standard',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  icon: Icon,
  iconPosition = 'left',
  ...props
}) => {
  const baseClasses = 'sgic-btn inline-flex items-center justify-center font-medium transition-all duration-200'
  
  const variantClasses = {
    primary: 'sgic-btn-primary',
    secondary: 'sgic-btn-secondary',
    danger: 'sgic-btn-danger',
    outline: 'sgic-btn-outline',
    ghost: 'text-gray-700 hover:bg-gray-100 bg-transparent border-none',
  }
  
  const sizeClasses = {
    standard: 'h-[44px] min-h-[44px] px-[14px] text-[16px] rounded-[10px]',
    sm: 'h-[40px] min-h-[40px] px-[12px] text-[14px] rounded-[8px]',
    lg: 'h-[48px] min-h-[48px] px-[16px] text-[16px] rounded-[10px]',
  }
  
  const iconSize = size === 'lg' ? 24 : size === 'sm' ? 18 : 20
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
  
  const content = (
    <>
      {Icon && iconPosition === 'left' && (
        <Icon size={iconSize} className="sgic-icon flex-shrink-0" />
      )}
      {children}
      {Icon && iconPosition === 'right' && (
        <Icon size={iconSize} className="sgic-icon flex-shrink-0" />
      )}
    </>
  )
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      {...props}
    >
      {content}
    </button>
  )
}

Button.displayName = 'Button'

export default memo(Button)

