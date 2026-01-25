import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Printer, Mail, Save, Loader2 } from 'lucide-react';

const ReportExportButtons = ({ reportData, reportConfig }) => {
  const [chargement, setChargement] = useState(null);

  const handleExportPDF = async () => {
    setChargement('pdf');
    try {
      // Simuler l'export PDF
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // En production, appeler l'API backend
      // const response = await fetch('/api/reports/export/pdf', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      //   body: JSON.stringify({ reportData, reportConfig }),
      // });
      
      console.log('Export PDF:', reportData, reportConfig);
      alert('Rapport PDF téléchargé avec succès !');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert('Erreur lors de l\'export PDF');
    } finally {
      setChargement(null);
    }
  };

  const handleExportExcel = async () => {
    setChargement('excel');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Export Excel:', reportData, reportConfig);
      alert('Rapport Excel téléchargé avec succès !');
    } catch (error) {
      console.error('Erreur export Excel:', error);
      alert('Erreur lors de l\'export Excel');
    } finally {
      setChargement(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    setChargement('email');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const email = prompt('Entrez l\'adresse email du destinataire:');
      if (email) {
        console.log('Envoi email à:', email);
        alert(`Rapport envoyé à ${email} avec succès !`);
      }
    } catch (error) {
      console.error('Erreur envoi email:', error);
      alert('Erreur lors de l\'envoi par email');
    } finally {
      setChargement(null);
    }
  };

  const handleSaveHistory = async () => {
    setChargement('save');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Sauvegarde historique:', reportData, reportConfig);
      alert('Rapport sauvegardé dans l\'historique !');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setChargement(null);
    }
  };

  const boutons = [
    {
      id: 'pdf',
      label: 'Exporter PDF',
      icon: FileText,
      action: handleExportPDF,
      gradient: 'from-red-500 to-red-600',
      hoverGradient: 'hover:from-red-600 hover:to-red-700',
    },
    {
      id: 'excel',
      label: 'Exporter Excel',
      icon: FileSpreadsheet,
      action: handleExportExcel,
      gradient: 'from-green-500 to-green-600',
      hoverGradient: 'hover:from-green-600 hover:to-green-700',
    },
    {
      id: 'print',
      label: 'Imprimer',
      icon: Printer,
      action: handlePrint,
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'hover:from-blue-600 hover:to-blue-700',
    },
    {
      id: 'email',
      label: 'Envoyer par email',
      icon: Mail,
      action: handleSendEmail,
      gradient: 'from-purple-500 to-purple-600',
      hoverGradient: 'hover:from-purple-600 hover:to-purple-700',
    },
    {
      id: 'save',
      label: 'Sauvegarder',
      icon: Save,
      action: handleSaveHistory,
      gradient: 'from-cyan-500 to-cyan-600',
      hoverGradient: 'hover:from-cyan-600 hover:to-cyan-700',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 overflow-hidden">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5">
        <div className="flex items-center">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl mr-4">
            <Download className="text-white" size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Options d'export</h3>
            <p className="text-emerald-100 mt-1">Exportez votre rapport dans le format de votre choix</p>
          </div>
        </div>
      </div>

      {/* Boutons */}
      <div className="p-6 bg-gradient-to-br from-gray-50 to-emerald-50">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {boutons.map((bouton) => {
            const Icone = bouton.icon;
            const estChargement = chargement === bouton.id;
            
            return (
              <button
                key={bouton.id}
                onClick={bouton.action}
                disabled={estChargement || chargement !== null}
                className={`relative group bg-gradient-to-br ${bouton.gradient} ${bouton.hoverGradient} text-white rounded-2xl p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                <div className="flex flex-col items-center space-y-3">
                  {estChargement ? (
                    <Loader2 className="w-12 h-12 animate-spin text-white" size={24} />
                  ) : (
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:bg-white/30 transition-all">
                      <Icone size={24} />
                    </div>
                  )}
                  
                  <span className="text-sm font-bold text-center">
                    {estChargement ? 'Chargement...' : bouton.label}
                  </span>
                </div>

                {/* Effet de brillance au survol */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity"></div>
              </button>
            );
          })}
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-6 bg-white rounded-xl p-4 border-2 border-emerald-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FileText className="text-emerald-600" size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 mb-2">À propos des exports</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>PDF</strong>: Format idéal pour l'archivage et le partage</li>
                <li>• <strong>Excel</strong>: Permet l'analyse et la manipulation des données</li>
                <li>• <strong>Impression</strong>: Génère une version optimisée pour l'impression</li>
                <li>• <strong>Email</strong>: Envoi direct à un destinataire</li>
                <li>• <strong>Sauvegarde</strong>: Conserve le rapport dans l'historique</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExportButtons;

