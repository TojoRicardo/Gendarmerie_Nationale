import React, { useEffect, useState } from 'react'
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { PieChart } from 'lucide-react'
import { getGeographicStats } from '../../src/services/statsService'

const PROVINCES_MADAGASCAR = [
  'Antananarivo',
  'Toamasina',
  'Antsiranana',
  'Mahajanga',
  'Fianarantsoa',
  'Toliara',
]

const PIE_COLORS = ['#0F52BA', '#2563EB', '#1D4ED8', '#0EA5E9', '#38BDF8', '#93C5FD']

const formatNumber = (value, options = {}) => {
  const formatter = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 1,
    ...options,
  })
  return formatter.format(value ?? 0)
}

const RepartitionCamembert = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const stats = await getGeographicStats()

        const statsMap = new Map()

        if (Array.isArray(stats)) {
          stats.forEach((item) => {
            const provinceName = (item.province || item.ville || item.city || item.location || '').trim()
            if (provinceName) {
              const raw = Number(
                item.nombre_de_cas ||
                  item.cas ||
                  item.count ||
                  item.cases ||
                  item.value ||
                  0,
              )
              const cas = Number.isFinite(raw) ? Math.max(0, raw) : 0
              statsMap.set(provinceName, cas)
            }
          })
        }

        const formatted = PROVINCES_MADAGASCAR.map((province) => ({
          ville: province,
          cas: statsMap.get(province) || 0,
        }))

        setData(formatted)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalCas = data.reduce((sum, r) => sum + r.cas, 0)

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-gendarme-blue to-gendarme-blue-dark text-white">
            <PieChart size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Répartition % par province</h3>
            <p className="text-xs text-gray-500">
              Camembert dédié, basé sur les fiches criminelles actives
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total cas</p>
          <p className="text-xl font-extrabold text-gendarme-blue">{formatNumber(totalCas)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-72 text-gray-500">
          Chargement des données...
        </div>
      ) : totalCas === 0 ? (
        <div className="flex items-center justify-center h-72 text-gray-500">
          Aucune donnée disponible pour la répartition géographique.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 items-center">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={data}
                  dataKey="cas"
                  nameKey="ville"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={3}
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} • ${formatNumber(percent * 100, { maximumFractionDigits: 1 })}%`
                  }
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.ville}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${formatNumber(value)} cas`, name]}
                  contentStyle={{ borderRadius: 12, borderColor: '#e0e7ff' }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {data.map((item, idx) => {
              const pourcentage = totalCas > 0 ? (item.cas / totalCas) * 100 : 0
              return (
                <div
                  key={item.ville}
                  className="flex items-center justify-between text-xs font-semibold text-gray-600"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    {item.ville}
                  </span>
                  <span>{formatNumber(pourcentage, { maximumFractionDigits: 1 })}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default RepartitionCamembert


