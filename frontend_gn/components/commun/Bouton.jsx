import React from 'react';
import { Loader2 } from 'lucide-react';

const Bouton = ({
  children,
  type = 'button',
  variant = 'primary',
  taille = 'medium',
  chargement = false,
  disabled = false,
  icone: Icone,
  onClick,
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-gendarme-blue hover:bg-gendarme-blue-light text-white shadow-md hover:shadow-lg',
    secondary: 'bg-gendarme-light hover:bg-gendarme-light-hover text-white shadow-md hover:shadow-lg',
    success: 'bg-gendarme-green hover:bg-gendarme-green-light text-white shadow-md hover:shadow-lg',
    danger: 'bg-gendarme-red hover:bg-gendarme-red-dark text-white shadow-md hover:shadow-lg',
    warning: 'bg-gendarme-gold hover:bg-gendarme-gold-light text-gendarme-dark shadow-md hover:shadow-lg font-bold',
    outline: 'border-2 text-white hover:text-white',
    ghost: 'text-gendarme-dark hover:bg-gendarme-gray',
  };

  const tailleClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gendarme-blue
    disabled:opacity-50 disabled:cursor-not-allowed
    hover:scale-105 active:scale-95
  `;

  // Style personnalisé pour le variant outline (bouton Modifier)
  const outlineStyle = variant === 'outline' ? {
    backgroundColor: '#1764E8',
    borderColor: '#1764E8',
    color: '#FFFFFF'
  } : {};

  const handleMouseEnter = (e) => {
    if (variant === 'outline' && !disabled && !chargement) {
      e.currentTarget.style.backgroundColor = '#1558D6';
      e.currentTarget.style.borderColor = '#1558D6';
    }
  };

  const handleMouseLeave = (e) => {
    if (variant === 'outline' && !disabled && !chargement) {
      e.currentTarget.style.backgroundColor = '#1764E8';
      e.currentTarget.style.borderColor = '#1764E8';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || chargement}
      style={outlineStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${tailleClasses[taille]}
        ${className}
      `}
      {...props}
    >
      {chargement ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icone ? (
        <Icone className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
};

export default Bouton;

