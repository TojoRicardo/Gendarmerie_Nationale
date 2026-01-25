import React, { useState, useMemo } from 'react';
import { FileText, Brain, TrendingUp, BarChart3, Download, X } from 'lucide-react';
import { generateAnalysisReport, formatAnalysisReport } from '../../src/services/auditAnalysisReportService';
import { downloadAuditAnalysisPDF } from '../../src/utils/pdfGenerator';

/**
 * Composant pour générer et afficher un rapport d'analyse professionnel
 * "Résultats et Analyse" au format académique
 */
const AnalyseRapport = ({ entries = [], onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Générer le rapport d'analyse
  const analysisReport = useMemo(() => {
    if (!entries || entries.length === 0) {
      return null;
    }
    
    const analysisData = generateAnalysisReport(entries, 'audit');
    return formatAnalysisReport(analysisData, 'Résultats et Analyse');
  }, [entries]);

  const handleDownload = () => {
    if (!analysisReport) return;

    try {
      setIsGenerating(true);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `rapport_analyse_audit_${dateStr}.pdf`;
      
      downloadAuditAnalysisPDF(analysisReport, entries.length, entries, filename);
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
      // Fallback vers le format texte en cas d'erreur
      const content = `
RAPPORT D'ANALYSE PROFESSIONNEL
${'='.repeat(50)}

${analysisReport.title}
${'-'.repeat(50)}

1. PRÉSENTATION DES DONNÉES
${'-'.repeat(50)}
${analysisReport.sections['Présentation des données']}

2. ANALYSE
${'-'.repeat(50)}
${analysisReport.sections['Analyse']}

3. INTERPRÉTATION
${'-'.repeat(50)}
${analysisReport.sections['Interprétation']}

4. CONCLUSION PARTIELLE
${'-'.repeat(50)}
${analysisReport.sections['Conclusion partielle']}

${'='.repeat(50)}
Généré le ${new Date().toLocaleString('fr-FR')}
Nombre d'événements analysés: ${entries.length}
`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport_analyse_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!analysisReport) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="text-center py-8">
          <Brain className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">Aucune donnée disponible pour générer l'analyse.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xl border-2 border-indigo-200 p-6 max-h-[90vh] overflow-y-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
            <FileText className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{analysisReport.title}</h2>
            <p className="text-sm text-gray-500">
              {entries.length} événement{entries.length > 1 ? 's' : ''} analysé{entries.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            title="Télécharger le rapport en PDF"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Génération...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span className="text-sm font-medium hidden md:inline">PDF</span>
              </>
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Fermer"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Sections du rapport */}
      <div className="space-y-6">
        {/* 1. Présentation des données */}
        <section className="border-b border-gray-200 pb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 rounded-md bg-blue-100">
              <BarChart3 className="text-blue-600" size={18} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">1. Présentation des données</h3>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {analysisReport.sections['Présentation des données']}
            </p>
          </div>
        </section>

        {/* 2. Analyse */}
        <section className="border-b border-gray-200 pb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 rounded-md bg-indigo-100">
              <TrendingUp className="text-indigo-600" size={18} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">2. Analyse</h3>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {analysisReport.sections['Analyse']}
            </p>
          </div>
        </section>

        {/* 3. Interprétation */}
        <section className="border-b border-gray-200 pb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 rounded-md bg-purple-100">
              <Brain className="text-purple-600" size={18} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">3. Interprétation</h3>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {analysisReport.sections['Interprétation']}
            </p>
          </div>
        </section>

        {/* 4. Conclusion partielle */}
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-1.5 rounded-md bg-green-100">
              <FileText className="text-green-600" size={18} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">4. Conclusion partielle</h3>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {analysisReport.sections['Conclusion partielle']}
            </p>
          </div>
        </section>
      </div>

      {/* Pied de page */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
        Rapport généré automatiquement le {new Date().toLocaleString('fr-FR')}
      </div>
    </div>
  );
};

export default AnalyseRapport;

