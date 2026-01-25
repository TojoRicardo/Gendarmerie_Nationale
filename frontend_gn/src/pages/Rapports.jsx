/**
 * Page principale des rapports
 * Affiche la liste des rapports et permet la génération de nouveaux rapports
 */

import React from 'react';
import ReportDashboard from '../components/ReportDashboard';

const Rapports = () => {

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Rapports</h1>
        <p className="text-gray-600 mt-1">Gestion et génération de rapports professionnels</p>
      </div>

      {/* Section génération */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <ReportDashboard />
        </div>
      </div>
    </div>
  );
};

export default Rapports;

