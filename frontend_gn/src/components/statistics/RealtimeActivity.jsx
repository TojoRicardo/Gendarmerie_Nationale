import React, { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import api from '../../services/api'

const RealtimeActivity = () => {
  const [data, setData] = useState({ total_24h: 0, hourly: { labels: [], values: [] } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/statistics/realtime-activity/')
        setData(response.data.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Erreur chargement activité temps réel.')
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
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Nouveaux cas (24h)</p>
          <p className="text-3xl font-bold text-gray-900">{data.total_24h}</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
          Temps réel
        </span>
      </div>
      <Plot
        data={[
          {
            x: data.hourly.labels,
            y: data.hourly.values,
            type: 'scatter',
            mode: 'lines+markers',
            marker: { color: '#10b981' },
          },
        ]}
        layout={{
          template: 'plotly_white',
          height: 250,
          margin: { l: 30, r: 10, t: 20, b: 30 },
          xaxis: { title: 'Heure' },
          yaxis: { title: 'Cas', rangemode: 'tozero' },
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%' }}
      />
    </div>
  )
}

export default RealtimeActivity

