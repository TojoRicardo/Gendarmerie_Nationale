import React from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * IconWrapper - Wrapper pour uniformiser les icônes Lucide
 * Gère la taille, couleur, opacité et marges de manière cohérente
 */
const IconWrapper = ({ 
  icon,
  size = 'md',
  color = 'default',
  className = '',
  style = {},
  ...props 
}) => {
  // Mapper le nom de l'icône à son composant Lucide
  const IconComponent = typeof icon === 'string' 
    ? LucideIcons[icon] || LucideIcons['AlertCircle']
    : icon;

  if (!IconComponent) {
    console.warn(`Icon "${icon}" not found in lucide-react`);
    return null;
  }

  // Tailles standardisées
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  };

  const iconSize = sizeMap[size] || sizeMap.md;

  // Couleurs standardisées
  const colorMap = {
    default: 'text-gray-700',
    primary: 'text-blue-600',
    success: 'text-green-600',
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-500',
    muted: 'text-gray-400',
    white: 'text-white',
  };

  const colorClass = colorMap[color] || colorMap.default;

  // Classes par défaut pour la cohérence
  const defaultClasses = 'inline-block flex-shrink-0';
  
  // Merge des classes
  const classes = `${defaultClasses} ${colorClass} ${className}`.trim();

  return (
    <IconComponent
      size={iconSize}
      className={classes}
      style={style}
      strokeWidth={2}
      {...props}
    />
  );
};

/**
 * IconSet - Mapping standardisé des icônes par type
 */
export const IconSet = {
  // Actions
  edit: 'Edit',
  delete: 'Trash2',
  save: 'Save',
  view: 'Eye',
  add: 'Plus',
  remove: 'Minus',
  cancel: 'X',
  confirm: 'CheckCircle2',
  
  // Navigation
  home: 'Home',
  list: 'List',
  users: 'Users',
  settings: 'Settings',
  menu: 'Menu',
  search: 'Search',
  filter: 'Filter',
  
  // Audit
  activity: 'Activity',
  shield: 'Shield',
  history: 'History',
  clock: 'Clock',
  
  // IA
  brain: 'Brain',
  sparkles: 'Sparkles',
  scan: 'Scan',
  
  // Biométrie
  fingerprint: 'Fingerprint',
  face: 'User',
  camera: 'Camera',
  
  // Alertes
  warning: 'AlertTriangle',
  alert: 'AlertCircle',
  info: 'Info',
  success: 'CheckCircle2',
  error: 'XCircle',
  
  // Chargement
  loading: 'Loader2',
  refresh: 'RefreshCw',
  download: 'Download',
  upload: 'Upload',
  
  // Autres
  calendar: 'Calendar',
  map: 'MapPin',
  file: 'FileText',
  folder: 'Folder',
  mail: 'Mail',
  phone: 'Phone',
  lock: 'Lock',
  unlock: 'Unlock',
};

/**
 * Helper pour obtenir une icône typée
 */
export const getIcon = (iconName) => {
  return IconSet[iconName] || iconName;
};

export default IconWrapper;
