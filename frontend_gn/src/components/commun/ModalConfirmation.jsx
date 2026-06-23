import { AlertTriangle, AlertCircle } from 'lucide-react';

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
