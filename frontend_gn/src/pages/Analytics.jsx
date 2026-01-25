import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInvestigationStats } from '../services/investigationService'
import { 
  BarChart3, 
  TrendingUp, 
  ArrowLeft, 
  PieChart,
  Activity,
  Users,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts'

const Analytics = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await getInvestigationStats()
        setStats(data)
        console.log(" Statistical data successfully fetched and visualized.")
      } catch (error) {
        console.error('Erreur chargement analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  // Données pour les graphiques (simulées)
  const statusData = stats?.investigations_by_status ? Object.entries(stats.investigations_by_status).map(([key, value]) => ({
    name: key === 'in_progress' ? 'En cours' : 
          key === 'closed' ? 'Clôturées' :
          key === 'draft' ? 'Brouillons' :
          key === 'awaiting_report' ? 'En attente' :
          key === 'under_analysis' ? 'En analyse' :
          key === 'suspended' ? 'Suspendues' : key,
    value: value
  })) : []

  const priorityData = stats?.investigations_by_priority ? Object.entries(stats.investigations_by_priority).map(([key, value]) => ({
    name: key === 'low' ? 'Faible' : 
          key === 'medium' ? 'Moyenne' :
          key === 'high' ? 'Élevée' :
          key === 'critical' ? 'Critique' : key,
    value: value
  })) : []

  // Données simulées pour les tendances mensuelles
  const monthlyTrendData = [
    { month: 'Jan', ouvertes: 12, fermees: 8 },
    { month: 'Fév', ouvertes: 15, fermees: 12 },
    { month: 'Mar', ouvertes: 18, fermees: 15 },
    { month: 'Avr', ouvertes: 22, fermees: 18 },
    { month: 'Mai', ouvertes: 25, fermees: 22 },
    { month: 'Jun', ouvertes: 28, fermees: 25 }
  ]

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Tableaux de bord analytiques
                </h1>
                <p className="text-gray-600">
                  Analyses statistiques et tendances des enquêtes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Métriques principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Enquêtes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.total_investigations || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        En cours
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.investigations_by_status?.in_progress || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Clôturées
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.investigations_by_status?.closed || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Critiques
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats?.investigations_by_priority?.critical || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Graphique en barres - Statuts */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Répartition par statut
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique en secteurs - Priorités */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Répartition par priorité
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tendance mensuelle */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Tendance mensuelle des enquêtes
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ouvertes" stroke="#3B82F6" name="Enquêtes ouvertes" />
                <Line type="monotone" dataKey="fermees" stroke="#10B981" name="Enquêtes fermées" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Analyses avancées */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Performance des enquêteurs */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <Users className="inline h-5 w-5 mr-2" />
                Performance des enquêteurs
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Insp. Dupont</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: '85%'}}></div>
                    </div>
                    <span className="text-sm font-medium">85%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Insp. Martin</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{width: '92%'}}></div>
                    </div>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Insp. Bernard</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{width: '67%'}}></div>
                    </div>
                    <span className="text-sm font-medium">67%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Types de crimes les plus fréquents */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <Activity className="inline h-5 w-5 mr-2" />
                Types de crimes
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Vol</span>
                  <span className="text-sm font-medium">35%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Agression</span>
                  <span className="text-sm font-medium">28%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fraude</span>
                  <span className="text-sm font-medium">20%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Trafic</span>
                  <span className="text-sm font-medium">17%</span>
                </div>
              </div>
            </div>

            {/* Temps de résolution moyen */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <TrendingUp className="inline h-5 w-5 mr-2" />
                Temps de résolution
              </h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  15.2
                </div>
                <div className="text-sm text-gray-600">
                  jours en moyenne
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Vol simple</span>
                    <span className="font-medium">8 jours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Agression</span>
                    <span className="font-medium">22 jours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fraude complexe</span>
                    <span className="font-medium">45 jours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
