import React from 'react'

/**
 * Icône premium pour l’état vide des assignations.
 * Représente une feuille de route stylisée avec validation.
 */
const AssignmentFlowIcon = ({
  size = 80,
  className = '',
  ...rest
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    className={className}
    {...rest}
  >
    <defs>
      <linearGradient id="assignCircleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E3ECFF" />
        <stop offset="100%" stopColor="#CFE1FF" />
      </linearGradient>
      <linearGradient id="assignAccentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3D8BFF" />
        <stop offset="100%" stopColor="#1552E0" />
      </linearGradient>
      <filter id="assignDropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="rgba(21,82,224,0.2)" />
      </filter>
    </defs>

    {/* Cercle principal */}
    <circle cx="60" cy="60" r="52" fill="url(#assignCircleGradient)" />
    <circle
      cx="60"
      cy="60"
      r="52"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeOpacity="0.65"
    />

    {/* Carte centrale */}
    <g filter="url(#assignDropShadow)">
      <rect
        x="30"
        y="28"
        width="60"
        height="80"
        rx="16"
        fill="#fff"
        stroke="#E0E9FF"
        strokeWidth="2"
      />
      <rect x="35" y="35" width="50" height="8" rx="4" fill="#E8F0FF" />
      <rect x="35" y="48" width="42" height="8" rx="4" fill="#EEF3FF" />

      {/* Timeline */}
      {[0, 1, 2].map((item) => (
        <g key={item} transform={`translate(35 ${60 + item * 12})`}>
          <circle cx="4" cy="4" r="4" fill={item < 2 ? '#5B8DEF' : '#C4D4F8'} />
          <rect x="12" y="1.5" width="30" height="5" rx="2.5" fill={item < 2 ? '#DDE7FF' : '#EEF2FF'} />
        </g>
      ))}

      {/* Badge validation */}
      <g transform="translate(66 84)">
        <circle cx="0" cy="0" r="14" fill="url(#assignAccentGradient)" />
        <path
          d="M-4 0l3 3 6-7"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>

    {/* Connecteurs stylisés */}
    <path
      d="M25 52c8-10 20-16 35-16s27 6 35 16"
      fill="none"
      stroke="url(#assignAccentGradient)"
      strokeOpacity="0.35"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M28 78c7 10 18 18 32 18s25-8 32-18"
      fill="none"
      stroke="url(#assignAccentGradient)"
      strokeOpacity="0.25"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
)

export default AssignmentFlowIcon
