import React, { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import api from '../../services/api'

const MonthlyEvolution = () => {
  const [data, setData] = useState({ labels: [], values: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/statistics/monthly-evolution/')
        setData(response.data.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Erreur chargement évolution mensuelle.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="p-4 bg-white rounded-xl shadow">Chargement...</div>
  }

  if (error) {
    return <div className="p-4 bg-white rounded-xl shadow text-red-600">{error}</div>
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Évolution mensuelle</h3>
      <Plot
        data={[
          {
            x: data.labels,
            y: data.values,
            type: 'scatter',
            mode: 'lines+markers',
            marker: { color: '#0f52ba' },
          },
        ]}
        layout={{
          template: 'plotly_white',
          height: 360,
          margin: { l: 40, r: 20, t: 40, b: 40 },
          xaxis: { title: 'Mois' },
          yaxis: { title: 'Nombre de cas', rangemode: 'tozero' },
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%' }}
      />
    </div>
  )
}

export default MonthlyEvolution

