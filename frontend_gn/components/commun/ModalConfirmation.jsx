import React from 'react';
import { AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Modal de confirmation premium
 * Remplace les confirm() et alert() natifs par une interface professionnelle
 */
const ModalConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  type = 'confirm', // 'confirm', 'success', 'error', 'warning', 'info'
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  showCancel = true
}) => {
  if (!isOpen) return null;

  // Couleurs selon le type - Utilise #185CD6 comme couleur principale
  const getColors = () => {
    switch (type) {
      case 'create':
        return {
          gradient: 'from-[#C0F6E3] via-[#A8F0D5] to-[#8EEAC7]',
          button: 'hover:shadow-xl transition-all',
          buttonStyle: { background: 'linear-gradient(135deg, #10B981, #059669)' },
          buttonHover: { background: 'linear-gradient(135deg, #059669, #047857)' },
          iconBg: 'bg-white/80',
          iconColor: 'text-emerald-700',
          border: 'border-[#C0F6E3]',
          titleColor: 'text-emerald-900',
          messageColor: 'text-emerald-800'
        };
      case 'success':
        return {
          gradient: 'from-[#185CD6] via-[#1348A8] to-[#0F3A8A]',
          button: 'hover:shadow-xl transition-all',
          buttonStyle: { background: 'linear-gradient(to right, #185CD6, #1348A8)' },
          buttonHover: { background: 'linear-gradient(to right, #1348A8, #0F3A8A)' },
          iconBg: 'bg-[#185CD6]/10',
          iconColor: 'text-[#185CD6]',
          border: 'border-[#185CD6]'
        };
      case 'error':
        return {
          gradient: 'from-red-500 via-rose-500 to-pink-500',
          button: 'hover:shadow-xl transition-all',
          buttonStyle: { background: 'linear-gradient(to right, #dc2626, #e11d48)' },
          buttonHover: { background: 'linear-gradient(to right, #b91c1c, #be123c)' },
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          border: 'border-red-500'
        };
      case 'warning':
        return {
          gradient: 'from-orange-500 via-amber-500 to-yellow-500',
          button: 'hover:shadow-xl transition-all',
          buttonStyle: { background: 'linear-gradient(to right, #ea580c, #f59e0b)' },
          buttonHover: { background: 'linear-gradient(to right, #c2410c, #d97706)' },
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          border: 'border-orange-500'
        };
      case 'info':
        return {
          gradient: 'from-[#185CD6] via-[#1348A8] to-[#0F3A8A]',
          button: 'hover:shadow-xl transition-all',
          buttonStyle: { background: 'linear-gradient(to right, #185CD6, #1348A8)' },
          buttonHover: { background: 'linear-gradient(to right, #1348A8, #0F3A8A)' },
          iconBg: 'bg-[#185CD6]/10',
          iconColor: 'text-[#185CD6]',
          border: 'border-[#185CD6]'
        };
      default:
        return {
          gradient: 'from-[#185CD6] via-[#1348A8] to-[#0F3A8A]',
          button: 'hover:shadow-xl transition-all',
          buttonStyle: { background: 'linear-gradient(to right, #185CD6, #1348A8)' },
          buttonHover: { background: 'linear-gradient(to right, #1348A8, #0F3A8A)' },
          iconBg: 'bg-[#185CD6]/10',
          iconColor: 'text-[#185CD6]',
          border: 'border-[#185CD6]'
        };
    }
  };

  const colors = getColors();

  // Icônes selon le type
  const getIcon = () => {
    const iconClass = colors.iconColor;
    const iconSize = type === 'create' ? 52 : 48;
    
    switch (type) {
      case 'create':
        return <CheckCircle className={`${iconClass} animate-pulse`} size={iconSize} strokeWidth={2.5} />;
      case 'success':
        return <CheckCircle className={iconClass} size={iconSize} />;
      case 'error':
        return <AlertCircle className={iconClass} size={iconSize} />;
      case 'warning':
        return <AlertTriangle className={iconClass} size={iconSize} />;
      case 'info':
        return <Info className={iconClass} size={iconSize} />;
      default:
        return <AlertTriangle className={iconClass} size={iconSize} />;
    }
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  // Style spécial pour les erreurs (thème sombre comme l'image)
  if (type === 'error') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fadeIn">
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        ></div>

        {/* Modal sombre pour erreur */}
        <div className="relative w-full max-w-md mx-4 animate-slideInUp">
          <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
            {/* Header sombre avec icône rouge */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-4">
                {/* Icône rouge X */}
                <div className="flex-shrink-0">
                  <AlertCircle 
                    size={32} 
                    className="text-red-500"
                    style={{ color: '#ef4444' }}
                  />
                </div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
              </div>
            </div>

            {/* Corps sombre avec message blanc */}
            <div className="p-6">
              <div className="space-y-2">
                {message.split('\n').filter(line => line.trim()).map((line, index) => (
                  <p 
                    key={index} 
                    className="text-white font-medium text-base leading-relaxed"
                  >
                    {line.trim()}
                  </p>
                ))}
              </div>
            </div>

            {/* Footer avec bouton bleu OK */}
            <div className="p-6 pt-4 border-t border-gray-700">
              <div className="flex justify-end">
                <button
                  onClick={handleConfirm}
                  className="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg transition-all duration-200 border border-blue-600"
                  style={{ 
                    background: '#3b82f6',
                    borderColor: '#2563eb'
                  }}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Style normal pour les autres types
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fadeIn">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={showCancel ? onClose : undefined}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 animate-slideInUp">
        <div className="bg-white rounded-3xl shadow-pro-2xl border-2 border-gray-200 overflow-hidden">
          {/* Header bleu (style comme l'image) */}
          <div className="bg-[#185CD6] p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icône d'alerte avec couleur #C4C4C4 */}
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <AlertTriangle 
                  size={48} 
                  style={{ color: '#C4C4C4' }}
                />
              </div>
              {/* Titre en blanc */}
              <h2 className="text-2xl font-black text-white">{title}</h2>
            </div>
          </div>

          {/* Corps blanc avec message */}
          <div className="bg-white p-8">
            <div className="text-center space-y-3">
              {message.split('\n').filter(line => line.trim()).map((line, index) => (
                <p 
                  key={index} 
                  className="text-gray-800 font-medium text-base leading-relaxed"
                >
                  {line.trim()}
                </p>
              ))}
            </div>
          </div>

          {/* Footer avec boutons */}
          <div className="bg-white px-6 pb-6">
            <div className={`flex ${showCancel ? 'gap-3' : ''}`}>
              {showCancel && (
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className="flex-1 px-6 py-3 bg-[#185CD6] hover:bg-[#1348A8] text-white font-bold rounded-xl shadow-lg transition-all duration-200"
                style={{ background: '#185CD6' }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmation;

