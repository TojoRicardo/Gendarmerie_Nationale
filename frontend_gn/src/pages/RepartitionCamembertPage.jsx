import React from 'react'
import RepartitionCamembert from '../../components/rapports/RepartitionCamembert'

const RepartitionCamembertPage = () => {
  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Répartition géographique (Camembert)
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Visualisation dédiée de la part des cas par province.
            </p>
          </div>
        </header>

        <RepartitionCamembert />
      </div>
    </main>
  )
}

export default RepartitionCamembertPage


