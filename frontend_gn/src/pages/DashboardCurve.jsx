import React, { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import api from '../services/api'

const DashboardCurve = () => {
  const [chartData, setChartData] = useState({ months: [], counts: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/statistics/monthly-curve/')
        setChartData(response.data.data)
      } catch (err) {
        console.error('Erreur courbe mensuelle:', err.response?.data || err.message)
        setError(
          err.response?.data?.detail ||
            err.response?.data?.message ||
            "Impossible de charger la courbe mensuelle."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="p-6 bg-white rounded-2xl shadow">Chargement des statistiques...</div>
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Évolution mensuelle des dossiers</h2>
      <Plot
        data={[
          {
            x: chartData.months,
            y: chartData.counts,
            type: 'scatter',
            mode: 'lines+markers',
            marker: { color: '#0f52ba' },
          },
        ]}
        layout={{
          template: 'plotly_white',
          height: 420,
          margin: { l: 40, r: 20, t: 40, b: 40 },
          xaxis: { title: 'Mois' },
          yaxis: { title: 'Nombre de cas' },
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%' }}
      />
    </div>
  )
}

export default DashboardCurve

