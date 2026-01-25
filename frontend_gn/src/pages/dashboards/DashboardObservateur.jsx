import { ShieldOff, AlertTriangle, Eye, FileText, Check, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const DashboardObservateur = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-6">
      <div className="max-w-2xl w-full">
        {/* Carte d'accès refusé */}
        <div className="bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden animate-fadeIn">
          {/* Header avec icône */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
              <ShieldOff size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Accès Refusé
            </h1>
            <p className="text-orange-50 text-lg">
              Vous n'avez pas l'autorisation d'accéder à cette page
            </p>
          </div>

          {/* Contenu */}
          <div className="p-8 space-y-6">
            {/* Message détaillé */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <AlertTriangle className="text-orange-600 flex-shrink-0 mt-1" size={24} />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-2">
                    Accès Magistrat - Lecture Seule
                  </h3>
                  <p className="text-orange-700 text-sm leading-relaxed">
                    En tant qu'<strong>Observateur Externe</strong>, vous avez un accès limité au système.
                    Vous pouvez uniquement consulter les enquêtes clôturées et les rapports validés.
                  </p>
                </div>
              </div>
            </div>

            {/* Informations sur les accès autorisés */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Accès Autorisés
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <Check size={16} className="text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Consulter les <strong>enquêtes clôturées uniquement</strong></span>
                </li>
                <li className="flex items-start">
                  <Check size={16} className="text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Voir les <strong>rapports validés</strong></span>
                </li>
                <li className="flex items-start">
                  <Check size={16} className="text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Exporter les documents en <strong>PDF</strong></span>
                </li>
              </ul>
            </div>

            {/* Informations sur les restrictions */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h4 className="font-semibold text-red-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Accès Interdits
              </h4>
              <ul className="space-y-2 text-sm text-red-800">
                <li className="flex items-start">
                  <X size={16} className="text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Consulter les <strong>enquêtes en cours</strong></span>
                </li>
                <li className="flex items-start">
                  <X size={16} className="text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Modifier ou créer des <strong>fiches criminelles</strong></span>
                </li>
                <li className="flex items-start">
                  <X size={16} className="text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Gérer les <strong>utilisateurs ou permissions</strong></span>
                </li>
                <li className="flex items-start">
                  <X size={16} className="text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Accéder aux <strong>données biométriques</strong></span>
                </li>
              </ul>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => window.history.back()}
                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Retour</span>
              </button>
              <button
                onClick={() => navigate('/fiches-criminelles')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-lg text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Eye size={20} />
                <span>Enquêtes Clôturées</span>
              </button>
              <button
                onClick={() => navigate('/rapports')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gendarme-blue to-gendarme-blue-light hover:shadow-lg text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <FileText size={20} />
                <span>Rapports</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Gendarmerie Nationale Malagasy - Système de Gestion des Informations Criminelles</p>
          <p className="text-xs mt-1 text-gray-400">Accès Magistrat - Niveau Consultation Restreint</p>
        </div>
      </div>
    </div>
  )
}

export default DashboardObservateur
