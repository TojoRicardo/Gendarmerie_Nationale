import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  BarChart3, TrendingUp, TrendingDown, Brain, FileText, 
  Activity, PieChart, LineChart, Download, Filter,
  AlertTriangle, CheckCircle, Clock, Target
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell,
  LineChart as RechartsLineChart, Line,
  ResponsiveContainer
} from 'recharts'
import AnalysteInsights from '../../components/analyste/AnalysteInsights'
import { getInvestigationStats } from '../../services/investigationService'

const DashboardAnalyste = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true)
        const data = await getInvestigationStats()
        setStats(data)
        console.log('Données statistiques chargées avec succès')
      } catch (err) {
        console.error('Erreur chargement statistiques:', err)
        setError('Erreur lors du chargement des statistiques')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  // Données pour les graphiques
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
    value: value,
    color: key === 'low' ? '#10B981' :
           key === 'medium' ? '#F59E0B' :
           key === 'high' ? '#EF4444' :
           key === 'critical' ? '#7C3AED' : '#6B7280'
  })) : []

  // Données simulées pour les tendances
  const monthlyTrend = [
    { month: 'Jan', cases: 45, resolved: 38 },
    { month: 'Fév', cases: 52, resolved: 44 },
    { month: 'Mar', cases: 61, resolved: 53 },
    { month: 'Avr', cases: 58, resolved: 51 },
    { month: 'Mai', cases: 73, resolved: 65 },
    { month: 'Jun', cases: 68, resolved: 61 }
  ]

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <div className="flex items-center space-x-3 mb-3">
            <AlertTriangle className="text-red-600" size={24} />
            <h3 className="font-bold text-red-900">Erreur</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <Brain className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Dashboard Analyste
                </h1>
                <p className="text-gray-600 mt-1">
                  Analyse de données et rapports statistiques
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/rapports')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
              >
                <FileText size={20} />
                <span>Rapports</span>
              </button>
              <button
                onClick={() => navigate('/intelligence-artificielle')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                <Brain size={20} />
                <span>IA Prédictive</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="text-blue-600" size={24} />
              </div>
              <TrendingUp className="text-green-500" size={20} />
            </div>
            <p className="text-gray-600 text-sm mb-1">Total Fiches</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.total_investigations || 0}</p>
            <p className="text-xs text-green-600 mt-2">+12% ce mois</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6 border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <TrendingUp className="text-green-500" size={20} />
            </div>
            <p className="text-gray-600 text-sm mb-1">Résolues</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.closed_investigations || 0}</p>
            <p className="text-xs text-green-600 mt-2">+8% ce mois</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6 border border-orange-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Activity className="text-orange-600" size={24} />
              </div>
              <TrendingDown className="text-orange-500" size={20} />
            </div>
            <p className="text-gray-600 text-sm mb-1">En cours</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.active_investigations || 0}</p>
            <p className="text-xs text-orange-600 mt-2">-3% ce mois</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Target className="text-purple-600" size={24} />
              </div>
              <TrendingUp className="text-green-500" size={20} />
            </div>
            <p className="text-gray-600 text-sm mb-1">Taux de résolution</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.total_investigations > 0 
                ? Math.round((stats?.closed_investigations / stats?.total_investigations) * 100) 
                : 0}%
            </p>
            <p className="text-xs text-green-600 mt-2">+5% ce mois</p>
          </div>
        </div>

        {/* Insights et Recommandations */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
          <AnalysteInsights stats={stats} />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique par statut */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Répartition par Statut</h3>
                <p className="text-sm text-gray-600">Distribution des enquêtes actives</p>
              </div>
              <PieChart className="text-blue-600" size={24} />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique par priorité */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Répartition par Priorité</h3>
                <p className="text-sm text-gray-600">Niveau d'urgence des cas</p>
              </div>
              <BarChart3 className="text-purple-600" size={24} />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tendance mensuelle */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-indigo-100 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tendance Mensuelle</h3>
                <p className="text-sm text-gray-600">Évolution des cas sur les 6 derniers mois</p>
              </div>
              <LineChart className="text-indigo-600" size={24} />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cases" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  name="Nouveaux cas"
                  dot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="resolved" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Cas résolus"
                  dot={{ r: 5 }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
          <h3 className="text-xl font-bold mb-4">Actions Rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/rapports')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-4 text-left transition-all border border-white/20"
            >
              <FileText size={24} className="mb-2" />
              <p className="font-semibold">Générer un rapport</p>
              <p className="text-sm text-purple-100 mt-1">Créer des rapports détaillés</p>
            </button>
            <button
              onClick={() => navigate('/intelligence-artificielle')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-4 text-left transition-all border border-white/20"
            >
              <Brain size={24} className="mb-2" />
              <p className="font-semibold">Analyse IA</p>
              <p className="text-sm text-purple-100 mt-1">Prédictions et tendances</p>
            </button>
            <button
              onClick={() => navigate('/fiches-criminelles')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-4 text-left transition-all border border-white/20"
            >
              <Activity size={24} className="mb-2" />
              <p className="font-semibold">Consulter les fiches</p>
              <p className="text-sm text-purple-100 mt-1">Vue d'ensemble des cas</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardAnalyste
