import React, { useState, useEffect } from 'react'
import {
  TrendingUp, Activity, MapPin, Zap, Loader2, AlertCircle,
  BarChart3, RefreshCw, Calendar, Globe
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import {
  getIAStatistiques,
  getIAEvolution,
  getIALocalisations,
  getIATempsReel
} from '../../../src/services/iaService'

const GraphiquesAvancesIA = () => {
  // États pour les données
  const [statistiques, setStatistiques] = useState(null)
  const [evolution, setEvolution] = useState([])
  const [localisations, setLocalisations] = useState([])
  const [tempsReel, setTempsReel] = useState(null)
  
  // États de chargement
  const [loadingStatistiques, setLoadingStatistiques] = useState(true)
  const [loadingEvolution, setLoadingEvolution] = useState(true)
  const [loadingLocalisations, setLoadingLocalisations] = useState(true)
  const [loadingTempsReel, setLoadingTempsReel] = useState(true)
  
  // États d'erreur
  const [errorStatistiques, setErrorStatistiques] = useState(null)
  const [errorEvolution, setErrorEvolution] = useState(null)
  const [errorLocalisations, setErrorLocalisations] = useState(null)
  const [errorTempsReel, setErrorTempsReel] = useState(null)
  
  // Paramètres
  const [periodeEvolution, setPeriodeEvolution] = useState('30j')
  const [joursStatistiques, setJoursStatistiques] = useState(30)
  
  // Couleurs pour les graphiques
  const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#06B6D4',
    gradientStart: '#60A5FA',
    gradientEnd: '#3B82F6'
  }

  // Récupérer les statistiques générales
  useEffect(() => {
    const fetchStatistiques = async () => {
      try {
        setLoadingStatistiques(true)
        setErrorStatistiques(null)
        const data = await getIAStatistiques(joursStatistiques)
        if (data.success) {
          setStatistiques(data)
        } else {
          setErrorStatistiques(data.error || 'Erreur lors de la récupération des statistiques')
        }
      } catch (error) {
        console.error('Erreur statistiques IA:', error)
        setErrorStatistiques('Impossible de récupérer les statistiques')
      } finally {
        setLoadingStatistiques(false)
      }
    }
    
    fetchStatistiques()
    // Actualisation toutes les 30 secondes
    const interval = setInterval(fetchStatistiques, 30000)
    return () => clearInterval(interval)
  }, [joursStatistiques])

  // Récupérer l'évolution
  useEffect(() => {
    const fetchEvolution = async () => {
      try {
        setLoadingEvolution(true)
        setErrorEvolution(null)
        const data = await getIAEvolution(periodeEvolution)
        if (data.success) {
          setEvolution(data.donnees || [])
        } else {
          setErrorEvolution(data.error || 'Erreur lors de la récupération de l\'évolution')
        }
      } catch (error) {
        console.error('Erreur évolution IA:', error)
        setErrorEvolution('Impossible de récupérer l\'évolution')
      } finally {
        setLoadingEvolution(false)
      }
    }
    
    fetchEvolution()
    // Actualisation toutes les 30 secondes
    const interval = setInterval(fetchEvolution, 30000)
    return () => clearInterval(interval)
  }, [periodeEvolution])

  // Récupérer les localisations
  useEffect(() => {
    const fetchLocalisations = async () => {
      try {
        setLoadingLocalisations(true)
        setErrorLocalisations(null)
        const data = await getIALocalisations()
        if (data.success) {
          setLocalisations(data.localisations || [])
        } else {
          setErrorLocalisations(data.error || 'Erreur lors de la récupération des localisations')
        }
      } catch (error) {
        console.error('Erreur localisations IA:', error)
        setErrorLocalisations('Impossible de récupérer les localisations')
      } finally {
        setLoadingLocalisations(false)
      }
    }
    
    fetchLocalisations()
    // Actualisation toutes les 30 secondes
    const interval = setInterval(fetchLocalisations, 30000)
    return () => clearInterval(interval)
  }, [])

  // Récupérer les données en temps réel
  useEffect(() => {
    const fetchTempsReel = async () => {
      try {
        setLoadingTempsReel(true)
        setErrorTempsReel(null)
        const data = await getIATempsReel()
        if (data.success) {
          setTempsReel(data)
        } else {
          setErrorTempsReel(data.error || 'Erreur lors de la récupération des données temps réel')
        }
      } catch (error) {
        console.error('Erreur temps réel IA:', error)
        setErrorTempsReel('Impossible de récupérer les données temps réel')
      } finally {
        setLoadingTempsReel(false)
      }
    }
    
    fetchTempsReel()
    // Actualisation toutes les 15 secondes
    const interval = setInterval(fetchTempsReel, 15000)
    return () => clearInterval(interval)
  }, [])

  // Fonction pour formater les dates
  const formaterDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Activity className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Graphiques Avancés — Visualisations interactives et analyses en temps réel
                </h1>
                <p className="text-gray-400 mt-1">
                  Tableau de bord IA complet avec données en temps réel depuis PostgreSQL
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-900/50 border border-green-500/30 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-green-300">Données en temps réel</span>
            </div>
          </div>
        </div>

        {/* 1. Vue d'ensemble */}
        <div className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <TrendingUp className="mr-3 text-blue-400" size={28} />
              Vue d'ensemble
            </h2>
            <div className="flex items-center space-x-3">
              <select
                value={joursStatistiques}
                onChange={(e) => setJoursStatistiques(Number(e.target.value))}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>7 jours</option>
                <option value={30}>30 jours</option>
                <option value={90}>3 mois</option>
                <option value={365}>1 an</option>
              </select>
              <button
                onClick={() => window.location.reload()}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {loadingStatistiques ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-blue-400" size={48} />
              <span className="ml-3 text-gray-400">Chargement des données...</span>
            </div>
          ) : errorStatistiques ? (
            <div className="flex items-center justify-center h-64 bg-red-900/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="text-red-400 mr-3" size={32} />
              <span className="text-red-300">{errorStatistiques}</span>
            </div>
          ) : statistiques && statistiques.evolution ? (
            <div className="space-y-6">
              {/* Statistiques globales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Reconnaissances</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {statistiques.statistiques?.total_reconnaissances || 0}
                      </p>
                    </div>
                    <Activity className="text-blue-400" size={32} />
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Réussies</p>
                      <p className="text-2xl font-bold text-green-400 mt-1">
                        {statistiques.statistiques?.reussies || 0}
                      </p>
                    </div>
                    <TrendingUp className="text-green-400" size={32} />
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Taux de Réussite</p>
                      <p className="text-2xl font-bold text-blue-400 mt-1">
                        {statistiques.statistiques?.taux_reussite || 0}%
                      </p>
                    </div>
                    <BarChart3 className="text-blue-400" size={32} />
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Score Moyen</p>
                      <p className="text-2xl font-bold text-purple-400 mt-1">
                        {statistiques.statistiques?.score_confiance_moyen || 0}%
                      </p>
                    </div>
                    <Activity className="text-purple-400" size={32} />
                  </div>
                </div>
              </div>

              {/* Graphique en courbe */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Évolution du nombre de criminels détectés par l'IA
                </h3>
                {statistiques.evolution && statistiques.evolution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={statistiques.evolution}>
                      <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={COLORS.gradientStart} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={COLORS.gradientEnd} stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" opacity={0.5} />
                      <XAxis 
                        dataKey="jour" 
                        stroke="#9CA3AF"
                        tick={{ fill: '#D1D5DB', fontSize: 12 }}
                        axisLine={{ stroke: '#6B7280' }}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        tick={{ fill: '#D1D5DB', fontSize: 12 }}
                        axisLine={{ stroke: '#6B7280' }}
                        label={{ 
                          value: 'Nombre de détections', 
                          angle: -90, 
                          position: 'insideLeft', 
                          fill: '#D1D5DB'
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #4B5563',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }}
                        labelStyle={{ color: '#D1D5DB' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="url(#lineGradient)"
                        strokeWidth={3}
                        dot={{ r: 6, fill: COLORS.primary, stroke: '#1E40AF', strokeWidth: 2 }}
                        activeDot={{ r: 8, fill: COLORS.primary, stroke: '#1E3A8A', strokeWidth: 3 }}
                        name="Total détections"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="reussies" 
                        stroke={COLORS.success}
                        strokeWidth={2}
                        dot={{ r: 4, fill: COLORS.success }}
                        name="Réussies"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <p>Aucune donnée disponible</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Aucune donnée disponible</p>
            </div>
          )}
        </div>

        {/* 2. Évolution */}
        <div className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <BarChart3 className="mr-3 text-purple-400" size={28} />
              Évolution
            </h2>
            <div className="flex items-center space-x-3">
              <select
                value={periodeEvolution}
                onChange={(e) => setPeriodeEvolution(e.target.value)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="7j">7 jours</option>
                <option value="30j">30 jours</option>
                <option value="3m">3 mois</option>
                <option value="1a">1 an</option>
              </select>
            </div>
          </div>

          {loadingEvolution ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-purple-400" size={48} />
              <span className="ml-3 text-gray-400">Chargement de l'évolution...</span>
            </div>
          ) : errorEvolution ? (
            <div className="flex items-center justify-center h-64 bg-red-900/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="text-red-400 mr-3" size={32} />
              <span className="text-red-300">{errorEvolution}</span>
            </div>
          ) : evolution && evolution.length > 0 ? (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={evolution}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" opacity={0.5} />
                  <XAxis 
                    dataKey="periode" 
                    stroke="#9CA3AF"
                    tick={{ fill: '#D1D5DB', fontSize: 12 }}
                    axisLine={{ stroke: '#6B7280' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#D1D5DB', fontSize: 12 }}
                    axisLine={{ stroke: '#6B7280' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #4B5563',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke={COLORS.primary}
                    fill="url(#areaGradient)"
                    strokeWidth={2}
                    name="Total"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="reussies" 
                    stroke={COLORS.success}
                    fill={COLORS.success}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Réussies"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="echecs" 
                    stroke={COLORS.danger}
                    fill={COLORS.danger}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Échecs"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Aucune donnée d'évolution disponible</p>
            </div>
          )}
        </div>

        {/* 3. Géographie */}
        <div className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Globe className="mr-3 text-green-400" size={28} />
              Géographie
            </h2>
          </div>

          {loadingLocalisations ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-green-400" size={48} />
              <span className="ml-3 text-gray-400">Chargement des localisations...</span>
            </div>
          ) : errorLocalisations ? (
            <div className="flex items-center justify-center h-64 bg-red-900/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="text-red-400 mr-3" size={32} />
              <span className="text-red-300">{errorLocalisations}</span>
            </div>
          ) : localisations && localisations.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Distribution géographique des détections IA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {localisations.slice(0, 12).map((loc, index) => (
                    <div 
                      key={index}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-green-400 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{loc.criminel_nom}</p>
                          <p className="text-gray-400 text-sm mt-1">
                            {loc.lieu || loc.province || 'Localisation inconnue'}
                          </p>
                          <p className="text-green-400 text-sm mt-2">
                            Score: {loc.score_confiance}%
                          </p>
                        </div>
                        <MapPin className="text-green-400 flex-shrink-0 ml-2" size={20} />
                      </div>
                    </div>
                  ))}
                </div>
                {localisations.length > 12 && (
                  <p className="text-gray-400 text-sm mt-4 text-center">
                    + {localisations.length - 12} autres localisations
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Aucune localisation disponible</p>
            </div>
          )}
        </div>

        {/* 4. Temps réel */}
        <div className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Zap className="mr-3 text-yellow-400" size={28} />
              Temps réel
            </h2>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-yellow-900/50 border border-yellow-500/30 rounded-full">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-yellow-300">Mise à jour toutes les 15s</span>
            </div>
          </div>

          {loadingTempsReel ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-yellow-400" size={48} />
              <span className="ml-3 text-gray-400">Chargement des données temps réel...</span>
            </div>
          ) : errorTempsReel ? (
            <div className="flex items-center justify-center h-64 bg-red-900/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="text-red-400 mr-3" size={32} />
              <span className="text-red-300">{errorTempsReel}</span>
            </div>
          ) : tempsReel ? (
            <div className="space-y-6">
              {/* Statistiques 24h */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <p className="text-gray-400 text-sm">Total (24h)</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {tempsReel.statistiques?.total_24h || 0}
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <p className="text-gray-400 text-sm">Réussies (24h)</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    {tempsReel.statistiques?.reussies_24h || 0}
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                  <p className="text-gray-400 text-sm">Taux de Réussite</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">
                    {tempsReel.statistiques?.taux_reussite || 0}%
                  </p>
                </div>
              </div>

              {/* Graphique sparkline */}
              {tempsReel.par_heure && tempsReel.par_heure.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Reconnaissances par heure (24 dernières heures)
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={tempsReel.par_heure}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" opacity={0.5} />
                      <XAxis 
                        dataKey="heure" 
                        stroke="#9CA3AF"
                        tick={{ fill: '#D1D5DB', fontSize: 10 }}
                        axisLine={{ stroke: '#6B7280' }}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        tick={{ fill: '#D1D5DB', fontSize: 10 }}
                        axisLine={{ stroke: '#6B7280' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #4B5563',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="reussies" 
                        stroke={COLORS.success}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Réussies"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="echecs" 
                        stroke={COLORS.danger}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Échecs"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Dernières reconnaissances */}
              {tempsReel.dernieres && tempsReel.dernieres.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Dernières reconnaissances
                  </h3>
                  <div className="space-y-2">
                    {tempsReel.dernieres.slice(0, 5).map((rec, index) => (
                      <div 
                        key={index}
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            rec.statut === 'correspondance_trouvee' ? 'bg-green-400' : 'bg-red-400'
                          }`}></div>
                          <div>
                            <p className="text-white text-sm font-medium">{rec.criminel_nom}</p>
                            <p className="text-gray-400 text-xs">
                              {new Date(rec.date_analyse).toLocaleString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-400 text-sm font-semibold">
                            {rec.score_confiance}%
                          </p>
                          <p className="text-gray-500 text-xs capitalize">
                            {rec.statut.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Aucune donnée temps réel disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GraphiquesAvancesIA

