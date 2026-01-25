import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const NotificationToast = ({ 
  type = 'info', 
  message, 
  titre,
  duree = 5000, 
  onClose 
}) => {
  const configs = {
    create: {
      icon: CheckCircle,
      bgGradient: 'linear-gradient(135deg, #C0F6E3 0%, #A8F0D5 100%)',
      borderColor: 'border-[#C0F6E3]',
      iconColor: 'text-emerald-700',
      textColor: 'text-emerald-900',
      customStyle: {
        background: 'linear-gradient(135deg, #C0F6E3 0%, #A8F0D5 100%)',
        borderLeft: '4px solid #10B981',
      }
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      iconColor: 'text-green-500',
      textColor: 'text-green-800',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      iconColor: 'text-red-500',
      textColor: 'text-red-800',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      iconColor: '',
      textColor: 'text-yellow-800',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-800',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  useEffect(() => {
    if (duree && duree > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duree);

      return () => clearTimeout(timer);
    }
  }, [duree, onClose]);

  return (
    <div
      className={`
        ${config.bgColor || ''} ${config.borderColor}
        border-l-4 p-5 rounded-xl shadow-xl hover:shadow-2xl
        min-w-[360px] max-w-md
        animate-slide-in transition-all duration-300
      `}
      style={config.customStyle || {}}
    >
      <div className="flex items-start space-x-3">
        <div className={`${config.iconColor} mt-0.5 p-2.5 rounded-xl bg-white/60 shadow-md`}>
          <Icon 
            size={24} 
            style={type === 'warning' ? { color: '#C4C4C4' } : {}}
          />
        </div>
        
        <div className="flex-1">
          {titre && (
            <h3 className={`${config.textColor} font-black text-base mb-1.5`}>
              {titre}
            </h3>
          )}
          <p className={`${config.textColor} text-sm leading-relaxed font-medium ${titre ? '' : 'font-semibold'}`}>
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          className={`${config.iconColor} hover:bg-white/60 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 active:scale-95`}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

// Container pour gérer plusieurs toasts
export const ToastContainer = ({ toasts = [], onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          {...toast}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

export default NotificationToast;

